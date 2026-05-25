import { createHash } from "node:crypto";
import { type AdminRow, type AdminRowValue } from "../definitions";
import {
  BACKUP_TABLE_NAMES,
  getBackupTableDefinition,
  getBackupTableLabel,
  type BackupTableName,
} from "./tables";
import type {
  BackupRowDiff,
  BackupRowsByTable,
  BackupTableDiff,
} from "./types";

export function buildBackupDiff(
  targetRows: BackupRowsByTable,
  snapshot: BackupRowsByTable,
): BackupTableDiff[] {
  return BACKUP_TABLE_NAMES.map((tableName) => {
    const table = getBackupTableDefinition(tableName);
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

    changes.sort((a, b) => {
      const kindOrder = getChangeKindOrder(a.kind) - getChangeKindOrder(b.kind);
      return kindOrder || a.rowId - b.rowId;
    });

    return {
      tableName,
      label: getBackupTableLabel(tableName),
      inserted: changes.filter((change) => change.kind === "insert").length,
      updated: changes.filter((change) => change.kind === "update").length,
      deleted: changes.filter((change) => change.kind === "delete").length,
      unchanged,
      changes,
    };
  });
}

export function buildEmptyDiff(snapshot: BackupRowsByTable): BackupTableDiff[] {
  return BACKUP_TABLE_NAMES.map((tableName) => ({
    tableName,
    label: getBackupTableLabel(tableName),
    inserted: 0,
    updated: 0,
    deleted: 0,
    unchanged: snapshot[tableName].length,
    changes: [],
  }));
}

export function indexRowsById(rows: AdminRow[]): Map<number, AdminRow> {
  const byId = new Map<number, AdminRow>();
  for (const row of rows) {
    byId.set(Number(row.id), row);
  }
  return byId;
}

export function countDraftChanges(diff: BackupTableDiff[]): number {
  return diff.reduce((sum, table) => sum + table.changes.length, 0);
}

export function hasTableChanges(
  diff: BackupTableDiff[],
  tableName: BackupTableName,
): boolean {
  return Boolean(diff.find((table) => table.tableName === tableName)?.changes.length);
}

export function fingerprintSnapshot(snapshot: BackupRowsByTable): string {
  return createHash("sha256")
    .update(JSON.stringify(snapshot))
    .digest("hex");
}

function sameValue(left: AdminRowValue, right: AdminRowValue): boolean {
  return (left ?? null) === (right ?? null);
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
