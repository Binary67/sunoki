import { isBookingDate, isWithinBookingDateRange } from "../../booking-dates";
import type { AdminRow } from "../definitions";
import { indexRowsById } from "./diff";
import type {
  BackupImportError,
  BackupRowsByTable,
  ParsedRowsByTable,
  ParsedSheetRow,
} from "./types";
import {
  addRowError,
  readBookingDateValue,
  readDateTimeValue,
  readIntegerValue,
  readLimitedOptionalTextValue,
  readOptionalTextValue,
  readPositiveIntegerValue,
  readRequiredTextValue,
  textOrNull,
  validateRequiredBookingDate,
} from "./values";

export function validateParsedRows(
  parsedRows: ParsedRowsByTable,
  snapshot: BackupRowsByTable,
): { rows: BackupRowsByTable; errors: BackupImportError[] } {
  const errors: BackupImportError[] = [];
  const rows = {
    users: validateUsers(parsedRows.users, errors),
    facilities: validateFacilities(parsedRows.facilities, snapshot, errors),
    facility_time_slots: [] as AdminRow[],
    facility_bookings: [] as AdminRow[],
  };

  rows.facility_time_slots = validateTimeSlots(
    parsedRows.facility_time_slots,
    rows.facilities,
    errors,
  );
  rows.facility_bookings = validateBookings(
    parsedRows.facility_bookings,
    rows.users,
    rows.facility_time_slots,
    errors,
  );

  return { rows, errors };
}

function validateUsers(
  rows: ParsedSheetRow[],
  errors: BackupImportError[],
): AdminRow[] {
  const normalized: AdminRow[] = [];
  const ids = new Set<number>();
  const activeUsernames = new Set<string>();
  let superAdminCount = 0;

  for (const row of rows) {
    const id = readPositiveIntegerValue(row, "users", "id", "ID", errors);
    const username = readRequiredTextValue(
      row,
      "users",
      "username",
      "Username",
      errors,
    );
    const password = readRequiredTextValue(
      row,
      "users",
      "password",
      "Password",
      errors,
      false,
    );
    const role = readRequiredTextValue(row, "users", "role", "Role", errors);
    const active = readIntegerValue(
      row,
      "users",
      "active",
      "Access",
      errors,
    );
    const checkInDate = readOptionalTextValue(
      row,
      "users",
      "check_in_date",
      "Check-in date",
      errors,
    );
    const checkOutDate = readOptionalTextValue(
      row,
      "users",
      "check_out_date",
      "Check-out date",
      errors,
    );
    const createdAt = readDateTimeValue(
      row,
      "users",
      "created_at",
      "Created",
      errors,
    );

    if (id !== null) {
      if (ids.has(id)) {
        addRowError(errors, row, "users", "id", `Duplicate user ID ${id}.`);
      }
      ids.add(id);
    }

    if (active !== 0 && active !== 1) {
      addRowError(errors, row, "users", "active", "Access must be 0 or 1.");
    }

    if (username !== null && active === 1) {
      const key = username.toLowerCase();
      if (activeUsernames.has(key)) {
        addRowError(
          errors,
          row,
          "users",
          "username",
          `Duplicate active username "${username}".`,
        );
      }
      activeUsernames.add(key);
    }

    if (role !== "superadmin" && role !== "admin" && role !== "guest") {
      addRowError(errors, row, "users", "role", "Choose a valid role.");
    }

    if (role === "superadmin") superAdminCount += 1;

    if (role === "guest") {
      validateRequiredBookingDate(
        checkInDate,
        row,
        "users",
        "check_in_date",
        "Check-in date",
        errors,
      );
      validateRequiredBookingDate(
        checkOutDate,
        row,
        "users",
        "check_out_date",
        "Check-out date",
        errors,
      );
      if (
        checkInDate &&
        checkOutDate &&
        isBookingDate(checkInDate) &&
        isBookingDate(checkOutDate) &&
        checkOutDate < checkInDate
      ) {
        addRowError(
          errors,
          row,
          "users",
          "check_out_date",
          "Check-out date must be on or after check-in date.",
        );
      }
    } else if (checkInDate !== null || checkOutDate !== null) {
      addRowError(
        errors,
        row,
        "users",
        "check_in_date",
        "Admin users must not have stay dates.",
      );
    }

    normalized.push({
      id,
      username,
      password,
      role,
      active,
      check_in_date: role === "guest" ? checkInDate : null,
      check_out_date: role === "guest" ? checkOutDate : null,
      created_at: createdAt,
    });
  }

  if (superAdminCount === 0) {
    errors.push({
      tableName: "users",
      message: "At least one superadmin user is required.",
    });
  }

  return normalized;
}

