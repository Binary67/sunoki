import { isBookingDate } from "../../booking-dates";
import type { AdminRow } from "../definitions";
import type { BackupImportError, ParsedSheetRow } from "./types";
import {
  addRowError,
  readDateTimeValue,
  readIntegerValue,
  readOptionalTextValue,
  readPositiveIntegerValue,
  readRequiredTextValue,
  validateRequiredBookingDate,
} from "./values";

export function validateUsers(
  rows: ParsedSheetRow[],
  errors: BackupImportError[],
): AdminRow[] {
  const normalized: AdminRow[] = [];
  const ids = new Set<number>();
  const usernames = new Set<string>();
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

    if (active !== null && active !== 0 && active !== 1) {
      addRowError(errors, row, "users", "active", "Access must be 0 or 1.");
    }

    if (username !== null) {
      const key = username.toLowerCase();
      if (usernames.has(key)) {
        addRowError(
          errors,
          row,
          "users",
          "username",
          `Duplicate username "${username}".`,
        );
      }
      usernames.add(key);
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
