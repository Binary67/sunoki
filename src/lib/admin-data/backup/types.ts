import type { AdminRow, AdminRowValue } from "../definitions";
import type { BackupTableName } from "./tables";

export type ParsedSheetRow = {
  rowNumber: number;
  values: AdminRow;
};

export type ParsedRowsByTable = Record<BackupTableName, ParsedSheetRow[]>;

export type BackupRowsByTable = Record<BackupTableName, AdminRow[]>;

export type BackupImportError = {
  message: string;
  tableName?: BackupTableName;
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
  tableName: BackupTableName;
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
