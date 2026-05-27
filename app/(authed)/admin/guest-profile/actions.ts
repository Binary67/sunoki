"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/src/lib/admin-auth";
import {
  updateGuestBookingStatus,
  type GuestBookingStatusField,
  type GuestBookingType,
} from "@/src/lib/guest-bookings";
import {
  createGuestProfile,
  deleteGuestProfile,
  getGuestProfileStatus,
  setGuestProfileStatus,
  toggleGuestProfileUserAccess,
  type GuestProfileFilterStatus,
  updateGuestProfile,
} from "@/src/lib/guest-profiles";

const GUEST_PROFILE_PATH = "/admin/guest-profile";
const USERS_DATA_PATH = "/admin/data/users";

export async function createGuestProfileAction(
  formData: FormData,
): Promise<void> {
  await requireAdminUser();

  const result = createGuestProfile(formData);
  if (!result.ok) {
    redirectToGuestProfileList("error", result.message, true);
  }

  revalidatePath(GUEST_PROFILE_PATH);
  revalidatePath(USERS_DATA_PATH);
  redirectToGuestProfileList("success", "Guest profile saved");
}

export async function updateGuestProfileAction(
  formData: FormData,
): Promise<void> {
  const user = await requireAdminUser();

  const profileId = getProfileId(formData);
  if (!isValidProfileId(profileId)) {
    redirectToGuestProfileList("error", "Choose a valid guest profile.");
  }

  const result = updateGuestProfile(profileId, formData, user);
  if (result.ok) {
    revalidatePath(GUEST_PROFILE_PATH);
    revalidatePath(`${GUEST_PROFILE_PATH}/${profileId}`);
    revalidatePath(USERS_DATA_PATH);
  }

  redirectToGuestProfileDetail(
    profileId,
    result.ok ? "success" : "error",
    result.ok ? (result.message ?? "Guest profile updated.") : result.message,
    !result.ok,
  );
}

export async function deleteGuestProfileAction(
  formData: FormData,
): Promise<void> {
  const user = await requireAdminUser();

  const profileId = getProfileId(formData);
  if (!isValidProfileId(profileId)) {
    redirectToGuestProfileList("error", "Choose a valid guest profile.");
  }

  if (user.role !== "superadmin") {
    redirectToGuestProfileDetail(
      profileId,
      "error",
      "Only super admins can delete guest profiles.",
    );
  }

  const status = getGuestProfileStatus(readFormText(formData, "status"));
  const result = deleteGuestProfile(profileId);
  if (result.ok) {
    revalidatePath(GUEST_PROFILE_PATH);
    revalidatePath(`${GUEST_PROFILE_PATH}/${profileId}`);
    revalidatePath(USERS_DATA_PATH);
    redirectToGuestProfileList("success", "Guest profile deleted", false, status);
  }

  redirectToGuestProfileDetail(profileId, "error", result.message);
}

export async function setGuestProfileStatusAction(
  formData: FormData,
): Promise<void> {
  const user = await requireAdminUser();

  const profileId = getProfileId(formData);
  if (!isValidProfileId(profileId)) {
    redirectToGuestProfileList("error", "Choose a valid guest profile.");
  }

  const status = readFormText(formData, "targetStatus");
  if (status !== "checked_in" && status !== "incoming") {
    redirectToGuestProfileDetail(
      profileId,
      "error",
      "Choose a valid check-in status.",
    );
  }

  const result = setGuestProfileStatus(profileId, status, user);
  if (result.ok) {
    revalidatePath(GUEST_PROFILE_PATH);
    revalidatePath(`${GUEST_PROFILE_PATH}/${profileId}`);
    revalidatePath(USERS_DATA_PATH);
  }

  redirectToGuestProfileDetail(
    profileId,
    result.ok ? "success" : "error",
    result.ok
      ? (result.message ??
        (status === "checked_in"
          ? "Guest checked in."
          : "Guest check-in undone."))
      : result.message,
  );
}

export async function toggleGuestProfileUserAccessAction(
  formData: FormData,
): Promise<void> {
  const user = await requireAdminUser();

  const profileId = getProfileId(formData);
  if (!isValidProfileId(profileId)) {
    redirectToGuestProfileList("error", "Choose a valid guest profile.");
  }

  const result = toggleGuestProfileUserAccess(profileId, user);
  if (result.ok) {
    revalidatePath(GUEST_PROFILE_PATH);
    revalidatePath(`${GUEST_PROFILE_PATH}/${profileId}`);
    revalidatePath(USERS_DATA_PATH);
  }

  redirectToGuestProfileDetail(
    profileId,
    result.ok ? "success" : "error",
    result.message,
  );
}

export async function updateGuestBookingStatusAction(
  formData: FormData,
): Promise<void> {
  await requireAdminUser();

  const profileId = getProfileId(formData);
  if (!isValidProfileId(profileId)) {
    redirectToGuestProfileList("error", "Choose a valid guest profile.");
  }

  const bookingId = Number(formData.get("bookingId"));
  const type = readBookingType(formData);
  const field = readBookingStatusField(formData);
  if (!type || !field || !Number.isInteger(bookingId) || bookingId <= 0) {
    redirectToGuestProfileDetail(profileId, "error", "Choose a valid booking.");
  }

  const result = updateGuestBookingStatus({
    bookingId,
    checked: readFormText(formData, "checked") === "1",
    field,
    profileId,
    type,
  });
  if (result.ok) {
    revalidatePath("/");
    revalidatePath(GUEST_PROFILE_PATH);
    revalidatePath(`${GUEST_PROFILE_PATH}/${profileId}`);
  }

  redirectToGuestProfileDetail(
    profileId,
    result.ok ? "success" : "error",
    result.message,
  );
}

function redirectToGuestProfileList(
  tone: "error" | "success",
  message: string,
  showForm = false,
  status: GuestProfileFilterStatus = "incoming",
): never {
  const params = new URLSearchParams();
  if (showForm) params.set("new", "1");
  if (status !== "incoming") params.set("status", status);
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

function readBookingType(formData: FormData): GuestBookingType | null {
  const value = readFormText(formData, "bookingType");
  return value === "facility" || value === "service" ? value : null;
}

function readBookingStatusField(
  formData: FormData,
): GuestBookingStatusField | null {
  const value = readFormText(formData, "field");
  return value === "read" || value === "done" ? value : null;
}

function isValidProfileId(profileId: number): boolean {
  return Number.isInteger(profileId) && profileId > 0;
}
