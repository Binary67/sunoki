import { db } from "./db";
import type { GuestProfileStatus } from "./guest-profile-types";

export const GUEST_BOOKING_CHECK_IN_REQUIRED_MESSAGE =
  "Booking is available after check-in.";

export function getGuestBookingProfileStatus(
  userId: number,
): GuestProfileStatus | null {
  const row = db
    .prepare(
      `
        SELECT status
        FROM guest_profiles
        WHERE user_id = ?
      `,
    )
    .get(userId) as { status: GuestProfileStatus } | undefined;

  return row?.status ?? null;
}
