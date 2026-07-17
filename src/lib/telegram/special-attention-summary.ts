import {
  addBookingDays,
  formatBookingDate,
  isBookingDate,
  parseBookingDate,
} from "../booking-dates";
import { getUpcomingBookings, type UpcomingBooking } from "../bookings";
import { listGuestProfiles, type GuestProfile } from "../guest-profiles";
import type { ServiceBookingKey } from "../service-bookings/catalog";

const REPORT_WINDOW_DAYS = 7;
const IMPORTANT_EVENT_SERVICE_KEYS = [
  "full_moon_ceremony",
  "candlelight_dinner",
] as const satisfies readonly ServiceBookingKey[];

type GuestAttentionItem = {
  id: number;
  name: string;
  roomNumber: string | null;
  date: string;
  systemCheckedIn: boolean;
};

export function buildSpecialAttentionTelegramSummary(
  now = new Date(),
): string {
  const today = formatBookingDate(now);
  const throughDate = addBookingDays(today, REPORT_WINDOW_DAYS - 1);
  const checkedInProfiles = listGuestProfiles("checked_in", today);
  const upcomingCheckouts = checkedInProfiles
    .flatMap((profile) =>
      toGuestAttentionItem(profile, profile.checkoutDate, false, today, throughDate),
    )
    .sort(compareGuestAttentionItems);
  const upcomingCheckIns = [
    ...listGuestProfiles("incoming", today).flatMap((profile) =>
      toGuestAttentionItem(profile, profile.checkInDate, false, today, throughDate),
    ),
    ...checkedInProfiles.flatMap((profile) =>
      profile.checkInDate === today
        ? [toGuestAttentionItemForDate(profile, today, true)]
        : [],
    ),
  ].sort(compareGuestAttentionItems);
  const importantEvents = getUpcomingBookings(
    {
      bookingDateFrom: today,
      bookingDateTo: throughDate,
      serviceKeys: [...IMPORTANT_EVENT_SERVICE_KEYS],
    },
    parseBookingDate(today),
  );

  const title = [
    "Special Attention",
    `${formatDisplayDate(today)} - ${formatDisplayDate(throughDate)}`,
  ].join("\n");
  const sections = [
    formatGuestSection("Upcoming check out", upcomingCheckouts),
    formatGuestSection("Upcoming check in", upcomingCheckIns, true),
    formatImportantEventSection(importantEvents),
  ].join("\n\n----------\n\n");

  return [title, sections].join("\n\n");
}

function toGuestAttentionItem(
  profile: GuestProfile,
  date: string | null,
  systemCheckedIn: boolean,
  dateFrom: string,
  dateTo: string,
): GuestAttentionItem[] {
  if (!date || !isBookingDate(date) || date < dateFrom || date > dateTo) {
    return [];
  }

  return [toGuestAttentionItemForDate(profile, date, systemCheckedIn)];
}

function toGuestAttentionItemForDate(
  profile: GuestProfile,
  date: string,
  systemCheckedIn: boolean,
): GuestAttentionItem {
  return {
    id: profile.id,
    name: profile.name,
    roomNumber: profile.roomNumber,
    date,
    systemCheckedIn,
  };
}

function formatGuestSection(
  title: string,
  guests: GuestAttentionItem[],
  showSystemStatus = false,
): string {
  if (guests.length === 0) return `${title}\nNone`;

  return [
    title,
    ...guests.map((guest, index) => {
      const systemStatus =
        showSystemStatus && guest.systemCheckedIn
          ? " (System status: Checked In)"
          : "";
      return `${index + 1}. ${formatRoomNumber(guest.roomNumber)} - ${
        guest.name
      } - ${formatDisplayDate(guest.date)}${systemStatus}`;
    }),
  ].join("\n");
}

function formatImportantEventSection(events: UpcomingBooking[]): string {
  const title = "Upcoming important event";
  if (events.length === 0) return `${title}\nNone`;

  return [
    title,
    ...events.map(
      (event, index) =>
        `${index + 1}. ${event.name}\n   ${formatDisplayDate(
          event.bookingDate,
        )} - ${formatDisplayTime(event.startTime)} - ${formatRoomNumber(
          event.roomNumber,
        )}`,
    ),
  ].join("\n");
}

function compareGuestAttentionItems(
  a: GuestAttentionItem,
  b: GuestAttentionItem,
): number {
  const dateOrder = a.date.localeCompare(b.date);
  if (dateOrder !== 0) return dateOrder;

  const roomOrder = compareNullableText(a.roomNumber, b.roomNumber);
  if (roomOrder !== 0) return roomOrder;

  const nameOrder = a.name.localeCompare(b.name, undefined, {
    sensitivity: "base",
  });
  return nameOrder || a.id - b.id;
}

function compareNullableText(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  if (a && b) {
    return a.localeCompare(b, undefined, { numeric: true });
  }
  if (a) return -1;
  if (b) return 1;
  return 0;
}

function formatDisplayDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${Number(day)}/${Number(month)}/${year.slice(-2)}`;
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

function formatRoomNumber(value: string | null): string {
  return value?.trim() || "XXXX";
}
