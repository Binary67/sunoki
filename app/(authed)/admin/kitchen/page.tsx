import Link from "next/link";
import CalendarDateRangeField from "@/app/components/CalendarDateRangeField";
import { isBookingDate } from "@/src/lib/booking-dates";
import {
  GUEST_ROOM_LEVELS,
  GUEST_ROOM_NUMBERS,
  listCheckedInGuestKitchenNotes,
  type GuestKitchenNote,
} from "@/src/lib/guest-profiles";
import {
  KITCHEN_PREP_SERVICE_KEYS,
  KITCHEN_PREP_SERVICES,
  listKitchenServicePrepBookings,
  type KitchenPrepServiceKey,
  type KitchenServicePrepBooking,
} from "@/src/lib/service-bookings/kitchen-prep";
import PrintKitchenNotesButton from "./PrintKitchenNotesButton";

type PageProps = {
  searchParams: Promise<{
    dateFrom?: string | string[];
    dateTo?: string | string[];
    guest?: string | string[];
    noteRoom?: string | string[];
    room?: string | string[];
    service?: string | string[];
    tab?: string | string[];
  }>;
};

type KitchenTab = "service-prep" | "guest-profile-notes";

type KitchenTabLink = {
  href: string;
  label: string;
  value: KitchenTab;
};

type KitchenServicePrepGroup = {
  key: string;
  bookingDate: string;
  guestProfileId: number;
  guestName: string;
  roomNumber: string | null;
  bookings: KitchenServicePrepBooking[];
};

type BookingDateRange = {
  from: string;
  to: string;
};

const GUEST_ROOM_OPTIONS = GUEST_ROOM_LEVELS.flatMap((level) =>
  GUEST_ROOM_NUMBERS.map((roomNumber) => `${level}-${roomNumber}`),
);
const GUEST_ROOM_SET = new Set(GUEST_ROOM_OPTIONS);
const KITCHEN_TABS: KitchenTabLink[] = [
  {
    href: "/admin/kitchen?tab=service-prep",
    label: "Kitchen Service Prep",
    value: "service-prep",
  },
  {
    href: "/admin/kitchen?tab=guest-profile-notes",
    label: "Guest Profile Kitchen Notes",
    value: "guest-profile-notes",
  },
];

