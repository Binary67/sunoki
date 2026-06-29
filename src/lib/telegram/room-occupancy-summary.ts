import { formatBookingDate, parseBookingDate } from "../booking-dates";
import {
  GUEST_ROOM_LEVELS,
  GUEST_ROOM_NUMBERS,
  listGuestProfiles,
  type GuestProfile,
} from "../guest-profiles";

const GUEST_ROOM_SET = new Set(
  GUEST_ROOM_LEVELS.flatMap((level) =>
    GUEST_ROOM_NUMBERS.map((roomNumber) => `${level}-${roomNumber}`),
  ),
);

type AssignedRoomGuestProfile = GuestProfile & {
  roomNumber: string;
};

export function buildRoomOccupancyTelegramSummary(now = new Date()): string {
  const today = formatBookingDate(now);
  const occupiedGuests = listGuestProfiles("checked_in", today)
    .filter(hasKnownRoom)
    .sort(compareOccupiedGuests);
  const title = `Room Occupancy for ${formatDisplayDate(today)}`;

  if (occupiedGuests.length === 0) {
    return [title, "No occupied rooms."].join("\n\n");
  }

  return [
    title,
    occupiedGuests
      .map(
        (guest, index) =>
          `${index + 1}. Room ${guest.roomNumber} - ${guest.name} - Stay ${formatValue(
            guest.checkInDate,
          )} to ${formatValue(guest.checkoutDate)}`,
      )
      .join("\n"),
  ].join("\n\n");
}

function hasKnownRoom(
  profile: GuestProfile,
): profile is AssignedRoomGuestProfile {
  return Boolean(profile.roomNumber && GUEST_ROOM_SET.has(profile.roomNumber));
}

function compareOccupiedGuests(
  a: AssignedRoomGuestProfile,
  b: AssignedRoomGuestProfile,
): number {
  const roomOrder = a.roomNumber.localeCompare(b.roomNumber, undefined, {
    numeric: true,
  });
  if (roomOrder !== 0) return roomOrder;

  const nameOrder = a.name.localeCompare(b.name, undefined, {
    sensitivity: "base",
  });
  return nameOrder || a.id - b.id;
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
