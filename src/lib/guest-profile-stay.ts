import {
  addBookingDays,
  formatBookingDate,
  isBookingDate,
} from "./booking-dates";
import { ADDITIONAL_DAYS_ADDON_NAME } from "./guest-profile-addon-constants";
import type { GuestStayAddon } from "./guest-profile-addons";
import {
  GUEST_BASE_STAY_DAYS,
  type GuestProfile,
  type GuestProfileFilterStatus,
} from "./guest-profile-types";

export type GuestStayDates = {
  checkInDate: string | null;
  checkOutDate: string | null;
};

export function getGuestProfileCheckoutDate(
  profile: Pick<GuestProfile, "checkoutDate">,
): string | null {
  return profile.checkoutDate;
}

export function getGuestProfileComputedStatus(
  profile: Pick<GuestProfile, "status" | "checkoutDate">,
  today = formatBookingDate(new Date()),
): GuestProfileFilterStatus {
  if (profile.status === "incoming") return "incoming";

  const checkoutDate = getGuestProfileCheckoutDate(profile);
  return checkoutDate && checkoutDate < today ? "checked_out" : "checked_in";
}

export function getGuestStayDates(
  checkInDate: string | null,
  addons: GuestStayAddon[],
): GuestStayDates {
  const checkOutDate = getGuestCheckoutDateFromStartDate(checkInDate, addons);
  if (!checkInDate || !checkOutDate) {
    return { checkInDate: null, checkOutDate: null };
  }

  return { checkInDate, checkOutDate };
}

function getGuestCheckoutDateFromStartDate(
  checkInDate: string | null,
  addons: GuestStayAddon[],
): string | null {
  if (!checkInDate || !isBookingDate(checkInDate)) {
    return null;
  }

  const additionalDays =
    addons.find((addon) => addon.serviceName === ADDITIONAL_DAYS_ADDON_NAME)
      ?.days ?? 0;

  return addBookingDays(checkInDate, GUEST_BASE_STAY_DAYS + additionalDays);
}