export default async function KitchenPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const activeTab = getKitchenTab(getSingleValue(query.tab));
  const selectedBookingDateRange = getBookingDateRangeFilter(
    getSingleValue(query.dateFrom),
    getSingleValue(query.dateTo),
  );
  const selectedServiceKeys = getServiceKeyFilters(getValues(query.service));
  const selectedRoomNumber = getRoomNumberFilter(getSingleValue(query.room));
  const selectedGuestName = getGuestNameFilter(getSingleValue(query.guest));
  const selectedNoteRoomNumber = getRoomNumberFilter(
    getSingleValue(query.noteRoom),
  );
  const servicePrepBookings =
    activeTab === "service-prep"
      ? listKitchenServicePrepBookings({
          bookingDateFrom: selectedBookingDateRange?.from,
          bookingDateTo: selectedBookingDateRange?.to,
          roomNumber: selectedRoomNumber,
          serviceKeys: selectedServiceKeys,
        })
      : [];
  const servicePrepGroups = groupKitchenServicePrepBookings(servicePrepBookings);
  const notes =
    activeTab === "guest-profile-notes"
      ? filterGuestKitchenNotes(
          listCheckedInGuestKitchenNotes(),
          selectedGuestName,
          selectedNoteRoomNumber,
        )
      : [];
  const hasServiceFilter =
    selectedServiceKeys.length !== KITCHEN_PREP_SERVICE_KEYS.length;
  const hasActiveFilters =
    Boolean(selectedBookingDateRange) ||
    hasServiceFilter ||
    Boolean(selectedRoomNumber);
  const hasNoteFilters =
    Boolean(selectedGuestName) || Boolean(selectedNoteRoomNumber);

  return (
    <main className="kitchen-print-page flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <style>{`
        .kitchen-print-only {
          display: none;
        }

        @media print {
          @page {
            margin: 10mm;
          }

          body:has(.kitchen-print-page) {
            background: #fff;
          }

          body:has(.kitchen-print-page) aside,
          body:has(.kitchen-print-page) header,
          body:has(.kitchen-print-page) .kitchen-screen-only {
            display: none !important;
          }

          body:has(.kitchen-print-page) .h-screen {
            height: auto !important;
          }

          body:has(.kitchen-print-page) .overflow-hidden,
          body:has(.kitchen-print-page) .overflow-y-auto {
            overflow: visible !important;
          }

          body:has(.kitchen-print-page) .kitchen-print-page {
            padding: 0 !important;
          }

          body:has(.kitchen-print-page) .kitchen-print-only {
            display: block !important;
          }

          body:has(.kitchen-print-page) .kitchen-print-section + .kitchen-print-section {
            margin-top: 8mm;
          }

          body:has(.kitchen-print-page) .kitchen-print-heading {
            color: #000;
            font-size: 13pt;
            font-weight: 700;
            margin: 0 0 4mm;
          }

          body:has(.kitchen-print-page) .kitchen-print-grid {
            color: #000;
            display: grid;
            font-size: 9.5pt;
            gap: 4mm;
            grid-template-columns: 1fr 1fr;
            line-height: 1.25;
          }

          body:has(.kitchen-print-page) .kitchen-print-card {
            border: 1px solid #999;
            break-inside: avoid;
            padding: 4px 6px;
          }

          body:has(.kitchen-print-page) .kitchen-print-meta {
            align-items: baseline;
            display: flex;
            gap: 8px;
            justify-content: space-between;
            margin-bottom: 3px;
          }

          body:has(.kitchen-print-page) .kitchen-print-name,
          body:has(.kitchen-print-page) .kitchen-print-room {
            font-weight: 700;
          }

          body:has(.kitchen-print-page) .kitchen-print-room {
            flex: 0 0 auto;
          }

          body:has(.kitchen-print-page) .kitchen-print-list {
            margin: 0;
            padding-left: 16px;
          }

          body:has(.kitchen-print-page) .kitchen-print-list li + li {
            margin-top: 2px;
          }

          body:has(.kitchen-print-page) .kitchen-print-note {
            margin: 0;
            white-space: pre-wrap;
          }
        }
      `}</style>

      <div className="kitchen-screen-only mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink sm:text-2xl">
            Kitchen
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-ink/60">
            Food service prep and guest profile kitchen notes for daily
            preparation.
          </p>
        </div>
      </div>

      <KitchenTabNav activeTab={activeTab} />

      <section className="kitchen-print-only">
        {activeTab === "service-prep" && (
          <section className="kitchen-print-section">
            <h1 className="kitchen-print-heading">
              Kitchen Service Prep{selectedBookingDateRange
                ? ` - ${formatDisplayDateRange(selectedBookingDateRange)}`
                : ""}
            </h1>
            {servicePrepGroups.length === 0 ? (
              <p>No kitchen service prep.</p>
            ) : (
              <div className="kitchen-print-grid">
                {servicePrepGroups.map((group) => (
                  <article className="kitchen-print-card" key={group.key}>
                    <div className="kitchen-print-meta">
                      <span className="kitchen-print-name">
                        {group.guestName}
                      </span>
                      <span className="kitchen-print-room">
                        Room {formatValue(group.roomNumber)}
                      </span>
                    </div>
                    <ul className="kitchen-print-list">
                      {group.bookings.map((booking) => (
                        <li key={booking.id}>
                          {booking.bookingTime} - {booking.serviceName}
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "guest-profile-notes" && (
          <section className="kitchen-print-section">
            <h1 className="kitchen-print-heading">
              Guest Profile Kitchen Notes
            </h1>
            {notes.length === 0 ? (
              <p>No guest profile kitchen notes.</p>
            ) : (
              <div className="kitchen-print-grid">
                {notes.map((note) => (
                  <article className="kitchen-print-card" key={note.id}>
                    <div className="kitchen-print-meta">
                      <span className="kitchen-print-name">{note.name}</span>
                      <span className="kitchen-print-room">
                        Room {formatValue(note.roomNumber)}
                      </span>
                    </div>
                    <p className="kitchen-print-note">{note.kitchenNotes}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </section>

      {activeTab === "service-prep" && (
        <section className="kitchen-screen-only">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold text-ink">
                Kitchen Service Prep
              </h2>
              <span className="text-xs text-ink/50">
                {servicePrepBookings.length}{" "}
                {servicePrepBookings.length === 1 ? "item" : "items"}
              </span>
            </div>
            {servicePrepGroups.length > 0 && (
              <PrintKitchenNotesButton label="Print Service Prep" />
            )}
          </div>

          <form
            action="/admin/kitchen"
            className="mb-5 flex flex-wrap items-center gap-2"
            method="get"
          >
            <input type="hidden" name="tab" value="service-prep" />
            <CalendarDateRangeField
              key={`${selectedBookingDateRange?.from ?? ""}:${selectedBookingDateRange?.to ?? ""}`}
              buttonClassName="flex h-9 w-full items-center gap-2 rounded-md border border-black/10 bg-white px-3 text-left text-sm text-ink shadow-sm shadow-black/[0.02] outline-none transition-colors hover:bg-white/90 focus:border-brand focus:ring-2 focus:ring-brand/15"
              defaultFromValue={selectedBookingDateRange?.from ?? ""}
              defaultToValue={selectedBookingDateRange?.to ?? ""}
              fromName="dateFrom"
              id="kitchen-prep-date-filter"
              prefix="Date"
              toName="dateTo"
              wrapperClassName="relative w-full max-w-[21rem] sm:w-[21rem]"
            />

            <details className="group relative">
              <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-md border border-black/10 bg-white px-3 text-sm text-ink/75 shadow-sm shadow-black/[0.02] hover:text-ink [&::-webkit-details-marker]:hidden">
                <span>
                  Service
                  {hasServiceFilter ? ` (${selectedServiceKeys.length})` : ""}
                </span>
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rotate-45 border-b border-r border-ink/45"
                />
              </summary>

              <div className="absolute left-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-black/10 bg-white p-2 shadow-lg shadow-black/10">
                {KITCHEN_PREP_SERVICES.map((service) => (
                  <label
                    className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm text-ink/75 hover:bg-surface"
                    key={service.key}
                  >
                    <input
                      className="mt-0.5 h-4 w-4 rounded border-black/20 text-brand focus:ring-brand/20"
                      defaultChecked={selectedServiceKeys.includes(service.key)}
                      name="service"
                      type="checkbox"
                      value={service.key}
                    />
                    <span>{service.name}</span>
                  </label>
                ))}
              </div>
            </details>

            <label className="sr-only" htmlFor="kitchen-prep-room-filter">
              Room
            </label>
            <select
              className="h-9 rounded-md border border-black/10 bg-white px-3 text-sm text-ink shadow-sm shadow-black/[0.02] outline-none hover:bg-white/90 focus:border-brand focus:ring-2 focus:ring-brand/15"
              defaultValue={selectedRoomNumber ?? ""}
              id="kitchen-prep-room-filter"
              name="room"
            >
              <option value="">All rooms</option>
              {GUEST_ROOM_LEVELS.map((level) => (
                <optgroup key={level} label={`Level ${level}`}>
                  {GUEST_ROOM_NUMBERS.map((roomNumber) => {
                    const optionValue = `${level}-${roomNumber}`;
                    return (
                      <option key={optionValue} value={optionValue}>
                        Room {optionValue}
                      </option>
                    );
                  })}
                </optgroup>
              ))}
            </select>

            <button
              className="h-9 rounded-md bg-brand px-4 text-sm font-medium text-white shadow-sm shadow-black/[0.04] hover:bg-brand/90"
              type="submit"
            >
              Apply
            </button>

            {hasActiveFilters && (
              <Link
                className="flex h-9 items-center rounded-md px-3 text-sm font-medium text-ink/55 hover:bg-surface hover:text-ink"
                href="/admin/kitchen?tab=service-prep"
              >
                Clear
              </Link>
            )}
          </form>

          {servicePrepGroups.length === 0 ? (
            <div className="rounded-lg border border-black/5 bg-surface px-6 py-10 text-center text-sm text-ink/60">
              No kitchen service prep for selected filters.
            </div>
          ) : (
            <div className="grid gap-3">
              {servicePrepGroups.map((group) => (
                <article
                  className="rounded-lg border border-black/5 bg-white px-4 py-4"
                  key={group.key}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-ink">
                        {group.guestName}
                      </h3>
                      <p className="mt-1 text-xs font-medium text-ink/50">
                        {formatDisplayDate(group.bookingDate)}
                      </p>
                    </div>
                    <span className="w-fit rounded-md border border-brand/15 bg-brand/10 px-2.5 py-1.5 text-xs font-medium text-brand">
                      Room {formatValue(group.roomNumber)}
                    </span>
                  </div>
                  <ul className="mt-3 grid gap-2">
                    {group.bookings.map((booking) => (
                      <li
                        className="flex flex-col gap-1 rounded-md bg-surface px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                        key={booking.id}
                      >
                        <span className="font-medium text-ink">
                          {booking.serviceName}
                        </span>
                        <span className="text-xs font-medium text-ink/55">
                          {booking.bookingTime}
                        </span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "guest-profile-notes" && (
        <section className="kitchen-screen-only">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold text-ink">
                Guest Profile Kitchen Notes
              </h2>
              <span className="text-xs text-ink/50">
                {notes.length} {notes.length === 1 ? "guest" : "guests"}
              </span>
            </div>
            {notes.length > 0 && (
              <PrintKitchenNotesButton label="Print Kitchen Notes" />
            )}
          </div>

          <form
            action="/admin/kitchen"
            className="mb-5 flex flex-wrap items-center gap-2"
            method="get"
          >
            <input type="hidden" name="tab" value="guest-profile-notes" />
            <label className="sr-only" htmlFor="kitchen-note-guest-filter">
              Guest name
            </label>
            <input
              className="h-9 w-64 rounded-md border border-black/10 bg-white px-3 text-sm text-ink shadow-sm shadow-black/[0.02] outline-none hover:bg-white/90 focus:border-brand focus:ring-2 focus:ring-brand/15"
              defaultValue={selectedGuestName}
              id="kitchen-note-guest-filter"
              name="guest"
              placeholder="Guest name"
              type="search"
            />

            <label className="sr-only" htmlFor="kitchen-note-room-filter">
              Room
            </label>
            <select
              className="h-9 rounded-md border border-black/10 bg-white px-3 text-sm text-ink shadow-sm shadow-black/[0.02] outline-none hover:bg-white/90 focus:border-brand focus:ring-2 focus:ring-brand/15"
              defaultValue={selectedNoteRoomNumber ?? ""}
              id="kitchen-note-room-filter"
              name="noteRoom"
            >
              <option value="">All rooms</option>
              {GUEST_ROOM_LEVELS.map((level) => (
                <optgroup key={level} label={`Level ${level}`}>
                  {GUEST_ROOM_NUMBERS.map((roomNumber) => {
                    const optionValue = `${level}-${roomNumber}`;
                    return (
                      <option key={optionValue} value={optionValue}>
                        Room {optionValue}
                      </option>
                    );
                  })}
                </optgroup>
              ))}
            </select>

            <button
              className="h-9 rounded-md bg-brand px-4 text-sm font-medium text-white shadow-sm shadow-black/[0.04] hover:bg-brand/90"
              type="submit"
            >
              Apply
            </button>

            {hasNoteFilters && (
              <Link
                className="flex h-9 items-center rounded-md px-3 text-sm font-medium text-ink/55 hover:bg-surface hover:text-ink"
                href="/admin/kitchen?tab=guest-profile-notes"
              >
                Clear
              </Link>
            )}
          </form>

          {notes.length === 0 ? (
            <div className="rounded-lg border border-black/5 bg-surface px-6 py-10 text-center text-sm text-ink/60">
              {hasNoteFilters
                ? "No guest profile kitchen notes for selected filters."
                : "No guest profile kitchen notes for checked-in guests."}
            </div>
          ) : (
            <div className="grid gap-3">
              {notes.map((note) => (
                <article
                  className="kitchen-note-card rounded-lg border border-black/5 bg-white px-4 py-4"
                  key={note.id}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <h3 className="text-base font-semibold text-ink">
                      {note.name}
                    </h3>
                    <span className="w-fit rounded-md border border-brand/15 bg-brand/10 px-2.5 py-1.5 text-xs font-medium text-brand">
                      Room {formatValue(note.roomNumber)}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink/80">
                    {note.kitchenNotes}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function KitchenTabNav({ activeTab }: { activeTab: KitchenTab }) {
  return (
    <nav className="kitchen-screen-only mb-6 flex flex-wrap gap-2">
      {KITCHEN_TABS.map((tab) => (
        <Link
          className={`rounded-md px-3 py-2 text-sm transition-colors ${
            tab.value === activeTab
              ? "bg-brand text-white"
              : "bg-surface text-ink/70 hover:text-ink"
          }`}
          href={tab.href}
          key={tab.value}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
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
    } else {
      groups.set(key, {
        key,
        bookingDate: booking.bookingDate,
        guestProfileId: booking.guestProfileId,
        guestName: booking.guestName,
        roomNumber: booking.roomNumber,
        bookings: [booking],
      });
    }
  }

  return Array.from(groups.values());
}

function getServiceKeyFilters(values: string[]): KitchenPrepServiceKey[] {
  const requestedValues = new Set(values);
  const selectedServiceKeys = KITCHEN_PREP_SERVICE_KEYS.filter((serviceKey) =>
    requestedValues.has(serviceKey),
  );

  return selectedServiceKeys.length > 0
    ? selectedServiceKeys
    : [...KITCHEN_PREP_SERVICE_KEYS];
}

function getKitchenTab(value: string | undefined): KitchenTab {
  return value === "guest-profile-notes" ? value : "service-prep";
}

function filterGuestKitchenNotes(
  notes: GuestKitchenNote[],
  guestName: string,
  roomNumber: string | undefined,
): GuestKitchenNote[] {
  const normalizedGuestName = guestName.toLowerCase();

  return notes.filter((note) => {
    if (
      normalizedGuestName &&
      !note.name.toLowerCase().includes(normalizedGuestName)
    ) {
      return false;
    }

    return !roomNumber || note.roomNumber === roomNumber;
  });
}

function getBookingDateRangeFilter(
  from: string | undefined,
  to: string | undefined,
): BookingDateRange | undefined {
  if (!from || !to || !isBookingDate(from) || !isBookingDate(to) || from > to) {
    return undefined;
  }

  return { from, to };
}

function getGuestNameFilter(value: string | undefined): string {
  return value?.trim() ?? "";
}

function getRoomNumberFilter(value: string | undefined): string | undefined {
  return value && GUEST_ROOM_SET.has(value) ? value : undefined;
}

function getSingleValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getValues(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function formatDisplayDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDisplayDateRange(range: BookingDateRange): string {
  if (range.from === range.to) return formatDisplayDate(range.from);
  return `${formatDisplayDate(range.from)} - ${formatDisplayDate(range.to)}`;
}

function formatValue(value: string | null | undefined): string {
  return value || "-";
}
