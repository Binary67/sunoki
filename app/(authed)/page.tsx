import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/src/lib/auth";
import {
  addBookingDays,
  formatBookingDate as formatDateKey,
  isBookingDate,
} from "@/src/lib/booking-dates";
import { getUpcomingBookings } from "@/src/lib/bookings";
import { ADDITIONAL_DAYS_ADDON_NAME } from "@/src/lib/guest-profile-addons";
import {
  formatGuestProfileAddonPrice,
  GUEST_BASE_STAY_DAYS,
  GUEST_ROOM_LEVELS,
  GUEST_ROOM_NUMBERS,
  getGuestProfileAddonTotalCents,
  listGuestProfileAddons,
  listGuestProfiles,
  type GuestProfile,
  type GuestProfileAddon,
} from "@/src/lib/guest-profiles";
import { isAdminRole } from "@/src/lib/roles";

type PageProps = {
  searchParams: Promise<{
    room?: string | string[];
  }>;
};

const GUEST_ROOM_SET = new Set(
  GUEST_ROOM_LEVELS.flatMap((level) =>
    GUEST_ROOM_NUMBERS.map((roomNumber) => `${level}-${roomNumber}`),
  ),
);
const TOTAL_GUEST_ROOMS = GUEST_ROOM_SET.size;

type RoomOccupancyGuest = {
  addons: GuestProfileAddon[];
  checkoutDate: string | null;
  profile: GuestProfile;
};

type RoomOccupancyRoom = {
  currentGuests: RoomOccupancyGuest[];
  nextGuest: RoomOccupancyGuest | null;
};

function formatBookingDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTimeRange(startTime: string, durationMinutes: number) {
  const [hh, mm] = startTime.split(":").map(Number);
  const start = new Date();
  start.setHours(hh, mm, 0, 0);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const fmt = (d: Date) =>
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${fmt(start)} – ${fmt(end)}`;
}

export default async function Dashboard({ searchParams }: PageProps) {
  const query = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdminRole(user.role)) redirect("/booking/karaoke");

  const bookings = getUpcomingBookings();
  const checkedInProfiles = listGuestProfiles("checked_in");
  const incomingProfiles = listGuestProfiles("not_checked_in");
  const today = formatDateKey(new Date());
  const roomOccupancy = getRoomOccupancy(
    checkedInProfiles,
    incomingProfiles,
    today,
  );
  const selectedRoom = getSingleValue(query.room);
  const selectedRoomDetails = selectedRoom
    ? roomOccupancy.rooms.get(selectedRoom)
    : undefined;

  return (
    <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
      <div className="mb-10">
        <h1 className="text-xl sm:text-2xl font-semibold text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-ink/60">
          Overview of facility activity for the team.
        </p>
      </div>

      <RoomOccupancySection
        occupancyByRoom={roomOccupancy.rooms}
        unassignedCount={roomOccupancy.unassignedCount}
      />

      <section className="border-t border-black/5 pt-8 sm:pt-9">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-base font-semibold text-ink">
            Upcoming facility sessions
          </h2>
          <span className="text-xs text-ink/50">
            {bookings.length} {bookings.length === 1 ? "session" : "sessions"}
          </span>
        </div>

        {bookings.length === 0 ? (
          <div className="rounded-lg border border-black/5 bg-surface px-6 py-10 text-center text-sm text-ink/60">
            No upcoming bookings.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-black/5">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-surface text-[11px] tracking-[0.14em] text-ink/50 uppercase">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Date</th>
                  <th className="text-left font-medium px-5 py-3">Time</th>
                  <th className="text-left font-medium px-5 py-3">Facility</th>
                  <th className="text-left font-medium px-5 py-3">Guest</th>
                  <th className="text-left font-medium px-5 py-3">Capacity</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr
                    key={booking.bookingId}
                    className="border-t border-black/5"
                  >
                    <td className="px-5 py-3 text-ink">
                      {formatBookingDate(booking.bookingDate)}
                    </td>
                    <td className="px-5 py-3 text-ink/80">
                      {formatTimeRange(
                        booking.startTime,
                        booking.durationMinutes,
                      )}
                    </td>
                    <td className="px-5 py-3 text-ink">
                      {booking.facilityName}
                    </td>
                    <td className="px-5 py-3 text-ink/80">
                      {booking.guestUsername}
                    </td>
                    <td className="px-5 py-3 text-ink/80">
                      {booking.bookedPax} / {booking.capacityPax}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedRoom && selectedRoomDetails && (
        <RoomOccupancyModal
          roomDetails={selectedRoomDetails}
          roomNumber={selectedRoom}
        />
      )}
    </main>
  );
}

function RoomOccupancySection({
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
  const conflictRoomCount = Array.from(occupancyByRoom.values()).filter(
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
        className={`min-h-[6.5rem] rounded-md border px-2 py-2 text-left transition-colors ${stateClass}`}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      aria-label={`View room ${roomNumber} ${conflict ? "conflict" : primaryGuest?.profile.name ?? nextGuest?.profile.name}`}
      className={`min-h-[6.5rem] rounded-md border px-2 py-2 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-brand/20 ${stateClass}`}
      href={`/?room=${encodeURIComponent(roomNumber)}`}
    >
      {content}
    </Link>
  );
}

function RoomOccupancyModal({
  roomDetails,
  roomNumber,
}: {
  roomDetails: RoomOccupancyRoom;
  roomNumber: string;
}) {
  const currentGuests = roomDetails.currentGuests;
  const nextGuest = roomDetails.nextGuest;
  const conflict = currentGuests.length > 1;

  return (
    <div
      aria-labelledby="room-occupancy-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/35 p-3 sm:p-6"
      role="dialog"
    >
      <Link
        aria-label="Close room details"
        className="absolute inset-0"
        href="/"
        tabIndex={-1}
      />
      <section className="relative z-10 flex min-h-0 w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-black/10 px-4 py-4 sm:px-5">
          <div>
            <h2
              className="text-base font-semibold text-ink sm:text-lg"
              id="room-occupancy-title"
            >
              Room {roomNumber}
            </h2>
            <p className="mt-1 text-sm leading-6 text-ink/60">
              {getRoomDetailsSummary(currentGuests.length, nextGuest)}
            </p>
          </div>
          <Link
            aria-label="Close room details"
            className="grid size-8 shrink-0 place-items-center rounded-md text-ink/55 hover:bg-surface hover:text-ink"
            href="/"
          >
            <span aria-hidden="true" className="text-xl leading-none">
              x
            </span>
          </Link>
        </div>

        <div className="min-h-0 overflow-y-auto bg-surface px-4 py-5 sm:px-5">
          {conflict && (
            <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-800">
              More than one checked-in guest is assigned to this room.
            </p>
          )}

          <div className="grid gap-4">
            {currentGuests.map((guest) => (
              <RoomGuestArticle
                key={guest.profile.id}
                guest={guest}
                label="Current stay"
              />
            ))}
            {nextGuest && (
              <RoomGuestArticle
                guest={nextGuest}
                label="Next incoming"
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function RoomGuestArticle({
  guest,
  label,
}: {
  guest: RoomOccupancyGuest;
  label: "Current stay" | "Next incoming";
}) {
  const isCurrentStay = label === "Current stay";

  return (
    <article className="rounded-lg border border-black/5 bg-white px-4 py-5 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span
            className={`mb-2 inline-flex rounded-md px-2 py-1 text-xs font-medium ${
              isCurrentStay
                ? "bg-emerald-50 text-emerald-700"
                : "bg-sky-50 text-sky-700"
            }`}
          >
            {label}
          </span>
          <h3 className="text-base font-semibold text-ink">
            {guest.profile.name}
          </h3>
          <p className="mt-1 text-sm text-ink/60">
            EDD {formatValue(guest.profile.expectedDeliveryDate)}
          </p>
          {isCurrentStay && (
            <p className="mt-1 text-sm text-ink/60">
              Checkout {formatValue(guest.checkoutDate)}
            </p>
          )}
        </div>
        <Link
          href={`/admin/guest-profile/${guest.profile.id}`}
          className="inline-flex h-9 w-fit items-center rounded-md border border-black/10 px-3 text-sm font-medium text-ink/70 hover:bg-surface"
        >
          Full details
        </Link>
      </div>

      <dl className="mt-5 grid gap-3 md:grid-cols-2">
        <GuestProfileSummaryItem label="IC Number" value={guest.profile.icNo} />
        <GuestProfileSummaryItem
          label="Mother Phone Number"
          value={guest.profile.handphoneNo}
        />
        <GuestProfileSummaryItem
          label="No. of Child"
          value={guest.profile.childCount}
        />
        <GuestProfileSummaryItem
          label="Type of Package"
          value={guest.profile.packageType}
        />
        <GuestProfileSummaryItem
          label="Notes"
          value={getGuestProfileNotes(guest.profile)}
          wide
        />
      </dl>
      <GuestProfileAddonSummary addons={guest.addons} />
    </article>
  );
}

function GuestProfileSummaryItem({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string | null;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink/45">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink/75">
        {formatValue(value)}
      </dd>
    </div>
  );
}

function GuestProfileAddonSummary({
  addons,
}: {
  addons: GuestProfileAddon[];
}) {
  const totalCents = getGuestProfileAddonTotalCents(addons);

  return (
    <section className="mt-5 border-t border-black/5 pt-4">
      <h4 className="text-sm font-semibold text-ink">Addon</h4>
      {addons.length === 0 ? (
        <p className="mt-2 text-sm leading-6 text-ink/60">-</p>
      ) : (
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-ink/80">
          {addons.map((addon) => (
            <li key={addon.id}>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  {addon.serviceName}
                  {addon.serviceName === ADDITIONAL_DAYS_ADDON_NAME &&
                    addon.days && `: ${addon.days} DAYS`}
                </span>
                <span className="font-medium text-ink">
                  {formatGuestProfileAddonPrice(addon.priceCents)}
                </span>
              </div>
              {addon.remarks && (
                <p className="mt-1 whitespace-pre-line text-xs leading-5 text-ink/60">
                  {addon.remarks}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex items-center justify-between gap-4 border-t border-black/10 pt-4 text-sm">
        <span className="font-medium text-ink/65">Total Addon</span>
        <span className="font-semibold text-ink">
          {formatGuestProfileAddonPrice(totalCents)}
        </span>
      </div>
    </section>
  );
}

function getRoomOccupancy(
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
      checkoutDate: getCheckoutDate(profile, addons),
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
      checkoutDate: getCheckoutDate(profile, addons),
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

  const newRoom = { currentGuests: [], nextGuest: null };
  rooms.set(roomNumber, newRoom);
  return newRoom;
}

function isEarlierIncomingGuest(a: GuestProfile, b: GuestProfile): boolean {
  const aEdd = a.expectedDeliveryDate;
  const bEdd = b.expectedDeliveryDate;

  if (aEdd && bEdd && aEdd !== bEdd) return aEdd < bEdd;
  return a.id < b.id;
}

function getCheckoutDate(
  profile: GuestProfile,
  addons: GuestProfileAddon[],
): string | null {
  const edd = profile.expectedDeliveryDate;
  if (!edd || !isBookingDate(edd)) return null;

  const additionalDays =
    addons.find(
      (addon) => addon.serviceName === ADDITIONAL_DAYS_ADDON_NAME,
    )?.days ?? 0;

  return addBookingDays(edd, GUEST_BASE_STAY_DAYS + additionalDays);
}

function getRoomDetailsSummary(
  currentGuestCount: number,
  nextGuest: RoomOccupancyGuest | null,
): string {
  if (currentGuestCount > 0 && nextGuest) {
    return `${currentGuestCount} checked-in guest${
      currentGuestCount === 1 ? "" : "s"
    } assigned. Next incoming guest: ${nextGuest.profile.name}.`;
  }

  if (currentGuestCount > 0) {
    return `${currentGuestCount} checked-in guest${
      currentGuestCount === 1 ? "" : "s"
    } assigned to this room.`;
  }

  if (nextGuest) {
    return `No checked-in guest. Next incoming guest: ${nextGuest.profile.name}.`;
  }

  return "No checked-in or incoming guest assigned to this room.";
}

function getGuestProfileNotes(profile: GuestProfile): string | null {
  const notes = [
    ["Special note", profile.specialNote],
    ["Package note", profile.packageSpecialNote],
    ["Medical/Food notes", profile.medicalFoodNotes],
  ]
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`);

  return notes.length > 0 ? notes.join("\n") : null;
}

function getSingleValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatValue(value: string | null | undefined): string {
  return value || "-";
}
