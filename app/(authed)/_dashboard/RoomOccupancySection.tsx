import Link from "next/link";
import {
  GUEST_ROOM_LEVELS,
  GUEST_ROOM_NUMBERS,
} from "@/src/lib/guest-profiles";
import { TOTAL_GUEST_ROOMS, type RoomOccupancyRoom } from "./room-occupancy";

export default function RoomOccupancySection({
  occupancyByRoom,
  unassignedCount,
}: {
  occupancyByRoom: Map<string, RoomOccupancyRoom>;
  unassignedCount: number;
}) {
  const rooms = Array.from(occupancyByRoom.values());
  const occupiedRoomCount = rooms.filter(
    (room) => room.currentGuests.length > 0,
  ).length;
  const conflictRoomCount = rooms.filter(
    (room) => room.currentGuests.length > 1,
  ).length;
  const incomingRoomCount = rooms.filter((room) => room.nextGuest).length;

  return (
    <section className="mb-10">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">Room occupancy</h2>
          <p className="mt-1 text-sm text-ink/60">
            Checked-in guests and next incoming guests by assigned room.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          <span className="rounded-md bg-surface px-2.5 py-1.5 text-ink/60">
            {occupiedRoomCount} / {TOTAL_GUEST_ROOMS} occupied
          </span>
          <span className="rounded-md bg-sky-50 px-2.5 py-1.5 text-sky-800">
            {incomingRoomCount} incoming
          </span>
          {conflictRoomCount > 0 && (
            <span className="rounded-md bg-amber-50 px-2.5 py-1.5 text-amber-800">
              {conflictRoomCount} conflict
              {conflictRoomCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        {GUEST_ROOM_LEVELS.map((level) => {
          const occupiedOnLevel = GUEST_ROOM_NUMBERS.filter((roomNumber) =>
            Boolean(
              occupancyByRoom.get(`${level}-${roomNumber}`)?.currentGuests
                .length,
            ),
          ).length;

          return (
            <div
              key={level}
              className="rounded-lg border border-black/5 bg-white p-3 sm:p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-ink">
                  Level {level}
                </h3>
                <span className="text-xs text-ink/50">
                  {occupiedOnLevel} / {GUEST_ROOM_NUMBERS.length}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 xl:grid-cols-11">
                {GUEST_ROOM_NUMBERS.map((roomNumber) => {
                  const fullRoomNumber = `${level}-${roomNumber}`;
                  const roomDetails = occupancyByRoom.get(fullRoomNumber);

                  return (
                    <RoomTile
                      key={fullRoomNumber}
                      roomDetails={roomDetails}
                      roomNumber={fullRoomNumber}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {unassignedCount > 0 && (
        <Link
          href="/admin/guest-profile?status=checked_in"
          className="mt-4 inline-flex rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
        >
          {unassignedCount} checked-in guest
          {unassignedCount === 1 ? "" : "s"} without an assigned room
        </Link>
      )}
    </section>
  );
}

function RoomTile({
  roomDetails,
  roomNumber,
}: {
  roomDetails?: RoomOccupancyRoom;
  roomNumber: string;
}) {
  const guests = roomDetails?.currentGuests ?? [];
  const guestCount = guests.length;
  const occupied = guestCount > 0;
  const conflict = guestCount > 1;
  const primaryGuest = guests[0];
  const hasUnreadBookings = guests.some((guest) => guest.hasUnreadBookings);
  const nextGuest = roomDetails?.nextGuest ?? null;
  const actionable = occupied || Boolean(nextGuest);
  const stateText = conflict
    ? `${guestCount} guests`
    : occupied
      ? "Occupied"
      : "Available";
  const dotClass = conflict
    ? "bg-amber-500"
    : occupied
      ? "bg-emerald-500"
      : "bg-ink/25";
  const stateClass = conflict
    ? "border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-400 hover:bg-amber-100"
    : occupied
      ? "border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-300 hover:bg-emerald-100"
      : "border-black/5 bg-surface text-ink/55";
  const guestName = primaryGuest
    ? conflict
      ? `${primaryGuest.profile.name} + ${guestCount - 1} more`
      : primaryGuest.profile.name
    : "";
  const nextGuestText = nextGuest ? `Next ${nextGuest.profile.name}` : "";
  const stateLabel = (
    <span className="mt-1 flex items-center gap-1 text-[11px] font-medium">
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${dotClass}`}
      />
      {stateText}
    </span>
  );
  const content = (
    <>
      {hasUnreadBookings && (
        <span
          aria-label="Unread guest booking"
          className="absolute right-2 top-2 size-2.5 rounded-full bg-red-600 shadow-[0_0_0_3px_rgba(220,38,38,0.18)]"
        />
      )}
      <span className="font-semibold text-ink">{roomNumber}</span>
      {!primaryGuest && nextGuest && stateLabel}
      {primaryGuest && (
        <>
          <span className="mt-1 block truncate text-[11px] font-medium text-ink/80">
            {guestName}
          </span>
          <span className="mt-0.5 block truncate text-[10px] font-medium text-ink/55">
            Checkout {formatValue(primaryGuest.checkoutDate)}
          </span>
        </>
      )}
      {!primaryGuest && nextGuest && (
        <>
          <span className="mt-1 block text-[10px] font-semibold uppercase text-sky-700">
            Incoming
          </span>
          <span className="mt-0.5 block truncate text-[11px] font-medium text-ink/80">
            {nextGuest.profile.name}
          </span>
          <span className="mt-0.5 block truncate text-[10px] font-medium text-ink/55">
            EDD {formatValue(nextGuest.profile.expectedDeliveryDate)}
          </span>
        </>
      )}
      {primaryGuest && nextGuest && (
        <span className="mt-0.5 block truncate text-[10px] font-medium text-ink/55">
          {nextGuestText}
        </span>
      )}
      {(primaryGuest || !nextGuest) && stateLabel}
    </>
  );

  if (!actionable) {
    return (
      <div
        aria-label={`Room ${roomNumber} available`}
        className={`relative min-h-[6.5rem] rounded-md border px-2 py-2 text-left transition-colors ${stateClass}`}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      aria-label={`View room ${roomNumber} ${
        conflict ? "conflict" : primaryGuest?.profile.name ?? nextGuest?.profile.name
      }`}
      className={`relative min-h-[6.5rem] rounded-md border px-2 py-2 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-brand/20 ${stateClass}`}
      href={`/?room=${encodeURIComponent(roomNumber)}`}
    >
      {content}
    </Link>
  );
}

function formatValue(value: string | null | undefined): string {
  return value || "-";
}
