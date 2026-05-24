import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { insertAuditLog } from "../audit";
import {
  getAdminTableDefinition,
  type AdminRow,
  type EditableTableName,
} from "../definitions";
import { db, type User } from "../../db";
import { hasTableChanges, indexRowsById } from "./diff";
import {
  generateBackupWorkbookBuffer,
  getBackupWorkbookFileName,
} from "./workbook";
import type { BackupRowsByTable, BackupTableDiff } from "./types";

type GuestProfileUserLink = {
  id: number;
  userId: number;
};

export function applyBackupRows(
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

  if (hasTableChanges(diff, "package_service_entitlements")) {
    const table = getAdminTableDefinition("package_service_entitlements");
    const columns = table.columns
      .filter((column) => !column.readOnly)
      .map((column) => column.name);
    const updatePackage = db.prepare(
      `
        UPDATE package_service_entitlements
        SET ${columns.map((column) => `${column} = ?`).join(", ")}
        WHERE id = ?
      `,
    );
    for (const row of rows.package_service_entitlements) {
      updatePackage.run(...columns.map((column) => row[column]), row.id);
    }
  }

  if (usersChanged) {
    const guestProfileUserLinks = getGuestProfileUserLinks(rows.users);
    db.prepare("DELETE FROM facility_bookings").run();
    db.prepare("DELETE FROM facility_time_slots").run();
    db.prepare("DELETE FROM users").run();
    insertRows("users", rows.users);
    restoreGuestProfileUserLinks(guestProfileUserLinks);
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

function getGuestProfileUserLinks(users: AdminRow[]): GuestProfileUserLink[] {
  const userIds = new Set(users.map((user) => user.id).filter(Number.isInteger));
  const rows = db
    .prepare(
      `
        SELECT
          id,
          user_id AS userId
        FROM guest_profiles
        WHERE user_id IS NOT NULL
      `,
    )
    .all() as GuestProfileUserLink[];

  return rows.filter((row) => userIds.has(row.userId));
}

function restoreGuestProfileUserLinks(links: GuestProfileUserLink[]): void {
  if (links.length === 0) return;

  const update = db.prepare(
    "UPDATE guest_profiles SET user_id = ? WHERE id = ?",
  );
  for (const link of links) {
    update.run(link.userId, link.id);
  }
}

export async function writePreRestoreBackup(
  snapshot: BackupRowsByTable,
): Promise<string> {
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

export function runTransaction(fn: () => void): void {
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

export class DatabaseChangedDuringApplyError extends Error {}

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
