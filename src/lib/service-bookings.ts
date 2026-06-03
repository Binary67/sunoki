import { insertAuditLog } from "./admin-data/audit";
import type { AdminRow } from "./admin-data/definitions";
import { db, type User } from "./db";
import { isBookingDate, isWithinBookingDateRange } from "./booking-dates";
import { GUEST_BOOKING_CHECK_IN_REQUIRED_MESSAGE } from "./guest-booking-access";
import { parsePackageEntitlementSnapshot } from "./package-entitlement-options";
import {
  PACKAGE_SERVICE_COLUMNS,
  UNLIMITED_PACKAGE_SERVICE_QUANTITY,
  type PackageServiceColumnName,
} from "./package-entitlements";
import type { GuestProfileStatus } from "./guest-profile-types";
import type { UserRole } from "./roles";

export type ServiceBookingKey = PackageServiceColumnName;

export type BookablePackageService = {
  key: ServiceBookingKey;
  name: string;
};

export const BOOKABLE_PACKAGE_SERVICES: BookablePackageService[] =
  PACKAGE_SERVICE_COLUMNS.map((column) => ({
    key: column.name,
    name: column.label,
  }));

export const RELAXING_HAIR_WASH_SERVICE = requireBookablePackageService(
  "relaxing_hair_wash",
);

export function getBookablePackageService(
  serviceKey: string,
): BookablePackageService | null {
  return (
    BOOKABLE_PACKAGE_SERVICES.find((service) => service.key === serviceKey) ??
    null
  );
}

function requireBookablePackageService(
  serviceKey: string,
): BookablePackageService {
  const service = getBookablePackageService(serviceKey);
  if (!service) {
    throw new Error("Package service is not configured.");
  }
  return service;
}

export type GuestServiceBooking = {
  id: number;
  serviceKey: ServiceBookingKey;
  serviceName: string;
  bookingDate: string;
  bookingTime: string;
  isUpcoming: boolean;
};

export type GuestServiceBookingSummary = {
  serviceKey: ServiceBookingKey;
  serviceName: string;
  packageQuantity: number;
  purchasedPerkQuantity: number;
  totalQuantity: number;
  usedQuantity: number;
  remainingQuantity: number | null;
  bookings: GuestServiceBooking[];
};

type ServiceBookingUserRow = {
  role: UserRole;
  active: number;
  checkInDate: string | null;
  checkOutDate: string | null;
};

type GuestProfileServiceRow = {
  id: number;
  status: GuestProfileStatus;
  packageEntitlementSnapshotJson: string | null;
};

type QuantityRow = {
  quantity: number | null;
};

type CountRow = {
  count: number;
};

type ServiceBookingRow = {
  id: number;
  serviceKey: ServiceBookingKey;
  serviceName: string;
  bookingDate: string;
  bookingTime: string;
};

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

