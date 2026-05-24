"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/src/lib/auth";
import { createServiceBooking } from "@/src/lib/service-bookings";

export type ServiceBookingActionSuccess = {
  serviceName: string;
  bookingDate: string;
  bookingTime: string;
};

export type ServiceBookingActionState = {
  error?: string;
  success?: ServiceBookingActionSuccess;
  submissionId?: number;
};

export async function bookServiceAction(
  prev: ServiceBookingActionState,
  formData: FormData,
): Promise<ServiceBookingActionState> {
  const submissionId = (prev.submissionId ?? 0) + 1;
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Sign in before booking a service.", submissionId };
  }

  const serviceKey = String(formData.get("serviceKey") ?? "");
  const bookingDate = String(formData.get("bookingDate") ?? "");
  const bookingTime = String(formData.get("bookingTime") ?? "");
  const result = createServiceBooking({
    userId: user.id,
    serviceKey,
    bookingDate,
    bookingTime,
  });

  if (!result.ok) return { error: result.error, submissionId };

  revalidatePath("/booking/services");
  return {
    success: {
      serviceName: result.serviceName,
      bookingDate,
      bookingTime,
    },
    submissionId,
  };
}
