"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdminUser } from "@/src/lib/admin-auth";
import {
  applyBackupImportDraft,
  createBackupImportDraft,
} from "@/src/lib/admin-data/backup";
import { clearSessionCookie } from "@/src/lib/auth";

const BACKUP_PATH = "/admin/data/backup";
const DATA_PATHS = [
  "/admin/data/users",
  "/admin/data/facilities",
  "/admin/data/backup",
  "/admin/guest-profile",
  "/admin/kitchen",
  "/admin/audit-log",
  "/",
  "/booking/karaoke",
  "/booking/gym",
  "/booking/yoga",
  "/booking/lounge",
  "/booking/services",
];

export async function uploadBackupWorkbookAction(
  formData: FormData,
): Promise<void> {
  const actor = await requireSuperAdminUser();
  const file = formData.get("workbook");
  const result = await createBackupImportDraft(
    actor,
    file instanceof File ? file : null,
  );

  if (!result.ok) {
    redirectWithMessage("error", result.message);
  }

  const params = new URLSearchParams();
  params.set("draft", result.token);
  params.set(result.errorCount > 0 ? "error" : "success", result.message);
  redirect(`${BACKUP_PATH}?${params.toString()}`);
}

export async function confirmBackupImportAction(
  formData: FormData,
): Promise<void> {
  const actor = await requireSuperAdminUser();
  const token = formData.get("draftToken");
  if (typeof token !== "string") {
    redirectWithMessage("error", "Import draft expired or was not found.");
  }

  const result = await applyBackupImportDraft(actor, token);
  if (!result.ok) {
    const params = new URLSearchParams();
    params.set("draft", token);
    params.set("error", result.message);
    redirect(`${BACKUP_PATH}?${params.toString()}`);
  }

  if (!result.applied) {
    const params = new URLSearchParams();
    params.set("draft", token);
    params.set("success", result.message);
    redirect(`${BACKUP_PATH}?${params.toString()}`);
  }

  for (const path of DATA_PATHS) {
    revalidatePath(path);
  }

  if (result.invalidatedSessions) {
    await clearSessionCookie();
    redirect("/login");
  }

  redirectWithMessage(
    "success",
    `Backup restored. Applied ${result.changeCount} row changes.`,
  );
}

function redirectWithMessage(tone: "error" | "success", message: string): never {
  const params = new URLSearchParams();
  params.set(tone, message);
  redirect(`${BACKUP_PATH}?${params.toString()}`);
}
