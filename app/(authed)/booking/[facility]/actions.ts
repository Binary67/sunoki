"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/src/lib/auth";
import { createFacilityBooking } from "@/src/lib/bookings";

export type BookingActionSuccess = {
  startTime: string;
  bookingDate: string;
  facilitySlug: string;
};

export type BookingActionState = {
  error?: string;
  success?: BookingActionSuccess;
  submissionId?: number;
};

export async function reserveFacilitySlotAction(
  prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const submissionId = (prev.submissionId ?? 0) + 1;
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Sign in before reserving a time slot.", submissionId };
  }

  const facilitySlug = String(formData.get("facility") ?? "");
  const bookingDate = String(formData.get("bookingDate") ?? "");
  const timeSlotId = Number(formData.get("timeSlotId"));

  const result = createFacilityBooking({
    userId: user.id,
    facilitySlug,
    bookingDate,
    timeSlotId,
  });

  if (!result.ok) return { error: result.error, submissionId };

  revalidatePath(`/booking/${facilitySlug}`);
  return {
    success: { startTime: result.startTime, bookingDate, facilitySlug },
    submissionId,
  };
}
