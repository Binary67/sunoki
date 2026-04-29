"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/src/lib/auth";
import { createFacilityBooking } from "@/src/lib/bookings";

export type BookingActionState = {
  error?: string;
  success?: string;
};

export async function reserveFacilitySlotAction(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in before reserving a time slot." };

  const facilitySlug = String(formData.get("facility") ?? "");
  const bookingDate = String(formData.get("bookingDate") ?? "");
  const timeSlotId = Number(formData.get("timeSlotId"));

  const result = createFacilityBooking({
    userId: user.id,
    facilitySlug,
    bookingDate,
    timeSlotId,
  });

  if (!result.ok) return { error: result.error };

  revalidatePath(`/booking/${facilitySlug}`);
  return { success: `Reserved for ${result.startTime}.` };
}
