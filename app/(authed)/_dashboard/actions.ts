"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/src/lib/admin-auth";
import {
  updateGuestBookingStatus,
  type GuestBookingStatusField,
  type GuestBookingType,
} from "@/src/lib/guest-bookings";

const GUEST_PROFILE_PATH = "/admin/guest-profile";

export async function updateRoomOccupancyGuestBookingStatusAction(
  formData: FormData,
): Promise<void> {
  await requireAdminUser();

  const roomNumber = readFormText(formData, "roomNumber");
  const profileId = getProfileId(formData);
  const bookingId = Number(formData.get("bookingId"));
  const type = readBookingType(formData);
  const field = readBookingStatusField(formData);

  if (
    isValidProfileId(profileId) &&
    type &&
    field &&
    Number.isInteger(bookingId) &&
    bookingId > 0
  ) {
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
  }

  redirectToRoomOccupancy(roomNumber);
}

function redirectToRoomOccupancy(roomNumber: string | undefined): never {
  const params = new URLSearchParams({ tab: "room-occupancy" });
  if (roomNumber) params.set("room", roomNumber);
  redirect(`/?${params.toString()}`);
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
