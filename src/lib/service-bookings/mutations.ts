import { insertAuditLog } from "../admin-data/audit";
import { isBookingDate, isWithinBookingDateRange } from "../booking-dates";
import { db, type User } from "../db";
import { GUEST_BOOKING_CHECK_IN_REQUIRED_MESSAGE } from "../guest-booking-access";
import { getBookablePackageService } from "./catalog";
import { getServiceEntitlement } from "./entitlements";
import {
  getGuestProfileForServiceBooking,
  getServiceBookingUser,
  selectServiceBookingAuditRow,
} from "./repository";
import { hasServiceBookingStarted, isBookingTime } from "./time";

export type CreateServiceBookingInput = {
  auditActor?: User;
  userId: number;
  serviceKey: string;
  bookingDate: string;
  bookingTime: string;
};

export type CreateServiceBookingResult =
  | { ok: true; bookingId: number; serviceName: string }
  | { ok: false; error: string };

export type UpdateServiceBookingInput = {
  auditActor: User;
  bookingId: number;
  userId: number;
  serviceKey: string;
  bookingDate: string;
  bookingTime: string;
};

export type UpdateServiceBookingResult =
  | { ok: true; bookingId: number; serviceName: string }
  | { ok: false; error: string };

export function createServiceBooking({
  auditActor,
  userId,
  serviceKey,
  bookingDate,
  bookingTime,
}: CreateServiceBookingInput): CreateServiceBookingResult {
  const service = getBookablePackageService(serviceKey);
  if (!service) {
    return { ok: false, error: "Choose a valid service." };
  }
  if (!isBookingDate(bookingDate) || !isBookingTime(bookingTime)) {
    return { ok: false, error: "Choose a valid service date and time." };
  }
  if (hasServiceBookingStarted(bookingDate, bookingTime)) {
    return { ok: false, error: "Choose an upcoming service date and time." };
  }

  let inTransaction = false;

  try {
    db.exec("BEGIN IMMEDIATE");
    inTransaction = true;

    const bookingUser = getServiceBookingUser(userId);
    if (!bookingUser) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return { ok: false, error: "Sign in before booking a service." };
    }
    if (bookingUser.active !== 1) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return { ok: false, error: "This account is inactive." };
    }
    if (bookingUser.role !== "guest") {
      db.exec("ROLLBACK");
      inTransaction = false;
      return { ok: false, error: "Only guests can book services." };
    }

    const profile = getGuestProfileForServiceBooking(userId);
    if (!profile) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return { ok: false, error: "Your guest profile is not set up." };
    }
    if (profile.status !== "checked_in") {
      db.exec("ROLLBACK");
      inTransaction = false;
      return { ok: false, error: GUEST_BOOKING_CHECK_IN_REQUIRED_MESSAGE };
    }

    if (
      !bookingUser.checkInDate ||
      !bookingUser.checkOutDate ||
      !isBookingDate(bookingUser.checkInDate) ||
      !isBookingDate(bookingUser.checkOutDate) ||
      bookingUser.checkOutDate < bookingUser.checkInDate
    ) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return {
        ok: false,
        error: "Your stay dates are not set up for service booking.",
      };
    }
    if (
      !isWithinBookingDateRange(
        bookingDate,
        bookingUser.checkInDate,
        bookingUser.checkOutDate,
      )
    ) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return { ok: false, error: "Choose a date within your stay dates." };
    }

    const entitlement = getServiceEntitlement(
      userId,
      profile.id,
      profile,
      service,
    );
    if (
      entitlement.remainingQuantity !== null &&
      entitlement.remainingQuantity <= 0
    ) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return {
        ok: false,
        error: `You have used all ${service.name} sessions. Please inform admin to add more in your guest profile.`,
      };
    }

    const existing = db
      .prepare(
        `
          SELECT id
          FROM guest_service_bookings
          WHERE service_key = ?
            AND booking_date = ?
            AND booking_time = ?
            AND status = 'booked'
        `,
      )
      .get(service.key, bookingDate, bookingTime);
    if (existing) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return {
        ok: false,
        error: "This service date and time is already booked.",
      };
    }

    const result = db.prepare(
      `
        INSERT INTO guest_service_bookings (
          user_id,
          guest_profile_id,
          service_key,
          service_name,
          booking_date,
          booking_time
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
    ).run(
      userId,
      profile.id,
      service.key,
      service.name,
      bookingDate,
      bookingTime,
    ) as { lastInsertRowid: number | bigint };

    if (auditActor) {
      const after = selectServiceBookingAuditRow(Number(result.lastInsertRowid));
      if (!after) throw new Error("Inserted service booking could not be loaded.");
      insertAuditLog(
        auditActor,
        "insert",
        "guest_service_bookings",
        Number(result.lastInsertRowid),
        null,
        after,
      );
    }

    db.exec("COMMIT");
    inTransaction = false;
    return {
      ok: true,
      bookingId: Number(result.lastInsertRowid),
      serviceName: service.name,
    };
  } catch {
    if (inTransaction) db.exec("ROLLBACK");
    return { ok: false, error: "Unable to book this service." };
  }
}

export function updateServiceBooking({
  auditActor,
  bookingId,
  userId,
  serviceKey,
  bookingDate,
  bookingTime,
}: UpdateServiceBookingInput): UpdateServiceBookingResult {
  const service = getBookablePackageService(serviceKey);
  if (!service) {
    return { ok: false, error: "Choose a valid service." };
  }
  if (
    !Number.isInteger(bookingId) ||
    !Number.isInteger(userId) ||
    !isBookingDate(bookingDate) ||
    !isBookingTime(bookingTime)
  ) {
    return { ok: false, error: "Choose a valid service date and time." };
  }
  if (hasServiceBookingStarted(bookingDate, bookingTime)) {
    return { ok: false, error: "Choose an upcoming service date and time." };
  }

  let inTransaction = false;

  try {
    db.exec("BEGIN IMMEDIATE");
    inTransaction = true;

    const before = selectServiceBookingAuditRow(bookingId);
    if (!before) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return { ok: false, error: "Booking not found." };
    }
    if (before.status !== "booked") {
      db.exec("ROLLBACK");
      inTransaction = false;
      return { ok: false, error: "Only booked service bookings can be edited." };
    }

    const bookingUser = getServiceBookingUser(userId);
    if (!bookingUser) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return { ok: false, error: "Choose a valid guest." };
    }
    if (bookingUser.active !== 1) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return { ok: false, error: "Guest is inactive." };
    }
    if (bookingUser.role !== "guest") {
      db.exec("ROLLBACK");
      inTransaction = false;
      return { ok: false, error: "Service bookings require a guest user." };
    }

    const profile = getGuestProfileForServiceBooking(userId);
    if (!profile) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return {
        ok: false,
        error: "The selected guest does not have a linked guest profile.",
      };
    }
    if (profile.status !== "checked_in") {
      db.exec("ROLLBACK");
      inTransaction = false;
      return { ok: false, error: GUEST_BOOKING_CHECK_IN_REQUIRED_MESSAGE };
    }

    if (
      !bookingUser.checkInDate ||
      !bookingUser.checkOutDate ||
      !isBookingDate(bookingUser.checkInDate) ||
      !isBookingDate(bookingUser.checkOutDate) ||
      bookingUser.checkOutDate < bookingUser.checkInDate
    ) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return {
        ok: false,
        error: "The selected guest does not have valid stay dates.",
      };
    }
    if (
      !isWithinBookingDateRange(
        bookingDate,
        bookingUser.checkInDate,
        bookingUser.checkOutDate,
      )
    ) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return { ok: false, error: "Booking date must be within the guest stay dates." };
    }

    const entitlement = getServiceEntitlement(
      userId,
      profile.id,
      profile,
      service,
      bookingId,
    );
    if (
      entitlement.remainingQuantity !== null &&
      entitlement.remainingQuantity <= 0
    ) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return {
        ok: false,
        error: `The selected guest has used all ${service.name} sessions.`,
      };
    }

    const existing = db
      .prepare(
        `
          SELECT id
          FROM guest_service_bookings
          WHERE service_key = ?
            AND booking_date = ?
            AND booking_time = ?
            AND status = 'booked'
            AND id != ?
        `,
      )
      .get(
        service.key,
        bookingDate,
        bookingTime,
        bookingId,
      ) as { id: number } | undefined;
    if (existing) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return {
        ok: false,
        error: "This service date and time is already booked.",
      };
    }

    db.prepare(
      `
        UPDATE guest_service_bookings
        SET user_id = ?,
            guest_profile_id = ?,
            service_key = ?,
            service_name = ?,
            booking_date = ?,
            booking_time = ?
        WHERE id = ?
      `,
    ).run(
      userId,
      profile.id,
      service.key,
      service.name,
      bookingDate,
      bookingTime,
      bookingId,
    );

    const after = selectServiceBookingAuditRow(bookingId);
    if (!after) throw new Error("Updated service booking could not be loaded.");
    insertAuditLog(
      auditActor,
      "update",
      "guest_service_bookings",
      bookingId,
      before,
      after,
    );

    db.exec("COMMIT");
    inTransaction = false;
    return { ok: true, bookingId, serviceName: service.name };
  } catch {
    if (inTransaction) db.exec("ROLLBACK");
    return { ok: false, error: "Unable to update this service booking." };
  }
}
