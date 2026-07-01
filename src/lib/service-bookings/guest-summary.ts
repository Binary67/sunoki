import type { User } from "../db";
import {
  RELAXING_HAIR_WASH_SERVICE,
  type ServiceBookingKey,
} from "./catalog";
import { getServiceEntitlement } from "./entitlements";
import {
  getGuestProfileForServiceBooking,
  listActiveServiceBookings,
} from "./repository";

export type GuestServiceBooking = {
  id: number;
  serviceKey: ServiceBookingKey;
  serviceName: string;
  bookingDate: string;
  bookingTime: string;
  isUpcoming: boolean;
};

export type GuestServiceBookingSummary = {
  serviceKey: ServiceBookingKey;
  serviceName: string;
  packageQuantity: number;
  purchasedPerkQuantity: number;
  totalQuantity: number;
  bookedQuantity: number;
  remainingQuantity: number | null;
  bookings: GuestServiceBooking[];
};

export function getGuestServiceBookingSummary(
  user: User,
  now = new Date(),
): GuestServiceBookingSummary | null {
  if (user.role !== "guest") return null;

  const profile = getGuestProfileForServiceBooking(user.id);
  if (!profile || profile.status !== "checked_in") return null;

  const service = RELAXING_HAIR_WASH_SERVICE;
  const entitlement = getServiceEntitlement(
    user.id,
    profile.id,
    profile,
    service,
  );
  const bookings = listActiveServiceBookings(user.id, service.key, now);

  return {
    serviceKey: service.key,
    serviceName: service.name,
    ...entitlement,
    bookings,
  };
}
