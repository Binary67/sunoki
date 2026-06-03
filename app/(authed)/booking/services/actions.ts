"use server";

import { getCurrentUser } from "@/src/lib/auth";

export type ServiceBookingActionState = {
  error?: string;
  submissionId?: number;
};

export async function bookServiceAction(
  prev: ServiceBookingActionState,
  formData: FormData,
): Promise<ServiceBookingActionState> {
  void formData;
  const submissionId = (prev.submissionId ?? 0) + 1;
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Sign in before booking a service.", submissionId };
  }
  return {
    error: "Service bookings are managed by admin.",
    submissionId,
  };
}