export function getGuestServiceBookingSummary(
  user: User,
  now = new Date(),
): GuestServiceBookingSummary | null {
  if (user.role !== "guest") return null;

  const profile = getGuestProfileForServiceBooking(user.id);
  if (!profile || profile.status !== "checked_in") return null;

  const service = RELAXING_HAIR_WASH_SERVICE;
  const entitlement = getServiceEntitlement(
    user.id,
    profile.id,
    profile,
    service,
  );
  const bookings = listActiveServiceBookings(user.id, service.key, now);

  return {
    serviceKey: service.key,
    serviceName: service.name,
    ...entitlement,
    bookings,
  };
}

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
          WHERE user_id = ?
            AND service_key = ?
            AND booking_date = ?
            AND booking_time = ?
            AND status = 'booked'
        `,
      )
      .get(userId, service.key, bookingDate, bookingTime);
    if (existing) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return {
        ok: false,
        error: "You already booked this service date and time.",
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
          WHERE user_id = ?
            AND service_key = ?
            AND booking_date = ?
            AND booking_time = ?
            AND status = 'booked'
            AND id != ?
        `,
      )
      .get(
        userId,
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
        error: "This guest already booked this service date and time.",
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

function selectServiceBookingAuditRow(bookingId: number): AdminRow | null {
  const row = db
    .prepare(
      `
        SELECT
          id,
          user_id,
          guest_profile_id,
          service_key,
          service_name,
          booking_date,
          booking_time,
          status,
          admin_read,
          admin_done,
          admin_done_at,
          cancelled_at,
          created_at
        FROM guest_service_bookings
        WHERE id = ?
      `,
    )
    .get(bookingId) as AdminRow | undefined;

  return row ? { ...row } : null;
}

function getServiceBookingUser(userId: number): ServiceBookingUserRow | null {
  const row = db
    .prepare(
      `
        SELECT
          role,
          active,
          check_in_date AS checkInDate,
          check_out_date AS checkOutDate
        FROM users
        WHERE id = ?
      `,
    )
    .get(userId) as ServiceBookingUserRow | undefined;

  return row ?? null;
}

function getGuestProfileForServiceBooking(
  userId: number,
): GuestProfileServiceRow | null {
  const row = db
    .prepare(
      `
        SELECT
          id,
          status,
          package_entitlement_snapshot_json AS packageEntitlementSnapshotJson
        FROM guest_profiles
        WHERE user_id = ?
      `,
    )
    .get(userId) as GuestProfileServiceRow | undefined;

  return row ?? null;
}

function getServiceEntitlement(
  userId: number,
  guestProfileId: number,
  profile: GuestProfileServiceRow,
  service: BookablePackageService,
  excludeBookingId?: number,
): Omit<GuestServiceBookingSummary, "serviceKey" | "serviceName" | "bookings"> {
  const snapshot = parsePackageEntitlementSnapshot(
    profile.packageEntitlementSnapshotJson,
  );
  const packageQuantity =
    snapshot?.services.find(
      (snapshotService) => snapshotService.name === service.key,
    )?.quantity ?? 0;
  const purchasedPerkQuantity = getPurchasedPerkQuantity(
    guestProfileId,
    service.name,
  );
  const totalQuantity =
    packageQuantity === UNLIMITED_PACKAGE_SERVICE_QUANTITY
      ? UNLIMITED_PACKAGE_SERVICE_QUANTITY
      : packageQuantity + purchasedPerkQuantity;
  const usedQuantity = getActiveServiceBookingCount(
    userId,
    service.key,
    excludeBookingId,
  );
  const remainingQuantity =
    totalQuantity === UNLIMITED_PACKAGE_SERVICE_QUANTITY
      ? null
      : Math.max(0, totalQuantity - usedQuantity);

  return {
    packageQuantity,
    purchasedPerkQuantity,
    totalQuantity,
    usedQuantity,
    remainingQuantity,
  };
}

function getPurchasedPerkQuantity(
  guestProfileId: number,
  serviceName: string,
): number {
  const row = db
    .prepare(
      `
        SELECT SUM(quantity) AS quantity
        FROM guest_profile_addons
        WHERE guest_profile_id = ?
          AND category = 'sunoki'
          AND service_name = ?
      `,
    )
    .get(guestProfileId, serviceName) as
    | QuantityRow
    | undefined;

  return Number(row?.quantity ?? 0);
}

function getActiveServiceBookingCount(
  userId: number,
  serviceKey: ServiceBookingKey,
  excludeBookingId?: number,
): number {
  const excludeClause = excludeBookingId ? "AND id != ?" : "";
  const params = excludeBookingId
    ? [userId, serviceKey, excludeBookingId]
    : [userId, serviceKey];
  const row = db
    .prepare(
      `
        SELECT COUNT(*) AS count
        FROM guest_service_bookings
        WHERE user_id = ?
          AND service_key = ?
          AND status = 'booked'
          ${excludeClause}
      `,
    )
    .get(...params) as CountRow;

  return Number(row.count);
}

function listActiveServiceBookings(
  userId: number,
  serviceKey: ServiceBookingKey,
  now: Date,
): GuestServiceBooking[] {
  const rows = db
    .prepare(
      `
        SELECT
          id,
          service_key AS serviceKey,
          service_name AS serviceName,
          booking_date AS bookingDate,
          booking_time AS bookingTime
        FROM guest_service_bookings
        WHERE user_id = ?
          AND service_key = ?
          AND status = 'booked'
        ORDER BY booking_date ASC, booking_time ASC, id ASC
      `,
    )
    .all(userId, serviceKey) as ServiceBookingRow[];

  return rows.map((row) => ({
    id: Number(row.id),
    serviceKey: row.serviceKey,
    serviceName: row.serviceName,
    bookingDate: row.bookingDate,
    bookingTime: row.bookingTime,
    isUpcoming: !hasServiceBookingStarted(
      row.bookingDate,
      row.bookingTime,
      now,
    ),
  }));
}

function isBookingTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function hasServiceBookingStarted(
  bookingDate: string,
  bookingTime: string,
  now = new Date(),
): boolean {
  const [year, month, day] = bookingDate.split("-").map(Number);
  const [hour, minute] = bookingTime.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute) <= now;
}
