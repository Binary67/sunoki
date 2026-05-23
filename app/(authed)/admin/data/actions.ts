"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/src/lib/admin-auth";
import { insertAuditLog } from "@/src/lib/admin-data/audit";
import {
  isEditableTableName,
  type EditableTableName,
} from "@/src/lib/admin-data/definitions";
import {
  createAdminRow,
  deleteAdminRow,
  updateAdminRow,
  updateUserPassword,
} from "@/src/lib/admin-data/mutations";
import { getAdminRowForEdit } from "@/src/lib/admin-data/queries";
import { clearSessionCookie, revokeUserSessions } from "@/src/lib/auth";
import { clearUserLoginLock } from "@/src/lib/login-attempts";

const USERS_DATA_PATH = "/admin/data/users";
const FACILITIES_DATA_PATH = "/admin/data/facilities";
const AUDIT_PATH = "/admin/audit-log";

export async function createAdminRowAction(formData: FormData): Promise<void> {
  const tableName = getTableName(formData);
  if (!tableName) redirectWithMessage(null, "error", "Choose a valid table.");
  const createMode = getCreateMode(formData);

  const user = await requireAdminUser();
  const result = createAdminRow(user, tableName, formData);
  if (result.ok) {
    revalidatePath(getDataPath(tableName));
    revalidatePath(AUDIT_PATH);
  }
  redirectWithMessage(
    tableName,
    result.ok ? "success" : "error",
    result.message,
    undefined,
    createMode,
  );
}

export async function updateAdminRowAction(formData: FormData): Promise<void> {
  const tableName = getTableName(formData);
  if (!tableName) redirectWithMessage(null, "error", "Choose a valid table.");

  const rowId = getRowId(formData);
  const user = await requireAdminUser();
  const result = updateAdminRow(user, tableName, rowId, formData);
  if (result.ok) {
    revalidatePath(getDataPath(tableName));
    revalidatePath(AUDIT_PATH);
    if (tableName === "facilities") {
      revalidateFacilityBookingPath(tableName, rowId, user);
    }
  }
  redirectWithMessage(
    tableName,
    result.ok ? "success" : "error",
    result.message,
    result.ok ? undefined : rowId,
  );
}

export async function updateUserPasswordAction(
  formData: FormData,
): Promise<void> {
  const userId = getUserId(formData);
  const user = await requireAdminUser();
  const result = updateUserPassword(user, userId, formData);

  if (result.ok) {
    revalidatePath(USERS_DATA_PATH);
    revalidatePath(AUDIT_PATH);
  }

  redirectWithMessage(
    "users",
    result.ok ? "success" : "error",
    result.message,
    undefined,
    undefined,
    "accounts",
    result.ok ? undefined : userId,
  );
}

export async function deleteAdminRowAction(formData: FormData): Promise<void> {
  const tableName = getTableName(formData);
  if (!tableName) redirectWithMessage(null, "error", "Choose a valid table.");

  const rowId = getRowId(formData);
  const user = await requireAdminUser();
  const result = deleteAdminRow(user, tableName, rowId);
  if (result.ok) {
    revalidatePath(getDataPath(tableName));
    revalidatePath(AUDIT_PATH);
  }
  redirectWithMessage(tableName, result.ok ? "success" : "error", result.message);
}

export async function revokeUserSessionsAction(formData: FormData): Promise<void> {
  const targetUserId = getUserId(formData);
  const user = await requireAdminUser();
  const result = revokeUserSessions(user, targetUserId);

  if (result.ok) {
    insertAuditLog(
      user,
      "update",
      "users",
      result.targetUser.id,
      { active_sessions: result.beforeCount },
      { active_sessions: result.afterCount },
    );
    revalidatePath(USERS_DATA_PATH);
    revalidatePath(AUDIT_PATH);

    if (result.targetUser.id === user.id) {
      await clearSessionCookie();
      redirect("/login");
    }
  }

  redirectWithMessage(
    "users",
    result.ok ? "success" : "error",
    result.message,
    undefined,
    undefined,
    "access",
  );
}

export async function clearLoginLockAction(formData: FormData): Promise<void> {
  const targetUserId = getUserId(formData);
  const user = await requireAdminUser();
  const result = clearUserLoginLock(user, targetUserId);

  if (result.ok) {
    if (result.beforeLockedUntil) {
      insertAuditLog(
        user,
        "update",
        "users",
        result.targetUser.id,
        { login_locked_until: result.beforeLockedUntil },
        { login_locked_until: result.afterLockedUntil },
      );
    }
    revalidatePath(USERS_DATA_PATH);
    revalidatePath(AUDIT_PATH);
  }

  redirectWithMessage(
    "users",
    result.ok ? "success" : "error",
    result.message,
    undefined,
    undefined,
    "access",
  );
}

function getTableName(formData: FormData): EditableTableName | null {
  const raw = formData.get("tableName");
  return typeof raw === "string" && isEditableTableName(raw) ? raw : null;
}

function getRowId(formData: FormData): number {
  const raw = formData.get("rowId");
  return typeof raw === "string" ? Number(raw) : NaN;
}

function getUserId(formData: FormData): number {
  const raw = formData.get("userId");
  return typeof raw === "string" ? Number(raw) : NaN;
}

function getCreateMode(formData: FormData): "guest" | "admin" | null {
  const raw = formData.get("createMode");
  return raw === "guest" || raw === "admin" ? raw : null;
}

function revalidateFacilityBookingPath(
  tableName: EditableTableName,
  rowId: number,
  user: Awaited<ReturnType<typeof requireAdminUser>>,
): void {
  const row = getAdminRowForEdit(tableName, rowId, user);
  const slug = row?.slug;
  if (typeof slug === "string" && slug) {
    revalidatePath(`/booking/${slug}`);
  }
}

function redirectWithMessage(
  tableName: EditableTableName | null,
  tone: "error" | "success",
  message: string,
  editId?: number,
  createMode?: "guest" | "admin" | null,
  requestedTab?: string,
  passwordId?: number,
): never {
  const params = new URLSearchParams();
  params.set("tab", getDataTab(tableName, requestedTab));
  if (tableName === "users" && createMode) {
    params.set("create", createMode);
  }
  if (editId && Number.isInteger(editId) && editId > 0) {
    params.set("edit", String(editId));
  }
  if (passwordId && Number.isInteger(passwordId) && passwordId > 0) {
    params.set("password", String(passwordId));
  }
  params.set(tone, message);
  redirect(`${getDataPath(tableName)}?${params.toString()}`);
}

function getDataPath(tableName: EditableTableName | null): string {
  return tableName === "users" || tableName === null
    ? USERS_DATA_PATH
    : FACILITIES_DATA_PATH;
}

function getDataTab(
  tableName: EditableTableName | null,
  requestedTab: string | undefined,
): string {
  if (tableName === "users" || tableName === null) {
    return requestedTab === "access" ? "access" : "accounts";
  }

  switch (tableName) {
    case "facilities":
      return "content";
    case "facility_time_slots":
      return "time-slots";
    case "facility_bookings":
      return "bookings";
  }
}
