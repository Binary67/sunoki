import { formatBookingDate } from "../booking-dates";
import { db } from "../db";
import { UNLIMITED_PACKAGE_SERVICE_QUANTITY } from "../package-entitlements";
import {
  BOOKABLE_PACKAGE_SERVICES,
  type BookablePackageService,
  type ServiceBookingKey,
} from "../service-bookings/catalog";
import { getServiceEntitlement } from "../service-bookings/entitlements";
import type { GuestProfileServiceRow } from "../service-bookings/repository";

type GuestServiceSummaryProfile = GuestProfileServiceRow & {
  name: string;
  roomNumber: string | null;
  checkInDate: string | null;
  checkoutDate: string | null;
  userId: number | null;
};

type GuestServiceSummaryBooking = {
  id: number;
  serviceKey: ServiceBookingKey;
  serviceName: string;
  bookingDate: string;
  bookingTime: string;
  isDone: boolean;
};

type ServiceSummaryGroup = {
  service: BookablePackageService;
  totalQuantity: number;
  bookings: GuestServiceSummaryBooking[];
  notBookedCount: number | null;
};

export function buildGuestServiceTelegramSummary(
  roomNumber: string,
  now = new Date(),
): string {
  const requestedRoomNumber = roomNumber.trim();
  if (!requestedRoomNumber) {
    return "Usage: /summary <room_number>";
  }

  const profiles = listCurrentGuestProfilesByRoom(
    requestedRoomNumber,
    formatBookingDate(now),
  );
  if (profiles.length === 0) {
    return `No checked-in guest found for room ${requestedRoomNumber}.`;
  }
  if (profiles.length > 1) {
    return `More than one checked-in guest found for room ${requestedRoomNumber}. Please check the guest profiles.`;
  }

  const profile = profiles[0];
  const userId = profile.userId;
  if (!userId) {
    return `Guest ${profile.name} in room ${requestedRoomNumber} has no linked account.`;
  }

  const serviceGroups = buildServiceSummaryGroups(
    profile,
    userId,
    listGuestServiceBookings(profile.id),
  );

  return [
    `Good day ${profile.name}`,
    "This is the updated summary of service list.",
    [
      `Update for ${profile.name} [${formatDisplayDate(
        profile.checkInDate,
      )} to ${formatDisplayDate(profile.checkoutDate)}]`,
      "SERVICES",
      "",
      formatServiceGroups(serviceGroups),
    ].join("\n"),
  ].join("\n\n");
}

function listCurrentGuestProfilesByRoom(
  roomNumber: string,
  today: string,
): GuestServiceSummaryProfile[] {
  return db
    .prepare(
      `
        SELECT
          id,
          name,
          status,
          room_number AS roomNumber,
          check_in_date AS checkInDate,
          checkout_date AS checkoutDate,
          user_id AS userId,
          package_entitlement_snapshot_json AS packageEntitlementSnapshotJson
        FROM guest_profiles
        WHERE room_number = ?
          AND status = 'checked_in'
          AND (checkout_date IS NULL OR checkout_date >= ?)
        ORDER BY id ASC
      `,
    )
    .all(roomNumber, today) as GuestServiceSummaryProfile[];
}

function listGuestServiceBookings(
  guestProfileId: number,
): GuestServiceSummaryBooking[] {
  const rows = db
    .prepare(
      `
        SELECT
          id,
          service_key AS serviceKey,
          service_name AS serviceName,
          booking_date AS bookingDate,
          booking_time AS bookingTime,
          admin_done AS adminDone
        FROM guest_service_bookings
        WHERE guest_profile_id = ?
          AND status = 'booked'
        ORDER BY booking_date ASC, booking_time ASC, id ASC
      `,
    )
    .all(guestProfileId) as (Omit<GuestServiceSummaryBooking, "isDone"> & {
      adminDone: number;
    })[];

  return rows.map((row) => ({
    id: Number(row.id),
    serviceKey: row.serviceKey,
    serviceName: row.serviceName,
    bookingDate: row.bookingDate,
    bookingTime: row.bookingTime,
    isDone: row.adminDone === 1,
  }));
}

