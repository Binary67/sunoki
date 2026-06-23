import Link from "next/link";
import type { GuestBookingChecklistItem } from "@/src/lib/guest-bookings";
import { ADDITIONAL_DAYS_ADDON_NAME } from "@/src/lib/guest-profile-addons";
import {
  formatGuestProfileAddonPrice,
  getGuestProfileAddonLineTotalCents,
  getGuestProfileAddonTotalCents,
  type GuestProfile,
  type GuestProfileAddon,
} from "@/src/lib/guest-profiles";
import GuestBookingStatusCheckbox from "../admin/guest-profile/GuestBookingStatusCheckbox";
import { updateRoomOccupancyGuestBookingStatusAction } from "./actions";
import type { RoomOccupancyGuest, RoomOccupancyRoom } from "./room-occupancy";

export type RoomBookingSortField = "booking" | "date" | "time";
export type RoomBookingSortDirection = "asc" | "desc";
export type RoomBookingSortState = {
  direction: RoomBookingSortDirection;
  field: RoomBookingSortField;
};

export default function RoomOccupancyModal({
  bookingSort,
  roomDetails,
  roomNumber,
}: {
  bookingSort?: RoomBookingSortState;
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
                bookingSort={bookingSort}
                key={guest.profile.id}
                guest={guest}
                label="Current stay"
                roomNumber={roomNumber}
              />
            ))}
            {nextGuest && (
              <RoomGuestArticle
                guest={nextGuest}
                label="Next incoming"
                roomNumber={roomNumber}
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function RoomGuestArticle({
  bookingSort,
  guest,
  label,
  roomNumber,
}: {
  bookingSort?: RoomBookingSortState;
  guest: RoomOccupancyGuest;
  label: "Current stay" | "Next incoming";
  roomNumber: string;
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
            {isCurrentStay ? "Check In" : "EDD"}{" "}
            {formatValue(
              isCurrentStay
                ? guest.profile.checkInDate
                : guest.profile.expectedDeliveryDate,
            )}
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
      {isCurrentStay && (
        <GuestBookingsSummary
          bookingSort={bookingSort}
          bookings={guest.bookings}
          profileId={guest.profile.id}
          roomNumber={roomNumber}
        />
      )}
      <GuestProfileAddonSummary addons={guest.addons} />
    </article>
  );
}

function GuestBookingsSummary({
  bookingSort,
  bookings,
  profileId,
  roomNumber,
}: {
  bookingSort?: RoomBookingSortState;
  bookings: GuestBookingChecklistItem[];
  profileId: number;
  roomNumber: string;
}) {
  const hiddenFields = [{ name: "roomNumber", value: roomNumber }];
  const displayedBookings = getSortedBookings(bookings, bookingSort);

  return (
    <section className="mt-5 border-t border-black/5 pt-4">
      <div className="flex items-baseline justify-between gap-4">
        <h4 className="text-sm font-semibold text-ink">Bookings</h4>
        <span className="text-xs text-ink/50">
          {bookings.length} {bookings.length === 1 ? "booking" : "bookings"}
        </span>
      </div>
      {bookings.length === 0 ? (
        <p className="mt-2 text-sm leading-6 text-ink/60">-</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-lg border border-black/5">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-surface text-[11px] uppercase tracking-[0.14em] text-ink/45">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">
                  <BookingSortHeader
                    bookingSort={bookingSort}
                    field="booking"
                    label="Booking"
                    roomNumber={roomNumber}
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  <BookingSortHeader
                    bookingSort={bookingSort}
                    field="date"
                    label="Date"
                    roomNumber={roomNumber}
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  <BookingSortHeader
                    bookingSort={bookingSort}
                    field="time"
                    label="Time"
                    roomNumber={roomNumber}
                  />
                </th>
                <th className="px-4 py-3 text-center font-medium">Read</th>
                <th className="px-4 py-3 text-center font-medium">Done</th>
                <th className="px-4 py-3 text-left font-medium">Done At</th>
              </tr>
            </thead>
            <tbody>
              {displayedBookings.map((booking) => (
                <tr
                  className="border-t border-black/5 text-ink/75"
                  key={`${booking.type}-${booking.id}`}
                >
                  <td className="px-4 py-3 capitalize">{booking.type}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{booking.name}</div>
                    {booking.detail && (
                      <div className="mt-0.5 text-xs text-ink/50">
                        {booking.detail}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">{booking.bookingDate}</td>
                  <td className="px-4 py-3">{booking.bookingTime}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <GuestBookingStatusCheckbox
                        bookingId={booking.id}
                        bookingType={booking.type}
                        checked={booking.isRead}
                        disabled={booking.isDone}
                        field="read"
                        hiddenFields={hiddenFields}
                        label={`Mark ${booking.name} as read`}
                        profileId={profileId}
                        statusAction={updateRoomOccupancyGuestBookingStatusAction}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <GuestBookingStatusCheckbox
                        bookingId={booking.id}
                        bookingType={booking.type}
                        checked={booking.isDone}
                        disabled={!booking.isRead}
                        field="done"
                        hiddenFields={hiddenFields}
                        label={`Mark ${booking.name} as done`}
                        profileId={profileId}
                        statusAction={updateRoomOccupancyGuestBookingStatusAction}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink/60">
                    {formatValue(booking.doneAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function BookingSortHeader({
  bookingSort,
  field,
  label,
  roomNumber,
}: {
  bookingSort?: RoomBookingSortState;
  field: RoomBookingSortField;
  label: string;
  roomNumber: string;
}) {
  const activeDirection =
    bookingSort?.field === field ? bookingSort.direction : undefined;
  const active = activeDirection !== undefined;
  const nextDirection: RoomBookingSortDirection =
    activeDirection === "asc" ? "desc" : "asc";

  return (
    <span className="inline-flex items-center gap-1.5">
      {label}
      <Link
        aria-label={`Sort bookings by ${label.toLowerCase()} ${nextDirection}`}
        className={`inline-grid size-5 translate-y-px place-items-center rounded transition-colors hover:bg-white hover:text-ink/70 ${
          active ? "text-ink/70" : "text-ink/35"
        }`}
        href={getRoomBookingSortHref(roomNumber, field, nextDirection)}
      >
        <BookingSortIcon direction={activeDirection} />
      </Link>
    </span>
  );
}

function BookingSortIcon({
  direction,
}: {
  direction?: RoomBookingSortDirection;
}) {
  const upClass =
    direction === undefined || direction === "asc" ? "opacity-100" : "opacity-30";
  const downClass =
    direction === undefined || direction === "desc"
      ? "opacity-100"
      : "opacity-30";

  return (
    <svg
      aria-hidden="true"
      className="size-3.5"
      fill="currentColor"
      viewBox="0 0 16 16"
    >
      <path className={upClass} d="M8 3.5 4.75 7h6.5L8 3.5Z" />
      <path className={downClass} d="M8 12.5 11.25 9h-6.5L8 12.5Z" />
    </svg>
  );
}

function getRoomBookingSortHref(
  roomNumber: string,
  field: RoomBookingSortField,
  direction: RoomBookingSortDirection,
): string {
  const params = new URLSearchParams({
    room: roomNumber,
    roomBookingSort: field,
    roomBookingSortDirection: direction,
  });
  return `/?${params.toString()}`;
}

function getSortedBookings(
  bookings: GuestBookingChecklistItem[],
  bookingSort: RoomBookingSortState | undefined,
): GuestBookingChecklistItem[] {
  if (!bookingSort) return bookings;

  return [...bookings].sort((a, b) =>
    compareGuestBookingChecklistItems(a, b, bookingSort),
  );
}

function compareGuestBookingChecklistItems(
  a: GuestBookingChecklistItem,
  b: GuestBookingChecklistItem,
  bookingSort: RoomBookingSortState,
): number {
  if (bookingSort.field === "booking") {
    const bookingComparison = a.name.localeCompare(b.name);
    const directedBookingComparison =
      bookingSort.direction === "desc" ? -bookingComparison : bookingComparison;

    return (
      directedBookingComparison ||
      a.bookingDate.localeCompare(b.bookingDate) ||
      a.bookingTime.localeCompare(b.bookingTime) ||
      a.type.localeCompare(b.type) ||
      a.id - b.id
    );
  }

  const dateTimeComparison =
    bookingSort.field === "date"
      ? a.bookingDate.localeCompare(b.bookingDate) ||
        a.bookingTime.localeCompare(b.bookingTime)
      : a.bookingTime.localeCompare(b.bookingTime) ||
        a.bookingDate.localeCompare(b.bookingDate);
  const directedDateTimeComparison =
    bookingSort.direction === "desc" ? -dateTimeComparison : dateTimeComparison;

  return (
    directedDateTimeComparison ||
    a.type.localeCompare(b.type) ||
    a.id - b.id
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
          {addons.map((addon) => {
            const isAdditionalDays =
              addon.serviceName === ADDITIONAL_DAYS_ADDON_NAME;

            return (
              <li key={addon.id}>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div className="grid gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>
                        {addon.serviceName}
                        {isAdditionalDays &&
                          addon.days &&
                          `: ${addon.days} DAYS`}
                      </span>
                      {!isAdditionalDays && (
                        <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-ink/50">
                          {addon.category === "sunoki"
                            ? "Purchased Perk"
                            : "Sunoki"}
                        </span>
                      )}
                    </div>
                    {!isAdditionalDays && (
                      <span className="text-xs leading-5 text-ink/55">
                        Qty {addon.quantity} x{" "}
                        {formatGuestProfileAddonPrice(addon.priceCents)}
                      </span>
                    )}
                  </div>
                  <span className="font-medium text-ink">
                    {formatGuestProfileAddonPrice(
                      getGuestProfileAddonLineTotalCents(addon),
                    )}
                  </span>
                </div>
                {addon.remarks && (
                  <p className="mt-1 whitespace-pre-line text-xs leading-5 text-ink/60">
                    {addon.remarks}
                  </p>
                )}
              </li>
            );
          })}
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

function formatValue(value: string | null | undefined): string {
  return value || "-";
}
