import { isBookingDate, isWithinBookingDateRange } from "../../booking-dates";
import type { AdminRow } from "../definitions";
import type { BackupImportError, ParsedSheetRow } from "./types";
import {
  addRowError,
  readBookingDateValue,
  readIntegerValue,
  readOptionalTextValue,
  readPositiveIntegerValue,
  textOrNull,
} from "./values";

export function readOptionalPositiveIntegerValue(
  row: ParsedSheetRow,
  tableName: Parameters<typeof readPositiveIntegerValue>[1],
  columnName: string,
  label: string,
  errors: BackupImportError[],
): number | null {
  const value = row.values[columnName];
  if (value === null || value === "") return null;
  return readPositiveIntegerValue(row, tableName, columnName, label, errors);
}

export function readOptionalBookingDateValue(
  row: ParsedSheetRow,
  tableName: Parameters<typeof readBookingDateValue>[1],
  columnName: string,
  label: string,
  errors: BackupImportError[],
): string | null {
  const value = readOptionalTextValue(row, tableName, columnName, label, errors);
  if (value && !isBookingDate(value)) {
    addRowError(errors, row, tableName, columnName, `${label} must be YYYY-MM-DD.`);
  }
  return value;
}

export function readBooleanIntegerValue(
  row: ParsedSheetRow,
  tableName: Parameters<typeof readIntegerValue>[1],
  columnName: string,
  label: string,
  errors: BackupImportError[],
): number | null {
  const value = readIntegerValue(row, tableName, columnName, label, errors);
  if (value !== null && value !== 0 && value !== 1) {
    addRowError(errors, row, tableName, columnName, `${label} must be 0 or 1.`);
  }
  return value;
}

export function validateBookingWithinGuestStay(
  row: ParsedSheetRow,
  tableName: "facility_bookings" | "guest_service_bookings",
  columnName: string,
  bookingDate: string | null,
  user: AdminRow | null,
  errors: BackupImportError[],
): void {
  if (!user || !bookingDate || user.role !== "guest") return;

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
      tableName,
      columnName,
      "Booking date must be within the guest stay dates.",
    );
  }
}

export function isTimeValue(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
