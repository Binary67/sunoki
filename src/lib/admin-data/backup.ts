import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { isBookingDate, isWithinBookingDateRange } from "../booking-dates";
import { db, type User } from "../db";
import {
  EDITABLE_TABLE_NAMES,
  FACILITY_TAGLINE_MAX_LENGTH,
  getAdminTableDefinition,
  getAdminTableLabel,
  type AdminRow,
  type AdminRowValue,
  type EditableTableName,
} from "./definitions";
import { insertAuditLog } from "./audit";

const BACKUP_FORMAT_VERSION = "sunoki-admin-data-v1";
const BACKUP_DRAFT_TTL_MINUTES = 30;
const MAX_BACKUP_UPLOAD_BYTES = 5 * 1024 * 1024;
const METADATA_SHEET_NAME = "_sunoki_schema";
const SOURCE_OF_TRUTH_TABLES = [
  "users",
  "facility_time_slots",
  "facility_bookings",
] as const satisfies readonly EditableTableName[];

type ParsedSheetRow = {
  rowNumber: number;
  values: AdminRow;
};

type ParsedRowsByTable = Record<EditableTableName, ParsedSheetRow[]>;

type BackupRowsByTable = Record<EditableTableName, AdminRow[]>;

export type BackupImportError = {
  message: string;
  tableName?: EditableTableName;
  rowNumber?: number;
  columnName?: string;
};

export type BackupCellDiff = {
  columnName: string;
  before: AdminRowValue;
  after: AdminRowValue;
};

export type BackupRowDiff = {
  kind: "insert" | "update" | "delete";
  rowId: number;
  cells: BackupCellDiff[];
};

export type BackupTableDiff = {
  tableName: EditableTableName;
  label: string;
  inserted: number;
  updated: number;
  deleted: number;
  unchanged: number;
  changes: BackupRowDiff[];
};

export type BackupImportDraftPayload = {
  version: 1;
  createdAt: string;
  baseFingerprint: string;
  rows: BackupRowsByTable | null;
  diff: BackupTableDiff[];
  errors: BackupImportError[];
};

export type BackupImportDraft = {
  token: string;
  actorUserId: number;
  actorUsername: string;
  createdAt: string;
  expiresAt: string;
  payload: BackupImportDraftPayload;
};

export type CreateBackupImportDraftResult =
  | {
      ok: true;
      token: string;
      errorCount: number;
      changeCount: number;
      message: string;
    }
  | { ok: false; message: string };

export type ApplyBackupImportDraftResult =
  | {
      ok: true;
      applied: true;
      invalidatedSessions: boolean;
      backupPath: string;
      changeCount: number;
    }
  | { ok: true; applied: false; message: string }
  | { ok: false; message: string; needsReview?: boolean };

type DraftRow = {
  token: string;
  actorUserId: number;
  actorUsername: string;
  payloadJson: string;
  createdAt: string;
  expiresAt: string;
};

export async function generateBackupWorkbookBuffer(
  snapshot = getBackupSnapshot(),
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sunoki";
  workbook.created = new Date();

  for (const tableName of EDITABLE_TABLE_NAMES) {
    const table = getAdminTableDefinition(tableName);
    const columns = table.columns.map((column) => column.name);
    const worksheet = workbook.addWorksheet(tableName);
    worksheet.columns = columns.map((columnName) => ({
      header: columnName,
      key: columnName,
      width: getColumnWidth(columnName),
    }));
    worksheet.views = [{ state: "frozen", ySplit: 1 }];
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length },
    };

    const header = worksheet.getRow(1);
    header.font = { bold: true };
    header.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEFF3F6" },
    };

    for (const row of snapshot[tableName]) {
      worksheet.addRow(row);
    }

    for (const column of table.columns) {
      if (column.input !== "number" && column.name !== "id") {
        worksheet.getColumn(column.name).numFmt = "@";
      }
    }
  }

  const metadata = workbook.addWorksheet(METADATA_SHEET_NAME);
  metadata.state = "veryHidden";
  metadata.addRows([
    ["format_version", BACKUP_FORMAT_VERSION],
    ["generated_at", formatDateTime(new Date())],
    ["sheets", EDITABLE_TABLE_NAMES.join(",")],
  ]);

  const data = (await workbook.xlsx.writeBuffer()) as unknown;
  if (data instanceof ArrayBuffer) return data;

  const view = data as Uint8Array;
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  return copy.buffer;
}

