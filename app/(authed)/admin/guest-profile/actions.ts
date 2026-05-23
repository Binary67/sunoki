"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/src/lib/admin-auth";
import {
  checkInGuestProfile,
  createGuestProfile,
  deleteGuestProfile,
  getGuestProfileStatus,
  type GuestProfileStatus,
  updateGuestProfile,
} from "@/src/lib/guest-profiles";

const GUEST_PROFILE_PATH = "/admin/guest-profile";

export async function createGuestProfileAction(
  formData: FormData,
): Promise<void> {
  await requireAdminUser();

  const result = createGuestProfile(formData);
  if (!result.ok) {
    redirectToGuestProfileList("error", result.message, true);
  }

  revalidatePath(GUEST_PROFILE_PATH);
  redirectToGuestProfileList("success", "Guest profile saved");
}

export async function updateGuestProfileAction(
  formData: FormData,
): Promise<void> {
  await requireAdminUser();

  const profileId = getProfileId(formData);
  if (!isValidProfileId(profileId)) {
    redirectToGuestProfileList("error", "Choose a valid guest profile.");
  }

  const result = updateGuestProfile(profileId, formData);
  if (result.ok) {
    revalidatePath(GUEST_PROFILE_PATH);
    revalidatePath(`${GUEST_PROFILE_PATH}/${profileId}`);
  }

  redirectToGuestProfileDetail(
    profileId,
    result.ok ? "success" : "error",
    result.ok ? "Guest profile updated" : result.message,
    !result.ok,
  );
}

export async function deleteGuestProfileAction(
  formData: FormData,
): Promise<void> {
  await requireAdminUser();

  const profileId = getProfileId(formData);
  if (!isValidProfileId(profileId)) {
    redirectToGuestProfileList("error", "Choose a valid guest profile.");
  }

  const status = getGuestProfileStatus(readFormText(formData, "status"));
  const result = deleteGuestProfile(profileId);
  if (result.ok) {
    revalidatePath(GUEST_PROFILE_PATH);
    revalidatePath(`${GUEST_PROFILE_PATH}/${profileId}`);
    redirectToGuestProfileList("success", "Guest profile deleted", false, status);
  }

  redirectToGuestProfileDetail(profileId, "error", result.message);
}

export async function checkInGuestProfileAction(
  formData: FormData,
): Promise<void> {
  await requireAdminUser();

  const profileId = getProfileId(formData);
  if (!isValidProfileId(profileId)) {
    redirectToGuestProfileList("error", "Choose a valid guest profile.");
  }

  const result = checkInGuestProfile(profileId);
  if (result.ok) {
    revalidatePath(GUEST_PROFILE_PATH);
    revalidatePath(`${GUEST_PROFILE_PATH}/${profileId}`);
  }

  redirectToGuestProfileDetail(
    profileId,
    result.ok ? "success" : "error",
    result.ok ? "Guest checked in" : result.message,
  );
}

function redirectToGuestProfileList(
  tone: "error" | "success",
  message: string,
  showForm = false,
  status: GuestProfileStatus = "not_checked_in",
): never {
  const params = new URLSearchParams();
  if (showForm) params.set("new", "1");
  if (status === "checked_in") params.set("status", status);
  params.set(tone, message);
  redirect(`${GUEST_PROFILE_PATH}?${params.toString()}`);
}

function redirectToGuestProfileDetail(
  profileId: number,
  tone: "error" | "success",
  message: string,
  showEdit = false,
): never {
  const params = new URLSearchParams();
  if (showEdit) params.set("edit", "1");
  params.set(tone, message);
  redirect(`${GUEST_PROFILE_PATH}/${profileId}?${params.toString()}`);
}

function getProfileId(formData: FormData): number {
  const raw = formData.get("profileId");
  return typeof raw === "string" ? Number(raw) : NaN;
}

function readFormText(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

function isValidProfileId(profileId: number): boolean {
  return Number.isInteger(profileId) && profileId > 0;
}
