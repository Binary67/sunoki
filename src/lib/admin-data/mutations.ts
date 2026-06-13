import { db, type User } from "../db";
import { insertAuditLog } from "./audit";
import {
  getAdminTableDefinition,
  isUpdateOnlyAdminTable,
  type AdminRow,
  type AdminRowValue,
  type AdminMutationResult,
  type EditableTableName,
} from "./definitions";
import { selectRowById } from "./queries";
import { parseFormValues } from "./validation";
import type { UserRole } from "../roles";
import { createFacilityBooking, updateFacilityBooking } from "../bookings";
import {
  createServiceBooking,
  updateServiceBooking,
} from "../service-bookings/mutations";

type InsertResult = {
  lastInsertRowid: number | bigint;
};

export function createAdminRow(
  actor: User,
  tableName: EditableTableName,
  formData: FormData,
): AdminMutationResult {
  const table = getAdminTableDefinition(tableName);
  if (isUpdateOnlyAdminTable(tableName)) {
    return { ok: false, message: `${table.label} can only be updated.` };
  }
  const tablePermissionError = validateTableMutation(actor, tableName);
  if (tablePermissionError) return tablePermissionError;
  if (tableName === "facility_bookings") {
    return createAdminFacilityBooking(actor, formData);
  }
  if (tableName === "guest_service_bookings") {
    return createAdminServiceBooking(actor, formData);
  }

  const parsed = parseFormValues(tableName, formData, "create");
  if (!parsed.ok) return { ok: false, message: parsed.message };
  const createError = validateUserCreate(actor, tableName, parsed.values);
  if (createError) return createError;

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
  const tablePermissionError = validateTableMutation(actor, tableName);
  if (tablePermissionError) return tablePermissionError;
  if (tableName === "facility_bookings") {
    return updateAdminFacilityBooking(actor, rowId, formData);
  }
  if (tableName === "guest_service_bookings") {
    return updateAdminServiceBooking(actor, rowId, formData);
  }

  const parsed = parseFormValues(tableName, formData, "update");
  if (!parsed.ok) return { ok: false, message: parsed.message };

  let found = true;
  let permissionError: AdminMutationResult | null = null;

  try {
    runTransaction(() => {
      const before = selectRowById(table, rowId);
      if (!before) {
        found = false;
        return;
      }

      permissionError = validateUserUpdate(
        actor,
        tableName,
        before,
        parsed.values,
      );
      if (permissionError) return;

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
    if (permissionError) return permissionError;
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
  if (isUpdateOnlyAdminTable(tableName)) {
    return { ok: false, message: `${table.label} cannot be deleted.` };
  }
  const tablePermissionError = validateTableMutation(actor, tableName);
  if (tablePermissionError) return tablePermissionError;

  if (!Number.isInteger(rowId) || rowId <= 0) {
    return { ok: false, message: "Choose a valid row." };
  }

  let found = true;
  let permissionError: AdminMutationResult | null = null;

  try {
    runTransaction(() => {
      const before = selectRowById(table, rowId);
      if (!before) {
        found = false;
        return;
      }

      permissionError = validateUserDelete(actor, tableName, before);
      if (permissionError) return;

      db.prepare(`DELETE FROM ${table.name} WHERE id = ?`).run(rowId);
      insertAuditLog(actor, "delete", table.name, rowId, before, null);
    });

    if (!found) return { ok: false, message: "Row not found." };
    if (permissionError) return permissionError;
    return { ok: true, message: "Row deleted." };
  } catch {
    return {
      ok: false,
      message: "Unable to delete row. Check related records.",
    };
  }
}

export function updateUserPassword(
  actor: User,
  rowId: number,
  formData: FormData,
): AdminMutationResult {
  if (!Number.isInteger(rowId) || rowId <= 0) {
    return { ok: false, message: "Choose a valid user." };
  }

  const rawPassword = formData.get("password");
  const password = typeof rawPassword === "string" ? rawPassword : "";
  if (!password) return { ok: false, message: "Password is required." };

  const table = getAdminTableDefinition("users");
  let found = true;
  let permissionError: AdminMutationResult | null = null;

  try {
    runTransaction(() => {
      const before = selectRowById(table, rowId);
      if (!before) {
        found = false;
        return;
      }

      permissionError = validateUserPasswordUpdate(actor, before);
      if (permissionError) return;

      db.prepare("UPDATE users SET password = ? WHERE id = ?").run(
        password,
        rowId,
      );

      const after = selectRowById(table, rowId);
      if (!after) throw new Error("Updated user could not be loaded.");
      insertAuditLog(actor, "update", "users", rowId, before, after);
    });

    if (!found) return { ok: false, message: "User not found." };
    if (permissionError) return permissionError;
    return { ok: true, message: "Password updated." };
  } catch {
    return { ok: false, message: "Unable to update password." };
  }
}

function createAdminServiceBooking(
  actor: User,
  formData: FormData,
): AdminMutationResult {
  const parsed = parseFormValues("guest_service_bookings", formData, "create");
  if (!parsed.ok) return { ok: false, message: parsed.message };

  const result = createServiceBooking({
    auditActor: actor,
    userId: Number(parsed.values.user_id),
    serviceKey: String(parsed.values.service_key),
    bookingDate: String(parsed.values.booking_date),
    bookingTime: String(parsed.values.booking_time),
  });
  if (!result.ok) return { ok: false, message: result.error };

  return { ok: true, message: "Row created." };
}

function createAdminFacilityBooking(
  actor: User,
  formData: FormData,
): AdminMutationResult {
  const parsed = parseFormValues("facility_bookings", formData, "create");
  if (!parsed.ok) return { ok: false, message: parsed.message };

  const result = createFacilityBooking({
    auditActor: actor,
    userId: Number(parsed.values.user_id),
    facilityId: Number(parsed.values.facility_id),
    bookingDate: String(parsed.values.booking_date),
    bookingTime: String(parsed.values.booking_time),
  });
  if (!result.ok) return { ok: false, message: result.error };

  return { ok: true, message: "Row created." };
}

function updateAdminServiceBooking(
  actor: User,
  rowId: number,
  formData: FormData,
): AdminMutationResult {
  const parsed = parseFormValues("guest_service_bookings", formData, "update");
  if (!parsed.ok) return { ok: false, message: parsed.message };

  const result = updateServiceBooking({
    auditActor: actor,
    bookingId: rowId,
    userId: Number(parsed.values.user_id),
    serviceKey: String(parsed.values.service_key),
    bookingDate: String(parsed.values.booking_date),
    bookingTime: String(parsed.values.booking_time),
  });
  if (!result.ok) return { ok: false, message: result.error };

  return { ok: true, message: "Row updated." };
}

function updateAdminFacilityBooking(
  actor: User,
  rowId: number,
  formData: FormData,
): AdminMutationResult {
  const parsed = parseFormValues("facility_bookings", formData, "update");
  if (!parsed.ok) return { ok: false, message: parsed.message };

  const result = updateFacilityBooking({
    auditActor: actor,
    bookingId: rowId,
    userId: Number(parsed.values.user_id),
    facilityId: Number(parsed.values.facility_id),
    bookingDate: String(parsed.values.booking_date),
    bookingTime: String(parsed.values.booking_time),
  });
  if (!result.ok) return { ok: false, message: result.error };

  return { ok: true, message: "Row updated." };
}

function validateUserCreate(
  actor: User,
  tableName: EditableTableName,
  values: Record<string, AdminRowValue>,
): AdminMutationResult | null {
  if (tableName !== "users") return null;
  const role = getUserRole(values.role);
  if (!role) return { ok: false, message: "Choose a valid role." };
  if (role === "guest") {
    return {
      ok: false,
      message: "Guest accounts are created from guest profiles.",
    };
  }
  if (actor.role !== "superadmin") {
    return { ok: false, message: "Only super admins can manage admin users." };
  }
  return null;
}

function validateTableMutation(
  actor: User,
  tableName: EditableTableName,
): AdminMutationResult | null {
  if (
    tableName === "package_service_entitlements" &&
    actor.role !== "superadmin"
  ) {
    return { ok: false, message: "Only super admins can manage packages." };
  }
  if (tableName === "service_booking_limits" && actor.role !== "superadmin") {
    return {
      ok: false,
      message: "Only super admins can manage service booking limits.",
    };
  }
  return null;
}

function validateUserUpdate(
  actor: User,
  tableName: EditableTableName,
  before: AdminRow,
  values: Record<string, AdminRowValue>,
): AdminMutationResult | null {
  if (tableName !== "users") return null;

  const beforeRole = getUserRole(before.role);
  const afterRole = getUserRole(values.role);
  if (!beforeRole || !afterRole) {
    return { ok: false, message: "Choose a valid role." };
  }

  if (beforeRole === "guest" || afterRole === "guest") {
    return {
      ok: false,
      message: "Guest accounts are managed from guest profiles.",
    };
  }

  if (actor.role !== "superadmin") {
    return { ok: false, message: "Only super admins can manage admin users." };
  }

  if (
    beforeRole === "superadmin" &&
    afterRole !== "superadmin" &&
    getSuperAdminCount() <= 1
  ) {
    return { ok: false, message: "At least one super admin must remain." };
  }

  return null;
}

function validateUserDelete(
  actor: User,
  tableName: EditableTableName,
  before: AdminRow,
): AdminMutationResult | null {
  if (tableName !== "users") return null;

  const role = getUserRole(before.role);
  if (!role) return { ok: false, message: "Choose a valid role." };

  if (role === "guest") {
    return {
      ok: false,
      message: "Guest accounts are managed from guest profiles.",
    };
  }

  if (actor.role !== "superadmin") {
    return { ok: false, message: "Only super admins can manage admin users." };
  }

  if (role === "superadmin" && getSuperAdminCount() <= 1) {
    return { ok: false, message: "At least one super admin must remain." };
  }

  return null;
}

function validateUserPasswordUpdate(
  actor: User,
  before: AdminRow,
): AdminMutationResult | null {
  const role = getUserRole(before.role);
  if (!role) return { ok: false, message: "Choose a valid role." };

  if (role === "guest") {
    return {
      ok: false,
      message: "Guest passwords are managed from guest profiles.",
    };
  }

  if (actor.role !== "superadmin") {
    return { ok: false, message: "Only super admins can manage admin users." };
  }

  return null;
}

function getUserRole(value: AdminRowValue): UserRole | null {
  if (value === "superadmin" || value === "admin" || value === "guest") {
    return value;
  }
  return null;
}

function getSuperAdminCount(): number {
  const row = db
    .prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'superadmin'")
    .get() as { count: number };
  return Number(row.count);
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
