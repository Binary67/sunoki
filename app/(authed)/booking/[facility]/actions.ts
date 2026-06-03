"use server";

import { getCurrentUser } from "@/src/lib/auth";

export type BookingActionState = {
  error?: string;
  submissionId?: number;
};

export async function reserveFacilitySlotAction(
  prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  void formData;
  const submissionId = (prev.submissionId ?? 0) + 1;
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Sign in before booking a facility.", submissionId };
  }
  return {
    error: "Facility bookings are managed by admin.",
    submissionId,
  };
}

export async function cancelFacilityBookingAction(
  prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  void formData;
  const submissionId = (prev.submissionId ?? 0) + 1;
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Sign in before cancelling a booking.", submissionId };
  }
  return {
    error: "Facility bookings are managed by admin.",
    submissionId,
  };
}