function buildServiceSummaryGroups(
  profile: GuestServiceSummaryProfile,
  userId: number,
  bookings: GuestServiceSummaryBooking[],
): ServiceSummaryGroup[] {
  const bookingsByServiceKey = groupBookingsByServiceKey(bookings);

  return BOOKABLE_PACKAGE_SERVICES.map((service) => {
    const entitlement = getServiceEntitlement(
      userId,
      profile.id,
      profile,
      service,
    );
    const serviceBookings = bookingsByServiceKey.get(service.key) ?? [];
    const notBookedCount =
      entitlement.totalQuantity === UNLIMITED_PACKAGE_SERVICE_QUANTITY
        ? null
        : Math.max(0, entitlement.totalQuantity - serviceBookings.length);

    return {
      service,
      totalQuantity: entitlement.totalQuantity,
      bookings: serviceBookings,
      notBookedCount,
    };
  }).filter(shouldShowServiceGroup);
}

function groupBookingsByServiceKey(
  bookings: GuestServiceSummaryBooking[],
): Map<ServiceBookingKey, GuestServiceSummaryBooking[]> {
  const bookingsByServiceKey = new Map<
    ServiceBookingKey,
    GuestServiceSummaryBooking[]
  >();

  for (const booking of bookings) {
    const serviceBookings = bookingsByServiceKey.get(booking.serviceKey);
    if (serviceBookings) {
      serviceBookings.push(booking);
    } else {
      bookingsByServiceKey.set(booking.serviceKey, [booking]);
    }
  }

  return bookingsByServiceKey;
}

function shouldShowServiceGroup(group: ServiceSummaryGroup): boolean {
  return (
    group.bookings.length > 0 ||
    (group.totalQuantity !== UNLIMITED_PACKAGE_SERVICE_QUANTITY &&
      group.totalQuantity > 0)
  );
}

function formatServiceGroups(groups: ServiceSummaryGroup[]): string {
  if (groups.length === 0) {
    return "No service entitlements or active service bookings found.";
  }

  return groups
    .map((group, index) =>
      [
        `${formatListLabel(index)}. ${formatServiceGroupTitle(group)}`,
        ...formatServiceGroupLines(group),
      ].join("\n"),
    )
    .join("\n\n");
}

function formatServiceGroupLines(group: ServiceSummaryGroup): string[] {
  const lines = group.bookings.map(
    (booking) =>
      ` • ${formatDisplayDate(booking.bookingDate)}, ${formatDisplayTime(
        booking.bookingTime,
      )}${booking.isDone ? " ✅" : " - pending"}`,
  );

  if (group.notBookedCount !== null && group.notBookedCount > 0) {
    lines.push(` • ${group.notBookedCount} not booked yet`);
  }

  return lines;
}

function formatListLabel(index: number): string {
  return String.fromCharCode(65 + index);
}

function formatServiceGroupTitle(group: ServiceSummaryGroup): string {
  if (group.totalQuantity === UNLIMITED_PACKAGE_SERVICE_QUANTITY) {
    return group.service.name;
  }

  return `${group.service.name} x${group.totalQuantity}`;
}

function formatDisplayDate(value: string | null): string {
  if (!value) return "-";

  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year.slice(-2)}`;
}

function formatDisplayTime(value: string): string {
  const [hourPart, minutePart] = value.split(":");
  const hour = Number(hourPart);
  if (!Number.isInteger(hour)) return value;

  const period = hour >= 12 ? "pm" : "am";
  const displayHour = hour % 12 || 12;
  return minutePart === "00"
    ? `${displayHour}${period}`
    : `${displayHour}:${minutePart}${period}`;
}
