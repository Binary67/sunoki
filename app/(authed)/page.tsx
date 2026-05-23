import Link from "next/link";
import { redirect } from "next/navigation";
import { GUEST_PROFILE_SECTIONS, type GuestProfileField } from "./admin/guest-profile/fields";
import { getCurrentUser } from "@/src/lib/auth";
import { addBookingDays, isBookingDate } from "@/src/lib/booking-dates";
import { getUpcomingBookings } from "@/src/lib/bookings";
import { ADDITIONAL_DAYS_ADDON_NAME } from "@/src/lib/guest-profile-addons";
import {
  GUEST_ROOM_LEVELS,
  GUEST_ROOM_NUMBERS,
  listGuestProfileAddons,
  listGuestProfiles,
  type GuestProfile,
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
const BASE_STAY_DAYS = 27;

type RoomOccupancyGuest = {
  checkoutDate: string | null;
  profile: GuestProfile;
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
  const roomOccupancy = getRoomOccupancy(checkedInProfiles);
  const selectedRoom = getSingleValue(query.room);
  const selectedRoomGuests = selectedRoom
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

      {selectedRoom && selectedRoomGuests && (
        <RoomOccupancyModal
          guests={selectedRoomGuests}
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
  occupancyByRoom: Map<string, RoomOccupancyGuest[]>;
  unassignedCount: number;
}) {
  const occupiedRoomCount = occupancyByRoom.size;
  const conflictRoomCount = Array.from(occupancyByRoom.values()).filter(
    (guests) => guests.length > 1,
  ).length;

  return (
    <section className="mb-10">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">Room occupancy</h2>
          <p className="mt-1 text-sm text-ink/60">
            Checked-in guests by assigned room.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          <span className="rounded-md bg-surface px-2.5 py-1.5 text-ink/60">
            {occupiedRoomCount} / {TOTAL_GUEST_ROOMS} occupied
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
            occupancyByRoom.has(`${level}-${roomNumber}`),
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
                  const guests = occupancyByRoom.get(fullRoomNumber);

                  return (
                    <RoomTile
                      key={fullRoomNumber}
                      guests={guests}
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
  guests,
  roomNumber,
}: {
  guests?: RoomOccupancyGuest[];
  roomNumber: string;
}) {
  const guestCount = guests?.length ?? 0;
  const occupied = guestCount > 0;
  const conflict = guestCount > 1;
  const primaryGuest = guests?.[0];
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
  const content = (
    <>
      <span className="font-semibold text-ink">{roomNumber}</span>
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
      <span className="mt-1 flex items-center gap-1 text-[11px] font-medium">
        <span
          aria-hidden="true"
          className={`size-1.5 rounded-full ${dotClass}`}
        />
        {stateText}
      </span>
    </>
  );

  if (!occupied) {
    return (
      <div
        aria-label={`Room ${roomNumber} available`}
        className={`min-h-[5.75rem] rounded-md border px-2 py-2 text-left transition-colors ${stateClass}`}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      aria-label={`View room ${roomNumber} ${conflict ? "conflict" : primaryGuest?.profile.name}`}
      className={`min-h-[5.75rem] rounded-md border px-2 py-2 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-brand/20 ${stateClass}`}
      href={`/?room=${encodeURIComponent(roomNumber)}`}
    >
      {content}
    </Link>
  );
}

function RoomOccupancyModal({
  guests,
  roomNumber,
}: {
  guests: RoomOccupancyGuest[];
  roomNumber: string;
}) {
  const conflict = guests.length > 1;

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
              {guests.length} checked-in guest
              {guests.length === 1 ? "" : "s"} assigned to this room.
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
            {guests.map((guest) => (
              <article
                key={guest.profile.id}
                className="rounded-lg border border-black/5 bg-white px-4 py-5 sm:px-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-ink">
                      {guest.profile.name}
                    </h3>
                    <p className="mt-1 text-sm text-ink/60">
                      EDD {formatValue(guest.profile.expectedDeliveryDate)}
                    </p>
                    <p className="mt-1 text-sm text-ink/60">
                      Checkout {formatValue(guest.checkoutDate)}
                    </p>
                  </div>
                  <Link
                    href={`/admin/guest-profile/${guest.profile.id}`}
                    className="inline-flex h-9 w-fit items-center rounded-md border border-black/10 px-3 text-sm font-medium text-ink/70 hover:bg-surface"
                  >
                    Open full profile
                  </Link>
                </div>

                <div className="mt-5 grid gap-5">
                  {GUEST_PROFILE_SECTIONS.map((section) => (
                    <section
                      key={section.title}
                      className="border-t border-black/5 pt-4 first:border-t-0 first:pt-0"
                    >
                      <h4 className="text-sm font-semibold text-ink">
                        {section.title}
                      </h4>
                      <dl className="mt-3 grid gap-3 md:grid-cols-2">
                        {section.fields.map((field) => (
                          <GuestProfileDetailItem
                            key={field.name}
                            field={field}
                            profile={guest.profile}
                          />
                        ))}
                      </dl>
                    </section>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function GuestProfileDetailItem({
  field,
  profile,
}: {
  field: GuestProfileField;
  profile: GuestProfile;
}) {
  return (
    <div className={field.multiline ? "md:col-span-2" : ""}>
      <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink/45">
        {field.label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink/75">
        {formatValue(field.value(profile))}
      </dd>
    </div>
  );
}

function getRoomOccupancy(profiles: GuestProfile[]): {
  rooms: Map<string, RoomOccupancyGuest[]>;
  unassignedCount: number;
} {
  const rooms = new Map<string, RoomOccupancyGuest[]>();
  let unassignedCount = 0;

  for (const profile of profiles) {
    if (!profile.roomNumber || !GUEST_ROOM_SET.has(profile.roomNumber)) {
      unassignedCount += 1;
      continue;
    }

    const guests = rooms.get(profile.roomNumber) ?? [];
    guests.push({
      checkoutDate: getCheckoutDate(profile),
      profile,
    });
    rooms.set(profile.roomNumber, guests);
  }

  return { rooms, unassignedCount };
}

function getCheckoutDate(profile: GuestProfile): string | null {
  const edd = profile.expectedDeliveryDate;
  if (!edd || !isBookingDate(edd)) return null;

  const additionalDays =
    listGuestProfileAddons(profile.id).find(
      (addon) => addon.serviceName === ADDITIONAL_DAYS_ADDON_NAME,
    )?.days ?? 0;

  return addBookingDays(edd, BASE_STAY_DAYS + additionalDays);
}

function getSingleValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatValue(value: string | null | undefined): string {
  return value || "-";
}
