"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/src/lib/admin-auth";
import { createGuestProfile } from "@/src/lib/guest-profiles";

const GUEST_PROFILE_PATH = "/admin/guest-profile";

export async function createGuestProfileAction(
  formData: FormData,
): Promise<void> {
  await requireAdminUser();

  const result = createGuestProfile(formData);
  if (!result.ok) {
    redirectWithMessage("error", result.message, true);
  }

  revalidatePath(GUEST_PROFILE_PATH);
  redirectWithMessage("success", "Guest profile saved");
}

function redirectWithMessage(
  tone: "error" | "success",
  message: string,
  showForm = false,
): never {
  const params = new URLSearchParams();
  if (showForm) params.set("new", "1");
  params.set(tone, message);
  redirect(`${GUEST_PROFILE_PATH}?${params.toString()}`);
}