export function getBackupWorkbookFileName(prefix = "sunoki-admin-backup"): string {
  return `${prefix}-${formatFileTimestamp(new Date())}.xlsx`;
}

export async function createBackupImportDraft(
  actor: User,
  file: File | null,
): Promise<CreateBackupImportDraftResult> {
  if (!file || file.size === 0) {
    return { ok: false, message: "Upload a backup workbook." };
  }

  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return { ok: false, message: "Upload a .xlsx workbook." };
  }

  if (file.size > MAX_BACKUP_UPLOAD_BYTES) {
    return { ok: false, message: "Workbook is too large." };
  }

  let workbook: ExcelJS.Workbook;
  try {
    const buffer = await file.arrayBuffer();
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as Parameters<ExcelJS.Xlsx["load"]>[0]);
  } catch {
    return { ok: false, message: "Upload a valid .xlsx workbook." };
  }

  const snapshot = getBackupSnapshot();
  const payload = buildDraftPayloadFromWorkbook(workbook, snapshot);
  const token = saveBackupDraft(actor, payload);
  const errorCount = payload.errors.length;
  const changeCount = countDraftChanges(payload.diff);

  return {
    ok: true,
    token,
    errorCount,
    changeCount,
    message:
      errorCount > 0
        ? "Workbook uploaded with validation errors."
        : "Workbook validated. Review the changes before applying.",
  };
}

export function getBackupImportDraft(
  token: string,
  actor: User,
): BackupImportDraft | null {
  pruneExpiredBackupDrafts();
  if (!isValidDraftToken(token)) return null;

  const row = db
    .prepare(
      `
        SELECT
          token,
          actor_user_id AS actorUserId,
          actor_username AS actorUsername,
          payload_json AS payloadJson,
          created_at AS createdAt,
          expires_at AS expiresAt
        FROM admin_import_drafts
        WHERE token = ?
          AND actor_user_id = ?
          AND expires_at > ?
      `,
    )
    .get(token, actor.id, formatDateTime(new Date())) as DraftRow | undefined;

  if (!row) return null;

  try {
    return {
      token: row.token,
      actorUserId: Number(row.actorUserId),
      actorUsername: row.actorUsername,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      payload: JSON.parse(row.payloadJson) as BackupImportDraftPayload,
    };
  } catch {
    return null;
  }
}

export async function applyBackupImportDraft(
  actor: User,
  token: string,
): Promise<ApplyBackupImportDraftResult> {
  const draft = getBackupImportDraft(token, actor);
  if (!draft) {
    return { ok: false, message: "Import draft expired or was not found." };
  }

  const targetRows = draft.payload.rows;
  if (!targetRows) {
    return { ok: false, message: "Upload and validate a workbook first." };
  }

  if (draft.payload.errors.length > 0) {
    return {
      ok: false,
      message: "Fix validation errors before applying this workbook.",
    };
  }

  const currentSnapshot = getBackupSnapshot();
  const currentPayload = buildDraftPayloadFromRows(
    targetRows,
    currentSnapshot,
  );

  if (
    currentPayload.errors.length > 0 ||
    currentPayload.baseFingerprint !== draft.payload.baseFingerprint
  ) {
    updateBackupDraft(actor, token, currentPayload);
    return {
      ok: false,
      needsReview: true,
      message: "The database changed after validation. Review the updated preview.",
    };
  }

  const changeCount = countDraftChanges(currentPayload.diff);
  if (changeCount === 0) {
    return { ok: true, applied: false, message: "No changes to apply." };
  }

  let backupPath: string;
  try {
    backupPath = await writePreRestoreBackup(currentSnapshot);
  } catch {
    return {
      ok: false,
      message: "Unable to create the automatic pre-restore backup.",
    };
  }
  const sourceTablesChanged = SOURCE_OF_TRUTH_TABLES.some(
    (tableName) =>
      currentPayload.diff.find((table) => table.tableName === tableName)
        ?.changes.length,
  );
  const usersChanged = Boolean(
    currentPayload.diff.find((table) => table.tableName === "users")?.changes
      .length,
  );

  try {
    runTransaction(() => {
      const recheckSnapshot = getBackupSnapshot();
      const recheckPayload = buildDraftPayloadFromRows(
        targetRows,
        recheckSnapshot,
      );

      if (
        recheckPayload.errors.length > 0 ||
        recheckPayload.baseFingerprint !== draft.payload.baseFingerprint
      ) {
        throw new DatabaseChangedDuringApplyError();
      }

      applyBackupRows(
        actor,
        targetRows,
        recheckSnapshot,
        recheckPayload.diff,
      );
    });
  } catch (error) {
    if (error instanceof DatabaseChangedDuringApplyError) {
      const refreshedPayload = buildDraftPayloadFromRows(
        targetRows,
        getBackupSnapshot(),
      );
      updateBackupDraft(actor, token, refreshedPayload);
      return {
        ok: false,
        needsReview: true,
        message:
          "The database changed while applying this workbook. Review the updated preview.",
      };
    }
    return { ok: false, message: "Unable to apply backup workbook." };
  }

  deleteBackupDraft(token);

  return {
    ok: true,
    applied: true,
    invalidatedSessions: sourceTablesChanged && usersChanged,
    backupPath,
    changeCount,
  };
}

