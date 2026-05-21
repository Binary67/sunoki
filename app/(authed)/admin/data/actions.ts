"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/src/lib/admin-auth";
import {
  createAdminRow,
  deleteAdminRow,
  isEditableTableName,
  updateAdminRow,
  type EditableTableName,
} from "@/src/lib/admin-data";

const DATA_PATH = "/admin/data";
const AUDIT_PATH = "/admin/audit-log";

export async function createAdminRowAction(formData: FormData): Promise<void> {
  const tableName = getTableName(formData);
  if (!tableName) redirectWithMessage(null, "error", "Choose a valid table.");

  const user = await requireAdminUser();
  const result = createAdminRow(user, tableName, formData);
  if (result.ok) {
    revalidatePath(DATA_PATH);
    revalidatePath(AUDIT_PATH);
  }
  redirectWithMessage(tableName, result.ok ? "success" : "error", result.message);
}

export async function updateAdminRowAction(formData: FormData): Promise<void> {
  const tableName = getTableName(formData);
  if (!tableName) redirectWithMessage(null, "error", "Choose a valid table.");

  const rowId = getRowId(formData);
  const user = await requireAdminUser();
  const result = updateAdminRow(user, tableName, rowId, formData);
  if (result.ok) {
    revalidatePath(DATA_PATH);
    revalidatePath(AUDIT_PATH);
  }
  redirectWithMessage(
    tableName,
    result.ok ? "success" : "error",
    result.message,
    result.ok ? undefined : rowId,
  );
}

export async function deleteAdminRowAction(formData: FormData): Promise<void> {
  const tableName = getTableName(formData);
  if (!tableName) redirectWithMessage(null, "error", "Choose a valid table.");

  const rowId = getRowId(formData);
  const user = await requireAdminUser();
  const result = deleteAdminRow(user, tableName, rowId);
  if (result.ok) {
    revalidatePath(DATA_PATH);
    revalidatePath(AUDIT_PATH);
  }
  redirectWithMessage(tableName, result.ok ? "success" : "error", result.message);
}

function getTableName(formData: FormData): EditableTableName | null {
  const raw = formData.get("tableName");
  return typeof raw === "string" && isEditableTableName(raw) ? raw : null;
}

function getRowId(formData: FormData): number {
  const raw = formData.get("rowId");
  return typeof raw === "string" ? Number(raw) : NaN;
}

function redirectWithMessage(
  tableName: EditableTableName | null,
  tone: "error" | "success",
  message: string,
  editId?: number,
): never {
  const params = new URLSearchParams();
  if (tableName) params.set("table", tableName);
  if (editId && Number.isInteger(editId) && editId > 0) {
    params.set("edit", String(editId));
  }
  params.set(tone, message);
  redirect(`${DATA_PATH}?${params.toString()}`);
}
