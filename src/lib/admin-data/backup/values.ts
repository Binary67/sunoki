import { isBookingDate } from "../../booking-dates";
import {
  FACILITY_TAGLINE_MAX_LENGTH,
  type AdminRowValue,
} from "../definitions";
import type { BackupTableName } from "./tables";
import type { BackupImportError, ParsedSheetRow } from "./types";

export function readRequiredTextValue(
  row: ParsedSheetRow,
  tableName: BackupTableName,
  columnName: string,
  label: string,
  errors: BackupImportError[],
  trim = true,
): string | null {
  const value = row.values[columnName];
  if (typeof value !== "string") {
    addRowError(errors, row, tableName, columnName, `${label} is required.`);
    return null;
  }
  const text = trim ? value.trim() : value;
  if (!text) {
    addRowError(errors, row, tableName, columnName, `${label} is required.`);
    return null;
  }
  return text;
}

export function readOptionalTextValue(
  row: ParsedSheetRow,
  tableName: BackupTableName,
  columnName: string,
  label: string,
  errors: BackupImportError[],
): string | null {
  const value = row.values[columnName];
  if (value === null || value === "") return null;
  if (typeof value !== "string") {
    addRowError(errors, row, tableName, columnName, `${label} must be text.`);
    return null;
  }
  return value.trim() || null;
}

export function readLimitedOptionalTextValue(
  row: ParsedSheetRow,
  tableName: BackupTableName,
  columnName: string,
  label: string,
  errors: BackupImportError[],
): string | null {
  const value = readOptionalTextValue(row, tableName, columnName, label, errors);
  if (value && value.length > FACILITY_TAGLINE_MAX_LENGTH) {
    addRowError(
      errors,
      row,
      tableName,
      columnName,
      `${label} must be ${FACILITY_TAGLINE_MAX_LENGTH} characters or fewer.`,
    );
  }
  return value;
}

export function readPositiveIntegerValue(
  row: ParsedSheetRow,
  tableName: BackupTableName,
  columnName: string,
  label: string,
  errors: BackupImportError[],
): number | null {
  const value = readIntegerValue(row, tableName, columnName, label, errors);
  if (value === null) return null;
  if (value <= 0) {
    addRowError(
      errors,
      row,
      tableName,
      columnName,
      `${label} must be a positive integer.`,
    );
    return null;
  }
  return value;
}

export function readIntegerValue(
  row: ParsedSheetRow,
  tableName: BackupTableName,
  columnName: string,
  label: string,
  errors: BackupImportError[],
): number | null {
  const value = row.values[columnName];
  if (typeof value !== "number" || !Number.isInteger(value)) {
    addRowError(
      errors,
      row,
      tableName,
      columnName,
      `${label} must be an integer.`,
    );
    return null;
  }
  return value;
}

export function readBookingDateValue(
  row: ParsedSheetRow,
  tableName: BackupTableName,
  columnName: string,
  label: string,
  errors: BackupImportError[],
): string | null {
  const value = readRequiredTextValue(row, tableName, columnName, label, errors);
  if (value && !isBookingDate(value)) {
    addRowError(errors, row, tableName, columnName, `${label} must be YYYY-MM-DD.`);
  }
  return value;
}

export function readDateTimeValue(
  row: ParsedSheetRow,
  tableName: BackupTableName,
  columnName: string,
  label: string,
  errors: BackupImportError[],
): string | null {
  const value = readRequiredTextValue(row, tableName, columnName, label, errors);
  if (value && !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    addRowError(
      errors,
      row,
      tableName,
      columnName,
      `${label} must use YYYY-MM-DD HH:mm:ss.`,
    );
  }
  return value;
}

export function readOptionalDateTimeValue(
  row: ParsedSheetRow,
  tableName: BackupTableName,
  columnName: string,
  label: string,
  errors: BackupImportError[],
): string | null {
  const value = readOptionalTextValue(row, tableName, columnName, label, errors);
  if (value && !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    addRowError(
      errors,
      row,
      tableName,
      columnName,
      `${label} must use YYYY-MM-DD HH:mm:ss.`,
    );
  }
  return value;
}

export function validateRequiredBookingDate(
  value: string | null,
  row: ParsedSheetRow,
  tableName: BackupTableName,
  columnName: string,
  label: string,
  errors: BackupImportError[],
): void {
  if (!value) {
    addRowError(errors, row, tableName, columnName, `${label} is required.`);
    return;
  }
  if (!isBookingDate(value)) {
    addRowError(errors, row, tableName, columnName, `${label} must be YYYY-MM-DD.`);
  }
}

export function addRowError(
  errors: BackupImportError[],
  row: ParsedSheetRow,
  tableName: BackupTableName,
  columnName: string,
  message: string,
): void {
  errors.push({ tableName, rowNumber: row.rowNumber, columnName, message });
}

export function textOrNull(value: AdminRowValue): string | null {
  return typeof value === "string" && value ? value : null;
}