export function getBackupSnapshot(): BackupRowsByTable {
  return EDITABLE_TABLE_NAMES.reduce((snapshot, tableName) => {
    const table = getAdminTableDefinition(tableName);
    const columns = table.columns.map((column) => column.name);
    snapshot[tableName] = db
      .prepare(
        `SELECT ${columns.join(", ")} FROM ${table.name} ORDER BY id ASC`,
      )
      .all() as AdminRow[];
    return snapshot;
  }, {} as BackupRowsByTable);
}

function buildDraftPayloadFromWorkbook(
  workbook: ExcelJS.Workbook,
  snapshot: BackupRowsByTable,
): BackupImportDraftPayload {
  const parsed = parseWorkbookRows(workbook);
  if (parsed.errors.length > 0) {
    return {
      version: 1,
      createdAt: formatDateTime(new Date()),
      baseFingerprint: fingerprintSnapshot(snapshot),
      rows: null,
      diff: buildEmptyDiff(snapshot),
      errors: parsed.errors,
    };
  }

  const validation = validateParsedRows(parsed.rows, snapshot);
  const diff =
    validation.errors.length === 0
      ? buildBackupDiff(validation.rows, snapshot)
      : buildEmptyDiff(snapshot);

  return {
    version: 1,
    createdAt: formatDateTime(new Date()),
    baseFingerprint: fingerprintSnapshot(snapshot),
    rows: validation.errors.length === 0 ? validation.rows : null,
    diff,
    errors: validation.errors,
  };
}

function buildDraftPayloadFromRows(
  rows: BackupRowsByTable,
  snapshot: BackupRowsByTable,
): BackupImportDraftPayload {
  const parsed = EDITABLE_TABLE_NAMES.reduce((result, tableName) => {
    result[tableName] = rows[tableName].map((values, index) => ({
      rowNumber: index + 2,
      values,
    }));
    return result;
  }, {} as ParsedRowsByTable);
  const validation = validateParsedRows(parsed, snapshot);
  const diff =
    validation.errors.length === 0
      ? buildBackupDiff(validation.rows, snapshot)
      : buildEmptyDiff(snapshot);

  return {
    version: 1,
    createdAt: formatDateTime(new Date()),
    baseFingerprint: fingerprintSnapshot(snapshot),
    rows: validation.errors.length === 0 ? validation.rows : null,
    diff,
    errors: validation.errors,
  };
}

function parseWorkbookRows(workbook: ExcelJS.Workbook): {
  rows: ParsedRowsByTable;
  errors: BackupImportError[];
} {
  const errors: BackupImportError[] = [];
  const rows = EDITABLE_TABLE_NAMES.reduce((result, tableName) => {
    result[tableName] = [];
    return result;
  }, {} as ParsedRowsByTable);
  const allowedSheetNames = new Set<string>([
    ...EDITABLE_TABLE_NAMES,
    METADATA_SHEET_NAME,
  ]);

  for (const worksheet of workbook.worksheets) {
    if (!allowedSheetNames.has(worksheet.name)) {
      errors.push({ message: `Unexpected sheet "${worksheet.name}".` });
    }
  }

  for (const tableName of EDITABLE_TABLE_NAMES) {
    const worksheet = workbook.getWorksheet(tableName);
    if (!worksheet) {
      errors.push({
        tableName,
        message: `Missing required sheet "${tableName}".`,
      });
      continue;
    }

    const table = getAdminTableDefinition(tableName);
    const expectedColumns = table.columns.map((column) => column.name);
    if (!hasExactHeader(worksheet, tableName, expectedColumns, errors)) {
      continue;
    }

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);
      const values: AdminRow = {};
      let hasValue = false;

      expectedColumns.forEach((columnName, columnIndex) => {
        const value = readCellValue(
          row.getCell(columnIndex + 1),
          tableName,
          rowNumber,
          columnName,
          errors,
        );
        values[columnName] = value;
        if (!isEmptyCellValue(value)) hasValue = true;
      });

      row.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
        if (columnNumber <= expectedColumns.length) return;
        const value = readCellValue(
          cell,
          tableName,
          rowNumber,
          `column ${columnNumber}`,
          errors,
        );
        if (!isEmptyCellValue(value)) {
          errors.push({
            tableName,
            rowNumber,
            message: `Unexpected value in column ${columnNumber}.`,
          });
          hasValue = true;
        }
      });

      if (hasValue) rows[tableName].push({ rowNumber, values });
    }
  }

  return { rows, errors };
}

