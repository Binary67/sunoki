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
import type { RoomOccupancyGuest, RoomOccupancyRoom } from "./room-occupancy";

export default function RoomOccupancyModal({
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
              <RoomGuestArticle guest={nextGuest} label="Next incoming" />
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
      {isCurrentStay && <GuestBookingsSummary bookings={guest.bookings} />}
      <GuestProfileAddonSummary addons={guest.addons} />
    </article>
  );
}

function GuestBookingsSummary({
  bookings,
}: {
  bookings: GuestBookingChecklistItem[];
}) {
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
        <ul className="mt-3 grid gap-2">
          {bookings.map((booking) => (
            <li
              className="rounded-md bg-surface px-3 py-2 text-sm"
              key={`${booking.type}-${booking.id}`}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-ink">
                      {booking.name}
                    </span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-ink/45">
                      {booking.type}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-ink/55">
                    {booking.bookingDate} at {booking.bookingTime}
                    {booking.detail ? ` \u00b7 ${booking.detail}` : ""}
                  </div>
                </div>
                <div className="text-xs font-medium text-ink/55">
                  {getBookingStatusLabel(booking)}
                </div>
              </div>
              {booking.doneAt && (
                <div className="mt-1 text-xs text-ink/45">
                  Done {booking.doneAt}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
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

function getBookingStatusLabel(booking: GuestBookingChecklistItem): string {
  if (booking.isDone) return "Done";
  if (booking.isRead) return "Read";
  return "Unread";
}
