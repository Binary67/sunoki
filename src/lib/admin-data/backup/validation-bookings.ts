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
import { getBookablePackageService } from "../../service-bookings/catalog";

export function validateFacilityBookings(
  rows: ParsedSheetRow[],
  users: AdminRow[],
  guestProfiles: AdminRow[],
  facilities: AdminRow[],
  errors: BackupImportError[],
): AdminRow[] {
  const normalized: AdminRow[] = [];
  const ids = new Set<number>();
  const usersById = indexRowsById(users);
  const guestProfilesById = indexRowsById(guestProfiles);
  const facilitiesById = indexRowsById(facilities);
  const uniqueActiveBookings = new Set<string>();

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
    const guestProfileId = readPositiveIntegerValue(
      row,
      "facility_bookings",
      "guest_profile_id",
      "Guest profile",
      errors,
    );
    const facilityId = readPositiveIntegerValue(
      row,
      "facility_bookings",
      "facility_id",
      "Facility",
      errors,
    );
    const bookingDate = readBookingDateValue(
      row,
      "facility_bookings",
      "booking_date",
      "Booking date",
      errors,
    );
    const bookingTime = readRequiredTextValue(
      row,
      "facility_bookings",
      "booking_time",
      "Booking time",
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
    const guestProfile =
      guestProfileId !== null ? guestProfilesById.get(guestProfileId) : null;
    const facility =
      facilityId !== null ? facilitiesById.get(facilityId) : null;
    if (userId !== null && !user) {
      addRowError(
        errors,
        row,
        "facility_bookings",
        "user_id",
        `User ID ${userId} is not present in the workbook.`,
      );
    }

    if (guestProfileId !== null && !guestProfile) {
      addRowError(
        errors,
        row,
        "facility_bookings",
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
        "facility_bookings",
        "guest_profile_id",
        "Facility booking must use the linked guest profile for its user.",
      );
    }
    if (facilityId !== null && !facility) {
      addRowError(
        errors,
        row,
        "facility_bookings",
        "facility_id",
        `Facility ID ${facilityId} is not present in the workbook.`,
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
    if (
      status === "booked" &&
      guestProfile &&
      guestProfile.status !== "checked_in"
    ) {
      addRowError(
        errors,
        row,
        "facility_bookings",
        "guest_profile_id",
        "Facility bookings require checked-in guest profiles.",
      );
    }

    if (bookingTime !== null && !isTimeValue(bookingTime)) {
      addRowError(
        errors,
        row,
        "facility_bookings",
        "booking_time",
        "Enter a valid booking time.",
      );
    }

    if (
      status === "booked" &&
      bookingDate !== null &&
      bookingTime !== null &&
      isTimeValue(bookingTime) &&
      hasSlotStarted(bookingDate, bookingTime)
    ) {
      addRowError(
        errors,
        row,
        "facility_bookings",
        "booking_time",
        "Facility bookings must use an upcoming date and time.",
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
      facilityId !== null &&
      bookingDate !== null &&
      bookingTime !== null
    ) {
      const key = `${facilityId}:${bookingDate}:${bookingTime}`;
      if (uniqueActiveBookings.has(key)) {
        addRowError(
          errors,
          row,
          "facility_bookings",
          "booking_time",
          "Active facility bookings must be unique by facility, date, and time.",
        );
      }
      uniqueActiveBookings.add(key);
    }

    normalized.push({
      id,
      user_id: userId,
      guest_profile_id: guestProfileId,
      facility_id: facilityId,
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
      serviceKey !== null &&
      bookingDate !== null &&
      bookingTime !== null
    ) {
      const key = `${serviceKey}:${bookingDate}:${bookingTime}`;
      if (uniqueActiveBookings.has(key)) {
        addRowError(
          errors,
          row,
          "guest_service_bookings",
          "booking_time",
          "Active service bookings must be unique by service, date, and time.",
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
