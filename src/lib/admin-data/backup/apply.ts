import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { insertAuditLog } from "../audit";
import {
  isEditableTableName,
  type AdminRow,
  type EditableTableName,
} from "../definitions";
import { db, type User } from "../../db";
import { hasTableChanges, indexRowsById } from "./diff";
import {
  generateBackupWorkbookBuffer,
  getBackupWorkbookFileName,
} from "./workbook";
import { getBackupTableDefinition, type BackupTableName } from "./tables";
import type { BackupRowsByTable, BackupTableDiff } from "./types";

export function applyBackupRows(
  actor: User,
  rows: BackupRowsByTable,
  beforeSnapshot: BackupRowsByTable,
  diff: BackupTableDiff[],
): void {
  const usersChanged = hasTableChanges(diff, "users");
  const facilitiesChanged = hasTableChanges(diff, "facilities");
  const timeSlotsChanged = hasTableChanges(diff, "facility_time_slots");
  const guestProfilesChanged = hasTableChanges(diff, "guest_profiles");
  const guestAddonsChanged = hasTableChanges(diff, "guest_profile_addons");
  const facilityBookingsChanged = hasTableChanges(diff, "facility_bookings");
  const serviceBookingsChanged = hasTableChanges(diff, "guest_service_bookings");

  const restoreFacilities = facilitiesChanged;
  const restoreTimeSlots = restoreFacilities || timeSlotsChanged;
  const restoreGuestProfiles = usersChanged || guestProfilesChanged;
  const restoreGuestAddons = restoreGuestProfiles || guestAddonsChanged;
  const restoreFacilityBookings =
    usersChanged || restoreTimeSlots || facilityBookingsChanged;
  const restoreServiceBookings =
    usersChanged || restoreGuestProfiles || serviceBookingsChanged;

  if (restoreServiceBookings) deleteRows("guest_service_bookings");
  if (restoreFacilityBookings) deleteRows("facility_bookings");
  if (restoreGuestAddons) deleteRows("guest_profile_addons");
  if (restoreGuestProfiles) deleteRows("guest_profiles");
  if (restoreTimeSlots) deleteRows("facility_time_slots");
  if (restoreFacilities) deleteRows("facilities");
  if (usersChanged) deleteRows("users");

  if (usersChanged) insertRows("users", rows.users);
  if (restoreFacilities) insertRows("facilities", rows.facilities);
  if (restoreTimeSlots) {
    insertRows("facility_time_slots", rows.facility_time_slots);
  }
  if (restoreGuestProfiles) insertRows("guest_profiles", rows.guest_profiles);
  if (restoreGuestAddons) {
    insertRows("guest_profile_addons", rows.guest_profile_addons);
  }
  if (restoreFacilityBookings) {
    insertRows("facility_bookings", rows.facility_bookings);
  }
  if (restoreServiceBookings) {
    insertRows("guest_service_bookings", rows.guest_service_bookings);
  }

  insertRestoreAuditLogs(actor, beforeSnapshot, rows, diff);
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

function deleteRows(tableName: BackupTableName): void {
  const table = getBackupTableDefinition(tableName);
  db.prepare(`DELETE FROM ${table.name}`).run();
}

function insertRows(tableName: BackupTableName, rows: AdminRow[]): void {
  const table = getBackupTableDefinition(tableName);
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
    if (!isAuditedTableName(tableDiff.tableName)) continue;
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

function isAuditedTableName(
  tableName: BackupTableName,
): tableName is Extract<BackupTableName, EditableTableName> {
  return isEditableTableName(tableName);
}
