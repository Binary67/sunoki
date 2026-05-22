"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/src/lib/admin-auth";
import { updateBrandingSettings } from "@/src/lib/branding";

const PERSONALIZATION_PATH = "/admin/personalization";

export async function updateBrandingSettingsAction(
  formData: FormData,
): Promise<void> {
  await requireAdminUser();

  const result = await updateBrandingSettings({
    brandName: String(formData.get("brand_name") ?? ""),
    brandDescription: String(formData.get("brand_description") ?? ""),
    iconFile: getIconFile(formData),
    removeIcon: formData.get("remove_icon") === "on",
  });

  if (result.ok) {
    revalidatePath("/", "layout");
  }

  redirectWithMessage(result.ok ? "success" : "error", result.message);
}

function getIconFile(formData: FormData): File | null {
  const value = formData.get("icon");
  return value instanceof File ? value : null;
}

function redirectWithMessage(
  tone: "error" | "success",
  message: string,
): never {
  const params = new URLSearchParams();
  params.set(tone, message);
  redirect(`${PERSONALIZATION_PATH}?${params.toString()}`);
}

