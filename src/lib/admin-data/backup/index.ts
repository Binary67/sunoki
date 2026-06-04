import ExcelJS from "exceljs";
import { type AdminRow } from "../definitions";
import { db, type User } from "../../db";
import {
  applyBackupRows,
  DatabaseChangedDuringApplyError,
  runTransaction,
  writePreRestoreBackup,
} from "./apply";
import {
  buildBackupDiff,
  buildEmptyDiff,
  countDraftChanges,
  fingerprintSnapshot,
} from "./diff";
import {
  deleteBackupDraft,
  getBackupImportDraft,
  saveBackupDraft,
  updateBackupDraft,
} from "./drafts";
import { formatDateTime } from "./format";
import {
  BACKUP_TABLE_NAMES,
  getBackupTableDefinition,
  type BackupTableName,
} from "./tables";
import { validateParsedRows } from "./validation";
import {
  parseWorkbookRows,
} from "./workbook";
import type {
  ApplyBackupImportDraftResult,
  BackupImportDraftPayload,
  BackupRowsByTable,
  CreateBackupImportDraftResult,
  ParsedRowsByTable,
} from "./types";

export type {
  ApplyBackupImportDraftResult,
  BackupCellDiff,
  BackupImportDraft,
  BackupImportDraftPayload,
  BackupImportError,
  BackupRowDiff,
  BackupTableDiff,
  CreateBackupImportDraftResult,
} from "./types";

export { getBackupImportDraft };

const MAX_BACKUP_UPLOAD_BYTES = 5 * 1024 * 1024;
const SOURCE_OF_TRUTH_TABLES = [
  "users",
  "guest_profiles",
  "guest_profile_addons",
  "facility_bookings",
  "guest_service_bookings",
] as const satisfies readonly BackupTableName[];

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
  return BACKUP_TABLE_NAMES.reduce((snapshot, tableName) => {
    const table = getBackupTableDefinition(tableName);
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

  const validation = validateParsedRows(parsed.rows);
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
  const parsed = BACKUP_TABLE_NAMES.reduce((result, tableName) => {
    result[tableName] = rows[tableName].map((values, index) => ({
      rowNumber: index + 2,
      values,
    }));
    return result;
  }, {} as ParsedRowsByTable);
  const validation = validateParsedRows(parsed);
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
