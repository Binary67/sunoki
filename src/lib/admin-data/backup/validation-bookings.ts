import type { AdminRow } from "../definitions";
import { indexRowsById } from "./diff";
import type { BackupImportError, ParsedSheetRow } from "./types";
import {
  isTimeValue,
  readBooleanIntegerValue,
  validateBookingWithinGuestStay,
} from "./validation-helpers";
import {
  addRowError,
  readBookingDateValue,
  readDateTimeValue,
  readOptionalDateTimeValue,
  readPositiveIntegerValue,
  readRequiredTextValue,
} from "./values";
import { getBookablePackageService } from "../../service-bookings";

export function validateFacilityBookings(
  rows: ParsedSheetRow[],
  users: AdminRow[],
  timeSlots: AdminRow[],
  errors: BackupImportError[],
): AdminRow[] {
  const normalized: AdminRow[] = [];
  const ids = new Set<number>();
  const usersById = indexRowsById(users);
  const timeSlotsById = indexRowsById(timeSlots);
  const uniqueBookings = new Set<string>();
  const slotDateCounts = new Map<string, number>();

  for (const row of rows) {
    const id = readPositiveIntegerValue(
      row,
      "facility_bookings",
      "id",
      "ID",
      errors,
    );
    const userId = readPositiveIntegerValue(
      row,
      "facility_bookings",
      "user_id",
      "User",
      errors,
    );
    const timeSlotId = readPositiveIntegerValue(
      row,
      "facility_bookings",
      "facility_time_slot_id",
      "Time slot",
      errors,
    );
    const bookingDate = readBookingDateValue(
      row,
      "facility_bookings",
      "booking_date",
      "Booking date",
      errors,
    );
    const status = readRequiredTextValue(
      row,
      "facility_bookings",
      "status",
      "Status",
      errors,
    );
    const adminRead = readBooleanIntegerValue(
      row,
      "facility_bookings",
      "admin_read",
      "Admin read",
      errors,
    );
    const adminDone = readBooleanIntegerValue(
      row,
      "facility_bookings",
      "admin_done",
      "Admin done",
      errors,
    );
    const adminDoneAt = readOptionalDateTimeValue(
      row,
      "facility_bookings",
      "admin_done_at",
      "Admin done at",
      errors,
    );
    const cancelledAt = readOptionalDateTimeValue(
      row,
      "facility_bookings",
      "cancelled_at",
      "Cancelled at",
      errors,
    );
    const createdAt = readDateTimeValue(
      row,
      "facility_bookings",
      "created_at",
      "Created",
      errors,
    );

    if (id !== null) {
      if (ids.has(id)) {
        addRowError(
          errors,
          row,
          "facility_bookings",
          "id",
          `Duplicate booking ID ${id}.`,
        );
      }
      ids.add(id);
    }

    const user = userId !== null ? (usersById.get(userId) ?? null) : null;
    const timeSlot =
      timeSlotId !== null ? (timeSlotsById.get(timeSlotId) ?? null) : null;
    if (userId !== null && !user) {
      addRowError(
        errors,
        row,
        "facility_bookings",
        "user_id",
        `User ID ${userId} is not present in the workbook.`,
      );
    }

    if (timeSlotId !== null && !timeSlot) {
      addRowError(
        errors,
        row,
        "facility_bookings",
        "facility_time_slot_id",
        `Time slot ID ${timeSlotId} is not present in the workbook.`,
      );
    }
    if (status !== "booked" && status !== "cancelled") {
      addRowError(
        errors,
        row,
        "facility_bookings",
        "status",
        "Status must be booked or cancelled.",
      );
    }

    if (status === "booked" && user && user.active !== 1) {
      addRowError(
        errors,
        row,
        "facility_bookings",
        "user_id",
        "Facility bookings must use active users.",
      );
    }
    if (user && user.role !== "guest") {
      addRowError(
        errors,
        row,
        "facility_bookings",
        "user_id",
        "Facility bookings must use guest users.",
      );
    }

    if (status === "booked" && timeSlot && timeSlot.active !== 1) {
      addRowError(
        errors,
        row,
        "facility_bookings",
        "facility_time_slot_id",
        "Facility bookings must use active time slots.",
      );
    }

    if (
      status === "booked" &&
      bookingDate !== null &&
      timeSlot &&
      typeof timeSlot.start_time === "string" &&
      isTimeValue(timeSlot.start_time) &&
      hasSlotStarted(bookingDate, timeSlot.start_time)
    ) {
      addRowError(
        errors,
        row,
        "facility_bookings",
        "booking_date",
        "Facility bookings must use upcoming time slots.",
      );
    }

    if (status === "booked") {
      validateBookingWithinGuestStay(
        row,
        "facility_bookings",
        "booking_date",
        bookingDate,
        user,
        errors,
      );
    }

    if (
      status === "booked" &&
      userId !== null &&
      timeSlotId !== null &&
      bookingDate !== null
    ) {
      const key = `${userId}:${timeSlotId}:${bookingDate}`;
      if (uniqueBookings.has(key)) {
        addRowError(
          errors,
          row,
          "facility_bookings",
          "booking_date",
          "User, time slot, and booking date must be unique.",
        );
      }
      uniqueBookings.add(key);
    }

    if (
      status === "booked" &&
      timeSlotId !== null &&
      timeSlot &&
      bookingDate !== null
    ) {
      const capacity = Number(timeSlot.capacity_pax);
      const key = `${timeSlotId}:${bookingDate}`;
      const count = (slotDateCounts.get(key) ?? 0) + 1;
      slotDateCounts.set(key, count);

      if (Number.isInteger(capacity) && capacity > 0 && count > capacity) {
        addRowError(
          errors,
          row,
          "facility_bookings",
          "facility_time_slot_id",
          "Time slot capacity would be exceeded.",
        );
      }
    }

    normalized.push({
      id,
      user_id: userId,
      facility_time_slot_id: timeSlotId,
      booking_date: bookingDate,
      status,
      admin_read: adminRead,
      admin_done: adminDone,
      admin_done_at: adminDoneAt,
      cancelled_at: cancelledAt,
      created_at: createdAt,
    });
  }

  return normalized;
}

