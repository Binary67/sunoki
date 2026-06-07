import { isBookingDate } from "@/src/lib/booking-dates";
import {
  listGuestBookingChecklistsByProfileIds,
  listUnreadGuestBookingProfileIds,
  type GuestBookingChecklistItem,
} from "@/src/lib/guest-bookings";
import {
  listGuestProfileAddonsByProfileIds,
  type GuestProfileAddon,
} from "@/src/lib/guest-profile-addons";
import {
  GUEST_ROOM_LEVELS,
  GUEST_ROOM_NUMBERS,
  getGuestProfileCheckoutDate,
  type GuestProfile,
} from "@/src/lib/guest-profiles";

const GUEST_ROOM_SET = new Set(
  GUEST_ROOM_LEVELS.flatMap((level) =>
    GUEST_ROOM_NUMBERS.map((roomNumber) => `${level}-${roomNumber}`),
  ),
);

export const TOTAL_GUEST_ROOMS = GUEST_ROOM_SET.size;

export type RoomOccupancyGuest = {
  addons: GuestProfileAddon[];
  bookings: GuestBookingChecklistItem[];
  checkoutDate: string | null;
  hasUnreadBookings: boolean;
  profile: GuestProfile;
};

export type RoomOccupancyRoom = {
  currentGuests: RoomOccupancyGuest[];
  nextGuest: RoomOccupancyGuest | null;
};

type RoomAssignedGuestProfile = GuestProfile & {
  roomNumber: string;
};

export function getRoomOccupancy(
  checkedInProfiles: GuestProfile[],
  incomingProfiles: GuestProfile[],
  today: string,
): {
  rooms: Map<string, RoomOccupancyRoom>;
  unassignedCount: number;
} {
  const rooms = new Map<string, RoomOccupancyRoom>();
  const currentProfiles: RoomAssignedGuestProfile[] = [];
  const nextIncomingProfilesByRoom = new Map<string, RoomAssignedGuestProfile>();
  let unassignedCount = 0;

  for (const profile of checkedInProfiles) {
    if (!hasKnownRoom(profile)) {
      unassignedCount += 1;
      continue;
    }

    currentProfiles.push(profile);
  }

  for (const profile of incomingProfiles) {
    const checkInDate = profile.checkInDate;
    if (
      !hasKnownRoom(profile) ||
      !checkInDate ||
      !isBookingDate(checkInDate) ||
      checkInDate < today
    ) {
      continue;
    }

    const nextGuest = nextIncomingProfilesByRoom.get(profile.roomNumber);
    if (nextGuest && !isEarlierIncomingGuest(profile, nextGuest)) {
      continue;
    }

    nextIncomingProfilesByRoom.set(profile.roomNumber, profile);
  }

  const nextIncomingProfiles = Array.from(nextIncomingProfilesByRoom.values());
  const currentProfileIds = currentProfiles.map((profile) => profile.id);
  const relevantProfileIds = [
    ...currentProfileIds,
    ...nextIncomingProfiles.map((profile) => profile.id),
  ];
  const addonsByProfileId = listGuestProfileAddonsByProfileIds(relevantProfileIds);
  const bookingsByProfileId =
    listGuestBookingChecklistsByProfileIds(currentProfileIds);
  const unreadProfileIds = listUnreadGuestBookingProfileIds(currentProfileIds);

  for (const profile of currentProfiles) {
    const addons = addonsByProfileId.get(profile.id) ?? [];
    const room = getRoomOccupancyRoom(rooms, profile.roomNumber);
    room.currentGuests.push({
      addons,
      bookings: bookingsByProfileId.get(profile.id) ?? [],
      checkoutDate: getGuestProfileCheckoutDate(profile, addons),
      hasUnreadBookings: unreadProfileIds.has(profile.id),
      profile,
    });
  }

  for (const profile of nextIncomingProfiles) {
    const addons = addonsByProfileId.get(profile.id) ?? [];
    const room = getRoomOccupancyRoom(rooms, profile.roomNumber);
    room.nextGuest = {
      addons,
      bookings: [],
      checkoutDate: getGuestProfileCheckoutDate(profile, addons),
      hasUnreadBookings: false,
      profile,
    };
  }

  return { rooms, unassignedCount };
}

function hasKnownRoom(profile: GuestProfile): profile is RoomAssignedGuestProfile {
  return Boolean(profile.roomNumber && GUEST_ROOM_SET.has(profile.roomNumber));
}

function getRoomOccupancyRoom(
  rooms: Map<string, RoomOccupancyRoom>,
  roomNumber: string,
): RoomOccupancyRoom {
  const room = rooms.get(roomNumber);
  if (room) return room;

  const newRoom: RoomOccupancyRoom = { currentGuests: [], nextGuest: null };
  rooms.set(roomNumber, newRoom);
  return newRoom;
}

function isEarlierIncomingGuest(a: GuestProfile, b: GuestProfile): boolean {
  const aCheckInDate = a.checkInDate;
  const bCheckInDate = b.checkInDate;

  if (aCheckInDate && bCheckInDate && aCheckInDate !== bCheckInDate) {
    return aCheckInDate < bCheckInDate;
  }
  return a.id < b.id;
}
