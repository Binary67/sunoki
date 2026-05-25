import { isBookingDate } from "@/src/lib/booking-dates";
import {
  hasUnreadGuestBookings,
  listGuestBookingChecklist,
  type GuestBookingChecklistItem,
} from "@/src/lib/guest-bookings";
import {
  GUEST_ROOM_LEVELS,
  GUEST_ROOM_NUMBERS,
  getGuestProfileCheckoutDate,
  listGuestProfileAddons,
  type GuestProfile,
  type GuestProfileAddon,
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

export function getRoomOccupancy(
  checkedInProfiles: GuestProfile[],
  incomingProfiles: GuestProfile[],
  today: string,
): {
  rooms: Map<string, RoomOccupancyRoom>;
  unassignedCount: number;
} {
  const rooms = new Map<string, RoomOccupancyRoom>();
  let unassignedCount = 0;

  for (const profile of checkedInProfiles) {
    if (!profile.roomNumber || !GUEST_ROOM_SET.has(profile.roomNumber)) {
      unassignedCount += 1;
      continue;
    }

    const addons = listGuestProfileAddons(profile.id);
    const room = getRoomOccupancyRoom(rooms, profile.roomNumber);
    room.currentGuests.push({
      addons,
      bookings: listGuestBookingChecklist(profile.id),
      checkoutDate: getGuestProfileCheckoutDate(profile, addons),
      hasUnreadBookings: hasUnreadGuestBookings(profile.id),
      profile,
    });
  }

  for (const profile of incomingProfiles) {
    const edd = profile.expectedDeliveryDate;
    if (
      !profile.roomNumber ||
      !GUEST_ROOM_SET.has(profile.roomNumber) ||
      !edd ||
      !isBookingDate(edd) ||
      edd < today
    ) {
      continue;
    }

    const room = getRoomOccupancyRoom(rooms, profile.roomNumber);
    if (room.nextGuest && !isEarlierIncomingGuest(profile, room.nextGuest.profile)) {
      continue;
    }

    const addons = listGuestProfileAddons(profile.id);
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
  const aEdd = a.expectedDeliveryDate;
  const bEdd = b.expectedDeliveryDate;

  if (aEdd && bEdd && aEdd !== bEdd) return aEdd < bEdd;
  return a.id < b.id;
}