function hasExactHeader(
  worksheet: ExcelJS.Worksheet,
  tableName: EditableTableName,
  expectedColumns: string[],
  errors: BackupImportError[],
): boolean {
  const header = worksheet.getRow(1);
  let ok = true;

  expectedColumns.forEach((columnName, columnIndex) => {
    const value = readCellValue(
      header.getCell(columnIndex + 1),
      tableName,
      1,
      columnName,
      errors,
    );
    if (value !== columnName) {
      errors.push({
        tableName,
        rowNumber: 1,
        columnName,
        message: `Expected header "${columnName}" in column ${columnIndex + 1}.`,
      });
      ok = false;
    }
  });

  header.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
    if (columnNumber <= expectedColumns.length) return;
    const value = readCellValue(
      cell,
      tableName,
      1,
      `column ${columnNumber}`,
      errors,
    );
    if (!isEmptyCellValue(value)) {
      errors.push({
        tableName,
        rowNumber: 1,
        message: `Unexpected header in column ${columnNumber}.`,
      });
      ok = false;
    }
  });

  return ok;
}

function validateParsedRows(
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

function buildBackupDiff(
  targetRows: BackupRowsByTable,
  snapshot: BackupRowsByTable,
): BackupTableDiff[] {
  return EDITABLE_TABLE_NAMES.map((tableName) => {
    const table = getAdminTableDefinition(tableName);
    const columns = table.columns.map((column) => column.name);
    const currentById = indexRowsById(snapshot[tableName]);
    const targetById = indexRowsById(targetRows[tableName]);
    const changes: BackupRowDiff[] = [];
    let unchanged = 0;

    for (const target of targetRows[tableName]) {
      const rowId = Number(target.id);
      const current = currentById.get(rowId);
      if (!current) {
        changes.push({
          kind: "insert",
          rowId,
          cells: columns.map((columnName) => ({
            columnName,
            before: null,
            after: target[columnName] ?? null,
          })),
        });
        continue;
      }

      const cells = columns
        .filter((columnName) => !sameValue(current[columnName], target[columnName]))
        .map((columnName) => ({
          columnName,
          before: current[columnName] ?? null,
          after: target[columnName] ?? null,
        }));

      if (cells.length > 0) {
        changes.push({ kind: "update", rowId, cells });
      } else {
        unchanged += 1;
      }
    }

    if (tableName !== "facilities") {
      for (const current of snapshot[tableName]) {
        const rowId = Number(current.id);
        if (!targetById.has(rowId)) {
          changes.push({
            kind: "delete",
            rowId,
            cells: columns.map((columnName) => ({
              columnName,
              before: current[columnName] ?? null,
              after: null,
            })),
          });
        }
      }
    }

    changes.sort((a, b) => {
      const kindOrder = getChangeKindOrder(a.kind) - getChangeKindOrder(b.kind);
      return kindOrder || a.rowId - b.rowId;
    });

    return {
      tableName,
      label: getAdminTableLabel(tableName),
      inserted: changes.filter((change) => change.kind === "insert").length,
      updated: changes.filter((change) => change.kind === "update").length,
      deleted: changes.filter((change) => change.kind === "delete").length,
      unchanged,
      changes,
    };
  });
}

function buildEmptyDiff(snapshot: BackupRowsByTable): BackupTableDiff[] {
  return EDITABLE_TABLE_NAMES.map((tableName) => ({
    tableName,
    label: getAdminTableLabel(tableName),
    inserted: 0,
    updated: 0,
    deleted: 0,
    unchanged: snapshot[tableName].length,
    changes: [],
  }));
}

function applyBackupRows(
  actor: User,
  rows: BackupRowsByTable,
  beforeSnapshot: BackupRowsByTable,
  diff: BackupTableDiff[],
): void {
  const usersChanged = hasTableChanges(diff, "users");
  const timeSlotsChanged = hasTableChanges(diff, "facility_time_slots");
  const bookingsChanged = hasTableChanges(diff, "facility_bookings");

  if (hasTableChanges(diff, "facilities")) {
    const updateFacility = db.prepare(
      `
        UPDATE facilities
        SET tagline_1 = ?,
            tagline_2 = ?,
            tagline_3 = ?
        WHERE id = ?
      `,
    );
    for (const row of rows.facilities) {
      updateFacility.run(row.tagline_1, row.tagline_2, row.tagline_3, row.id);
    }
  }

  if (usersChanged) {
    db.prepare("DELETE FROM facility_bookings").run();
    db.prepare("DELETE FROM facility_time_slots").run();
    db.prepare("DELETE FROM users").run();
    insertRows("users", rows.users);
    insertRows("facility_time_slots", rows.facility_time_slots);
    insertRows("facility_bookings", rows.facility_bookings);
  } else if (timeSlotsChanged) {
    db.prepare("DELETE FROM facility_bookings").run();
    db.prepare("DELETE FROM facility_time_slots").run();
    insertRows("facility_time_slots", rows.facility_time_slots);
    insertRows("facility_bookings", rows.facility_bookings);
  } else if (bookingsChanged) {
    db.prepare("DELETE FROM facility_bookings").run();
    insertRows("facility_bookings", rows.facility_bookings);
  }

  insertRestoreAuditLogs(actor, beforeSnapshot, rows, diff);
}

function insertRows(tableName: EditableTableName, rows: AdminRow[]): void {
  const table = getAdminTableDefinition(tableName);
  const columns = table.columns.map((column) => column.name);
  const placeholders = columns.map(() => "?").join(", ");
  const insert = db.prepare(
    `
      INSERT INTO ${table.name} (${columns.join(", ")})
      VALUES (${placeholders})
    `,
  );

  for (const row of rows) {
    insert.run(...columns.map((columnName) => row[columnName] ?? null));
  }
}

function insertRestoreAuditLogs(
  actor: User,
  beforeSnapshot: BackupRowsByTable,
  targetRows: BackupRowsByTable,
  diff: BackupTableDiff[],
): void {
  for (const tableDiff of diff) {
    const beforeById = indexRowsById(beforeSnapshot[tableDiff.tableName]);
    const afterById = indexRowsById(targetRows[tableDiff.tableName]);
    for (const change of tableDiff.changes) {
      insertAuditLog(
        actor,
        change.kind === "insert"
          ? "insert"
          : change.kind === "delete"
            ? "delete"
            : "update",
        tableDiff.tableName,
        change.rowId,
        beforeById.get(change.rowId) ?? null,
        afterById.get(change.rowId) ?? null,
      );
    }
  }
}

async function writePreRestoreBackup(snapshot: BackupRowsByTable): Promise<string> {
  const backupDir = join(process.cwd(), "data", "backups");
  mkdirSync(backupDir, { recursive: true });
  const backupPath = join(
    backupDir,
    getBackupWorkbookFileName("sunoki-pre-restore"),
  );
  writeFileSync(
    backupPath,
    new Uint8Array(await generateBackupWorkbookBuffer(snapshot)),
  );
  return backupPath;
}

function saveBackupDraft(
  actor: User,
  payload: BackupImportDraftPayload,
): string {
  const token = randomBytes(24).toString("hex");
  updateBackupDraft(actor, token, payload);
  return token;
}

function updateBackupDraft(
  actor: User,
  token: string,
  payload: BackupImportDraftPayload,
): void {
  pruneExpiredBackupDrafts();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + BACKUP_DRAFT_TTL_MINUTES * 60_000);
  db.prepare(
    `
      INSERT INTO admin_import_drafts (
        token,
        actor_user_id,
        actor_username,
        payload_json,
        created_at,
        expires_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(token) DO UPDATE SET
        payload_json = excluded.payload_json,
        expires_at = excluded.expires_at
    `,
  ).run(
    token,
    actor.id,
    actor.username,
    JSON.stringify(payload),
    formatDateTime(now),
    formatDateTime(expiresAt),
  );
}