function hasSlotStarted(
  bookingDate: string,
  startTime: string,
  now = new Date(),
): boolean {
  const [year, month, day] = bookingDate.split("-").map(Number);
  const [hour, minute] = startTime.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute) <= now;
}

export function validateGuestServiceBookings(
  rows: ParsedSheetRow[],
  users: AdminRow[],
  guestProfiles: AdminRow[],
  errors: BackupImportError[],
): AdminRow[] {
  const normalized: AdminRow[] = [];
  const ids = new Set<number>();
  const usersById = indexRowsById(users);
  const guestProfilesById = indexRowsById(guestProfiles);
  const uniqueActiveBookings = new Set<string>();

  for (const row of rows) {
    const id = readPositiveIntegerValue(
      row,
      "guest_service_bookings",
      "id",
      "ID",
      errors,
    );
    const userId = readPositiveIntegerValue(
      row,
      "guest_service_bookings",
      "user_id",
      "User",
      errors,
    );
    const guestProfileId = readPositiveIntegerValue(
      row,
      "guest_service_bookings",
      "guest_profile_id",
      "Guest profile",
      errors,
    );
    const serviceKey = readRequiredTextValue(
      row,
      "guest_service_bookings",
      "service_key",
      "Service key",
      errors,
    );
    const serviceName = readRequiredTextValue(
      row,
      "guest_service_bookings",
      "service_name",
      "Service name",
      errors,
    );
    const bookingDate = readBookingDateValue(
      row,
      "guest_service_bookings",
      "booking_date",
      "Booking date",
      errors,
    );
    const bookingTime = readRequiredTextValue(
      row,
      "guest_service_bookings",
      "booking_time",
      "Booking time",
      errors,
    );
    const status = readRequiredTextValue(
      row,
      "guest_service_bookings",
      "status",
      "Status",
      errors,
    );
    const adminRead = readBooleanIntegerValue(
      row,
      "guest_service_bookings",
      "admin_read",
      "Admin read",
      errors,
    );
    const adminDone = readBooleanIntegerValue(
      row,
      "guest_service_bookings",
      "admin_done",
      "Admin done",
      errors,
    );
    const adminDoneAt = readOptionalDateTimeValue(
      row,
      "guest_service_bookings",
      "admin_done_at",
      "Admin done at",
      errors,
    );
    const cancelledAt = readOptionalDateTimeValue(
      row,
      "guest_service_bookings",
      "cancelled_at",
      "Cancelled at",
      errors,
    );
    const createdAt = readDateTimeValue(
      row,
      "guest_service_bookings",
      "created_at",
      "Created",
      errors,
    );

    if (id !== null) {
      if (ids.has(id)) {
        addRowError(
          errors,
          row,
          "guest_service_bookings",
          "id",
          `Duplicate service booking ID ${id}.`,
        );
      }
      ids.add(id);
    }

    const user = userId !== null ? (usersById.get(userId) ?? null) : null;
    const guestProfile =
      guestProfileId !== null ? guestProfilesById.get(guestProfileId) : null;
    if (userId !== null && !user) {
      addRowError(
        errors,
        row,
        "guest_service_bookings",
        "user_id",
        `User ID ${userId} is not present in the workbook.`,
      );
    }
    if (guestProfileId !== null && !guestProfile) {
      addRowError(
        errors,
        row,
        "guest_service_bookings",
        "guest_profile_id",
        `Guest profile ID ${guestProfileId} is not present in the workbook.`,
      );
    }
    if (
      userId !== null &&
      guestProfile &&
      Number(guestProfile.user_id) !== userId
    ) {
      addRowError(
        errors,
        row,
        "guest_service_bookings",
        "guest_profile_id",
        "Service booking must use the linked guest profile for its user.",
      );
    }
    if (status === "booked" && user && user.active !== 1) {
      addRowError(
        errors,
        row,
        "guest_service_bookings",
        "user_id",
        "Service bookings must use active users.",
      );
    }
    if (user && user.role !== "guest") {
      addRowError(
        errors,
        row,
        "guest_service_bookings",
        "user_id",
        "Service bookings must use guest users.",
      );
    }

    const service =
      serviceKey !== null ? getBookablePackageService(serviceKey) : null;
    if (serviceKey !== null && !service) {
      addRowError(
        errors,
        row,
        "guest_service_bookings",
        "service_key",
        "Choose a valid service key.",
      );
    }
    if (service && serviceName !== service.name) {
      addRowError(
        errors,
        row,
        "guest_service_bookings",
        "service_name",
        "Service name must match the service key.",
      );
    }
    if (bookingTime !== null && !isTimeValue(bookingTime)) {
      addRowError(
        errors,
        row,
        "guest_service_bookings",
        "booking_time",
        "Enter a valid booking time.",
      );
    }
    if (status !== "booked" && status !== "cancelled") {
      addRowError(
        errors,
        row,
        "guest_service_bookings",
        "status",
        "Status must be booked or cancelled.",
      );
    }

    if (status === "booked") {
      validateBookingWithinGuestStay(
        row,
        "guest_service_bookings",
        "booking_date",
        bookingDate,
        user,
        errors,
      );
    }

    if (
      status === "booked" &&
      userId !== null &&
      serviceKey !== null &&
      bookingDate !== null &&
      bookingTime !== null
    ) {
      const key = `${userId}:${serviceKey}:${bookingDate}:${bookingTime}`;
      if (uniqueActiveBookings.has(key)) {
        addRowError(
          errors,
          row,
          "guest_service_bookings",
          "booking_time",
          "Active service bookings must be unique by user, service, date, and time.",
        );
      }
      uniqueActiveBookings.add(key);
    }

    normalized.push({
      id,
      user_id: userId,
      guest_profile_id: guestProfileId,
      service_key: serviceKey,
      service_name: serviceName,
      booking_date: bookingDate,
      booking_time: bookingTime,
      status,
      admin_read: adminRead,
      admin_done: adminDone,
      admin_done_at: adminDoneAt,
      cancelled_at: cancelledAt,
      created_at: createdAt,
    });
  }

  return normalized;
}
