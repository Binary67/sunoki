import { db, type User } from "../db";
import { insertAuditLog } from "./audit";
import {
  getAdminTableDefinition,
  type AdminMutationResult,
  type EditableTableName,
} from "./definitions";
import { selectRowById } from "./queries";
import { parseFormValues } from "./validation";

type InsertResult = {
  lastInsertRowid: number | bigint;
};

export function createAdminRow(
  actor: User,
  tableName: EditableTableName,
  formData: FormData,
): AdminMutationResult {
  const table = getAdminTableDefinition(tableName);
  const parsed = parseFormValues(tableName, formData);
  if (!parsed.ok) return { ok: false, message: parsed.message };

  try {
    runTransaction(() => {
      const columns = Object.keys(parsed.values);
      const placeholders = columns.map(() => "?").join(", ");
      const result = db
        .prepare(
          `
            INSERT INTO ${table.name} (${columns.join(", ")})
            VALUES (${placeholders})
          `,
        )
        .run(...columns.map((column) => parsed.values[column])) as InsertResult;
      const rowId = Number(result.lastInsertRowid);
      const after = selectRowById(table, rowId);
      if (!after) throw new Error("Inserted row could not be loaded.");
      insertAuditLog(actor, "insert", table.name, rowId, null, after);
    });
    return { ok: true, message: "Row created." };
  } catch {
    return {
      ok: false,
      message: "Unable to create row. Check unique values and relationships.",
    };
  }
}

export function updateAdminRow(
  actor: User,
  tableName: EditableTableName,
  rowId: number,
  formData: FormData,
): AdminMutationResult {
  const table = getAdminTableDefinition(tableName);
  if (!Number.isInteger(rowId) || rowId <= 0) {
    return { ok: false, message: "Choose a valid row." };
  }

  const parsed = parseFormValues(tableName, formData);
  if (!parsed.ok) return { ok: false, message: parsed.message };

  let found = true;

  try {
    runTransaction(() => {
      const before = selectRowById(table, rowId);
      if (!before) {
        found = false;
        return;
      }

      const columns = Object.keys(parsed.values);
      db.prepare(
        `
          UPDATE ${table.name}
          SET ${columns.map((column) => `${column} = ?`).join(", ")}
          WHERE id = ?
        `,
      ).run(...columns.map((column) => parsed.values[column]), rowId);

      const after = selectRowById(table, rowId);
      if (!after) throw new Error("Updated row could not be loaded.");
      insertAuditLog(actor, "update", table.name, rowId, before, after);
    });

    if (!found) return { ok: false, message: "Row not found." };
    return { ok: true, message: "Row updated." };
  } catch {
    return {
      ok: false,
      message: "Unable to update row. Check unique values and relationships.",
    };
  }
}

export function deleteAdminRow(
  actor: User,
  tableName: EditableTableName,
  rowId: number,
): AdminMutationResult {
  const table = getAdminTableDefinition(tableName);
  if (!Number.isInteger(rowId) || rowId <= 0) {
    return { ok: false, message: "Choose a valid row." };
  }

  let found = true;

  try {
    runTransaction(() => {
      const before = selectRowById(table, rowId);
      if (!before) {
        found = false;
        return;
      }

      db.prepare(`DELETE FROM ${table.name} WHERE id = ?`).run(rowId);
      insertAuditLog(actor, "delete", table.name, rowId, before, null);
    });

    if (!found) return { ok: false, message: "Row not found." };
    return { ok: true, message: "Row deleted." };
  } catch {
    return {
      ok: false,
      message: "Unable to delete row. Check related records.",
    };
  }
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
    throw error;
  }
}