function validateFacilities(
  rows: ParsedSheetRow[],
  snapshot: BackupRowsByTable,
  errors: BackupImportError[],
): AdminRow[] {
  const normalized: AdminRow[] = [];
  const ids = new Set<number>();
  const currentById = indexRowsById(snapshot.facilities);

  for (const row of rows) {
    const id = readPositiveIntegerValue(row, "facilities", "id", "ID", errors);
    const slug = readRequiredTextValue(
      row,
      "facilities",
      "slug",
      "Slug",
      errors,
    );
    const name = readRequiredTextValue(
      row,
      "facilities",
      "name",
      "Name",
      errors,
    );
    const tagline1 = readLimitedOptionalTextValue(
      row,
      "facilities",
      "tagline_1",
      "Tagline 1",
      errors,
    );
    const tagline2 = readLimitedOptionalTextValue(
      row,
      "facilities",
      "tagline_2",
      "Tagline 2",
      errors,
    );
    const tagline3 = readLimitedOptionalTextValue(
      row,
      "facilities",
      "tagline_3",
      "Tagline 3",
      errors,
    );

    if (id !== null) {
      if (ids.has(id)) {
        addRowError(errors, row, "facilities", "id", `Duplicate facility ID ${id}.`);
      }
      ids.add(id);
      const current = currentById.get(id);
      if (!current) {
        addRowError(
          errors,
          row,
          "facilities",
          "id",
          `Facility ID ${id} does not exist in SQLite.`,
        );
      } else {
        if (current.slug !== slug) {
          addRowError(
            errors,
            row,
            "facilities",
            "slug",
            "Facility slug must match SQLite.",
          );
        }
        if (current.name !== name) {
          addRowError(
            errors,
            row,
            "facilities",
            "name",
            "Facility name must match SQLite.",
          );
        }
      }
    }

    normalized.push({
      id,
      slug,
      name,
      tagline_1: tagline1,
      tagline_2: tagline2,
      tagline_3: tagline3,
    });
  }

  for (const current of snapshot.facilities) {
    const id = Number(current.id);
    if (!ids.has(id)) {
      errors.push({
        tableName: "facilities",
        message: `Facility ID ${id} is missing from the workbook.`,
      });
    }
  }

  return normalized;
}

function validateTimeSlots(
  rows: ParsedSheetRow[],
  facilities: AdminRow[],
  errors: BackupImportError[],
): AdminRow[] {
  const normalized: AdminRow[] = [];
  const ids = new Set<number>();
  const facilityIds = new Set(facilities.map((row) => Number(row.id)));
  const uniqueSlots = new Set<string>();

  for (const row of rows) {
    const id = readPositiveIntegerValue(
      row,
      "facility_time_slots",
      "id",
      "ID",
      errors,
    );
    const facilityId = readPositiveIntegerValue(
      row,
      "facility_time_slots",
      "facility_id",
      "Facility",
      errors,
    );
    const startTime = readRequiredTextValue(
      row,
      "facility_time_slots",
      "start_time",
      "Start time",
      errors,
    );
    const duration = readPositiveIntegerValue(
      row,
      "facility_time_slots",
      "duration_minutes",
      "Duration minutes",
      errors,
    );
    const capacity = readPositiveIntegerValue(
      row,
      "facility_time_slots",
      "capacity_pax",
      "Capacity pax",
      errors,
    );
    const active = readIntegerValue(
      row,
      "facility_time_slots",
      "active",
      "Active",
      errors,
    );

    if (id !== null) {
      if (ids.has(id)) {
        addRowError(
          errors,
          row,
          "facility_time_slots",
          "id",
          `Duplicate time slot ID ${id}.`,
        );
      }
      ids.add(id);
    }

    if (facilityId !== null && !facilityIds.has(facilityId)) {
      addRowError(
        errors,
        row,
        "facility_time_slots",
        "facility_id",
        `Facility ID ${facilityId} is not present in the workbook.`,
      );
    }

    if (startTime !== null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) {
      addRowError(
        errors,
        row,
        "facility_time_slots",
        "start_time",
        "Enter a valid start time.",
      );
    }

    if (active !== null && active !== 0 && active !== 1) {
      addRowError(
        errors,
        row,
        "facility_time_slots",
        "active",
        "Active must be 0 or 1.",
      );
    }

    if (facilityId !== null && startTime !== null) {
      const key = `${facilityId}:${startTime}`;
      if (uniqueSlots.has(key)) {
        addRowError(
          errors,
          row,
          "facility_time_slots",
          "start_time",
          "Facility and start time must be unique.",
        );
      }
      uniqueSlots.add(key);
    }

    normalized.push({
      id,
      facility_id: facilityId,
      start_time: startTime,
      duration_minutes: duration,
      capacity_pax: capacity,
      active,
    });
  }

  return normalized;
}

function validateBookings(
  rows: ParsedSheetRow[],
  users: AdminRow[],
  timeSlots: AdminRow[],
  errors: BackupImportError[],
): AdminRow[] {
  const normalized: AdminRow[] = [];
  const ids = new Set<number>();
  const usersById = indexRowsById(users);
  const timeSlotIds = new Set(timeSlots.map((row) => Number(row.id)));
  const uniqueBookings = new Set<string>();

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

    const user = userId !== null ? usersById.get(userId) : null;
    if (userId !== null && !user) {
      addRowError(
        errors,
        row,
        "facility_bookings",
        "user_id",
        `User ID ${userId} is not present in the workbook.`,
      );
    }

    if (timeSlotId !== null && !timeSlotIds.has(timeSlotId)) {
      addRowError(
        errors,
        row,
        "facility_bookings",
        "facility_time_slot_id",
        `Time slot ID ${timeSlotId} is not present in the workbook.`,
      );
    }

    if (user && user.active !== 1) {
      addRowError(
        errors,
        row,
        "facility_bookings",
        "user_id",
        "Facility bookings must use active users.",
      );
    }

    if (user && bookingDate && user.role === "guest") {
      const checkInDate = textOrNull(user.check_in_date);
      const checkOutDate = textOrNull(user.check_out_date);
      if (
        !checkInDate ||
        !checkOutDate ||
        !isBookingDate(checkInDate) ||
        !isBookingDate(checkOutDate) ||
        checkOutDate < checkInDate ||
        !isWithinBookingDateRange(bookingDate, checkInDate, checkOutDate)
      ) {
        addRowError(
          errors,
          row,
          "facility_bookings",
          "booking_date",
          "Booking date must be within the guest stay dates.",
        );
      }
    }

    if (userId !== null && timeSlotId !== null && bookingDate !== null) {
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

    normalized.push({
      id,
      user_id: userId,
      facility_time_slot_id: timeSlotId,
      booking_date: bookingDate,
      created_at: createdAt,
    });
  }

  return normalized;
}