function deleteBackupDraft(token: string): void {
  db.prepare("DELETE FROM admin_import_drafts WHERE token = ?").run(token);
}

function pruneExpiredBackupDrafts(): void {
  db.prepare("DELETE FROM admin_import_drafts WHERE expires_at <= ?").run(
    formatDateTime(new Date()),
  );
}

function readCellValue(
  cell: ExcelJS.Cell,
  tableName: EditableTableName,
  rowNumber: number,
  columnName: string,
  errors: BackupImportError[],
): AdminRowValue {
  if (cell.type === ExcelJS.ValueType.Formula) {
    errors.push({
      tableName,
      rowNumber,
      columnName,
      message: "Formula cells are not allowed.",
    });
    return null;
  }

  const value = cell.value;
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number") return value;

  errors.push({
    tableName,
    rowNumber,
    columnName,
    message: "Cell must contain plain text or a number.",
  });
  return null;
}

function readRequiredTextValue(
  row: ParsedSheetRow,
  tableName: EditableTableName,
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

function readOptionalTextValue(
  row: ParsedSheetRow,
  tableName: EditableTableName,
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

function readLimitedOptionalTextValue(
  row: ParsedSheetRow,
  tableName: EditableTableName,
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

function readPositiveIntegerValue(
  row: ParsedSheetRow,
  tableName: EditableTableName,
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

function readIntegerValue(
  row: ParsedSheetRow,
  tableName: EditableTableName,
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

function readBookingDateValue(
  row: ParsedSheetRow,
  tableName: EditableTableName,
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

function readDateTimeValue(
  row: ParsedSheetRow,
  tableName: EditableTableName,
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

function validateRequiredBookingDate(
  value: string | null,
  row: ParsedSheetRow,
  tableName: EditableTableName,
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

function addRowError(
  errors: BackupImportError[],
  row: ParsedSheetRow,
  tableName: EditableTableName,
  columnName: string,
  message: string,
): void {
  errors.push({ tableName, rowNumber: row.rowNumber, columnName, message });
}

function isEmptyCellValue(value: AdminRowValue): boolean {
  return value === null || value === "";
}

function textOrNull(value: AdminRowValue): string | null {
  return typeof value === "string" && value ? value : null;
}

function indexRowsById(rows: AdminRow[]): Map<number, AdminRow> {
  const byId = new Map<number, AdminRow>();
  for (const row of rows) {
    byId.set(Number(row.id), row);
  }
  return byId;
}

function sameValue(left: AdminRowValue, right: AdminRowValue): boolean {
  return (left ?? null) === (right ?? null);
}

function countDraftChanges(diff: BackupTableDiff[]): number {
  return diff.reduce((sum, table) => sum + table.changes.length, 0);
}

function hasTableChanges(
  diff: BackupTableDiff[],
  tableName: EditableTableName,
): boolean {
  return Boolean(diff.find((table) => table.tableName === tableName)?.changes.length);
}

function fingerprintSnapshot(snapshot: BackupRowsByTable): string {
  return createHash("sha256")
    .update(JSON.stringify(snapshot))
    .digest("hex");
}

function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function formatFileTimestamp(date: Date): string {
  return formatDateTime(date).replace(" ", "-").replaceAll(":", "");
}

function getColumnWidth(columnName: string): number {
  if (columnName === "password") return 24;
  if (columnName.endsWith("_at")) return 22;
  if (columnName.endsWith("_date")) return 14;
  if (columnName.includes("tagline")) return 18;
  return Math.max(12, columnName.length + 4);
}

function getChangeKindOrder(kind: BackupRowDiff["kind"]): number {
  switch (kind) {
    case "insert":
      return 1;
    case "update":
      return 2;
    case "delete":
      return 3;
  }
}

function isValidDraftToken(token: string): boolean {
  return /^[a-f0-9]{48}$/.test(token);
}

function runTransaction(fn: () => void): void {
  let inTransaction = false;
  try {
    db.exec("BEGIN IMMEDIATE");
    inTransaction = true;
    fn();
    db.exec("COMMIT");
    inTransaction = false;
  } catch (error) {
    if (inTransaction) db.exec("ROLLBACK");
    if (error instanceof DatabaseChangedDuringApplyError) throw error;
    throw error;
  }
}

class DatabaseChangedDuringApplyError extends Error {}
