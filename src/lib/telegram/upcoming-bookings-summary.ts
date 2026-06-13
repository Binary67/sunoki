import {
  addBookingDays,
  formatBookingDate,
  parseBookingDate,
} from "../booking-dates";
import { getUpcomingBookings, type UpcomingBooking } from "../bookings";
import {
  KITCHEN_PREP_SERVICE_KEYS,
  listKitchenServicePrepBookings,
  type KitchenServicePrepBooking,
} from "../service-bookings/kitchen-prep";

const KITCHEN_PREP_SERVICE_KEY_SET = new Set<string>(
  KITCHEN_PREP_SERVICE_KEYS,
);

type KitchenServicePrepGroup = {
  key: string;
  guestName: string;
  roomNumber: string | null;
  bookings: KitchenServicePrepBooking[];
};

type UpcomingBookingGroup = {
  key: string;
  name: string;
  bookings: UpcomingBooking[];
};

type TelegramBookingSummaryInput = {
  title: string;
  bookingDate: string;
  bookingCutoff: Date;
};

export function buildUpcomingBookingsTelegramSummary(now = new Date()): string {
  const bookingDate = addBookingDays(formatBookingDate(now), 1);
  return buildBookingsTelegramSummary({
    title: `Upcoming Bookings for ${formatDisplayDate(bookingDate)}`,
    bookingDate,
    bookingCutoff: now,
  });
}

export function buildTodayBookingsTelegramSummary(now = new Date()): string {
  const bookingDate = formatBookingDate(now);
  return buildBookingsTelegramSummary({
    title: `Today's Bookings for ${formatDisplayDate(bookingDate)}`,
    bookingDate,
    bookingCutoff: parseBookingDate(bookingDate),
  });
}

function buildBookingsTelegramSummary({
  title,
  bookingDate,
  bookingCutoff,
}: TelegramBookingSummaryInput): string {
  const bookings = getUpcomingBookings(
    { bookingDateFrom: bookingDate, bookingDateTo: bookingDate },
    bookingCutoff,
  ).filter((booking) => !isKitchenPrepBooking(booking));
  const kitchenPrepBookings = listKitchenServicePrepBookings({
    bookingDateFrom: bookingDate,
    bookingDateTo: bookingDate,
  });

  return [
    title,
    formatFacilitiesAndServicesSection(bookings),
    formatKitchenServicePrepSection(kitchenPrepBookings),
  ].join("\n\n");
}

function isKitchenPrepBooking(booking: UpcomingBooking): boolean {
  return (
    booking.serviceKey !== null &&
    KITCHEN_PREP_SERVICE_KEY_SET.has(booking.serviceKey)
  );
}

function formatFacilitiesAndServicesSection(bookings: UpcomingBooking[]): string {
  if (bookings.length === 0) {
    return "Facilities & Services\nNo facility or non-kitchen service bookings.";
  }

  return [
    "Facilities & Services",
    ...groupUpcomingBookings(bookings).map((group, index) =>
      [
        `${index + 1}. ${group.name}`,
        ...group.bookings.map(
          (booking) =>
            `   ${booking.startTime} - ${booking.guestName} - Room ${formatValue(
              booking.roomNumber,
            )}`,
        ),
      ].join("\n"),
    ),
  ].join("\n");
}

function formatKitchenServicePrepSection(
  bookings: KitchenServicePrepBooking[],
): string {
  if (bookings.length === 0) {
    return "Kitchen Service Prep\nNo kitchen service prep bookings.";
  }

  return [
    "Kitchen Service Prep",
    ...groupKitchenServicePrepBookings(bookings).map((group, index) =>
      [
        `${index + 1}. ${formatGuestRoom(group.guestName, group.roomNumber)}`,
        ...group.bookings.map(
          (booking) => `   ${booking.bookingTime} - ${booking.serviceName}`,
        ),
      ].join("\n"),
    ),
  ].join("\n");
}

function groupUpcomingBookings(bookings: UpcomingBooking[]): UpcomingBookingGroup[] {
  const groups = new Map<string, UpcomingBookingGroup>();

  for (const booking of bookings) {
    const key = `${booking.type}:${booking.name}`;
    const group = groups.get(key);

    if (group) {
      group.bookings.push(booking);
      continue;
    }

    groups.set(key, {
      key,
      name: `${booking.name} (${formatBookingType(booking)})`,
      bookings: [booking],
    });
  }

  return Array.from(groups.values());
}

function groupKitchenServicePrepBookings(
  bookings: KitchenServicePrepBooking[],
): KitchenServicePrepGroup[] {
  const groups = new Map<string, KitchenServicePrepGroup>();

  for (const booking of bookings) {
    const key = [
      booking.bookingDate,
      booking.roomNumber ?? "",
      booking.guestProfileId,
    ].join(":");
    const group = groups.get(key);

    if (group) {
      group.bookings.push(booking);
      continue;
    }

    groups.set(key, {
      key,
      guestName: booking.guestName,
      roomNumber: booking.roomNumber,
      bookings: [booking],
    });
  }

  return Array.from(groups.values());
}

function formatBookingType(booking: UpcomingBooking): string {
  return booking.type === "facility" ? "Facility" : "Service";
}

function formatGuestRoom(guestName: string, roomNumber: string | null): string {
  return roomNumber ? `${guestName} - Room ${roomNumber}` : guestName;
}

function formatDisplayDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parseBookingDate(value));
}

function formatValue(value: string | null | undefined): string {
  return value || "-";
}
