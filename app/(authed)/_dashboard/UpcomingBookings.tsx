import Link from "next/link";
import CalendarDateRangeField from "@/app/components/CalendarDateRangeField";
import type {
  FacilityBookingOption,
  UpcomingBooking,
} from "@/src/lib/bookings";
import type {
  BookablePackageService,
  ServiceBookingKey,
} from "@/src/lib/service-bookings/catalog";

type UpcomingBookingFilterState = {
  bookingDateFrom?: string;
  bookingDateTo?: string;
  facilityIds: number[];
  serviceKeys: ServiceBookingKey[];
};

export default function UpcomingBookings({
  bookings,
  facilityOptions,
  filters,
  serviceOptions,
  today,
}: {
  bookings: UpcomingBooking[];
  facilityOptions: FacilityBookingOption[];
  filters: UpcomingBookingFilterState;
  serviceOptions: BookablePackageService[];
  today: string;
}) {
  const selectedFacilityCount = filters.facilityIds.length;
  const selectedServiceCount = filters.serviceKeys.length;
  const selectedBookingFilterCount =
    selectedServiceCount + selectedFacilityCount;
  const hasActiveFilters =
    Boolean(filters.bookingDateFrom && filters.bookingDateTo) ||
    selectedBookingFilterCount > 0;

  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-ink">Upcoming tasks</h2>
        <span className="text-xs text-ink/50">
          {bookings.length} {bookings.length === 1 ? "booking" : "bookings"}
        </span>
      </div>

      <form
        action="/"
        className="mb-4 flex flex-wrap items-center gap-2"
        method="get"
      >
        <input type="hidden" name="tab" value="upcoming-bookings" />
        <CalendarDateRangeField
          key={`${filters.bookingDateFrom ?? ""}:${filters.bookingDateTo ?? ""}`}
          id="upcoming-booking-date-filter"
          fromName="dateFrom"
          toName="dateTo"
          defaultFromValue={filters.bookingDateFrom ?? ""}
          defaultToValue={filters.bookingDateTo ?? ""}
          minDate={today}
          prefix="Date"
          wrapperClassName="relative w-full max-w-[21rem] sm:w-[21rem]"
          buttonClassName="flex h-9 w-full items-center gap-2 rounded-md border border-black/10 bg-white px-3 text-left text-sm text-ink shadow-sm shadow-black/[0.02] outline-none transition-colors hover:bg-white/90 focus:border-brand focus:ring-2 focus:ring-brand/15"
        />

        <details className="group relative">
          <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-md border border-black/10 bg-white px-3 text-sm text-ink/75 shadow-sm shadow-black/[0.02] hover:text-ink [&::-webkit-details-marker]:hidden">
            <span>
              Service / Facility
              {selectedBookingFilterCount > 0
                ? ` (${selectedBookingFilterCount})`
                : ""}
            </span>
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rotate-45 border-b border-r border-ink/45"
            />
          </summary>

          <div className="absolute left-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-black/10 bg-white p-2 shadow-lg shadow-black/10">
            <div className="max-h-72 overflow-y-auto">
              <fieldset>
                <legend className="px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink/50">
                  Services
                </legend>
                {serviceOptions.map((service) => (
                  <label
                    className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm text-ink/75 hover:bg-surface"
                    key={service.key}
                  >
                    <input
                      className="mt-0.5 h-4 w-4 rounded border-black/20 text-brand focus:ring-brand/20"
                      defaultChecked={filters.serviceKeys.includes(service.key)}
                      name="service"
                      type="checkbox"
                      value={service.key}
                    />
                    <span>{service.name}</span>
                  </label>
                ))}
              </fieldset>

              <fieldset className="mt-2 border-t border-black/5 pt-2">
                <legend className="px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink/50">
                  Facilities
                </legend>
                {facilityOptions.map((facility) => (
                  <label
                    className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm text-ink/75 hover:bg-surface"
                    key={facility.id}
                  >
                    <input
                      className="mt-0.5 h-4 w-4 rounded border-black/20 text-brand focus:ring-brand/20"
                      defaultChecked={filters.facilityIds.includes(facility.id)}
                      name="facility"
                      type="checkbox"
                      value={facility.id}
                    />
                    <span>{facility.name}</span>
                  </label>
                ))}
              </fieldset>
            </div>
          </div>
        </details>

        <button
          className="h-9 rounded-md bg-brand px-4 text-sm font-medium text-white shadow-sm shadow-black/[0.04] hover:bg-brand/90"
          type="submit"
        >
          Apply
        </button>

        {hasActiveFilters && (
          <Link
            className="flex h-9 items-center rounded-md px-3 text-sm font-medium text-ink/55 hover:bg-surface hover:text-ink"
            href="/?tab=upcoming-bookings"
          >
            Clear
          </Link>
        )}
      </form>

      {bookings.length === 0 ? (
        <div className="rounded-lg border border-black/5 bg-surface px-6 py-10 text-center text-sm text-ink/60">
          No upcoming bookings.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-black/5">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-surface text-[11px] uppercase tracking-[0.14em] text-ink/50">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Type</th>
                <th className="px-5 py-3 text-left font-medium">Date</th>
                <th className="px-5 py-3 text-left font-medium">Time</th>
                <th className="px-5 py-3 text-left font-medium">Booking</th>
                <th className="px-5 py-3 text-left font-medium">Guest</th>
                <th className="px-5 py-3 text-left font-medium">Room</th>
                <th className="px-5 py-3 text-left font-medium">Detail</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr
                  key={`${booking.type}-${booking.bookingId}`}
                  className={
                    booking.isRecentlyChanged
                      ? "border-2 border-red-500"
                      : "border-t border-black/5"
                  }
                >
                  <td className="px-5 py-3">
                    <BookingTypeBadge type={booking.type} />
                  </td>
                  <td className="px-5 py-3 text-ink">
                    {formatBookingDate(booking.bookingDate)}
                  </td>
                  <td className="px-5 py-3 text-ink/80">
                    {formatTime(booking)}
                  </td>
                  <td className="px-5 py-3 text-ink">{booking.name}</td>
                  <td className="px-5 py-3 text-ink/80">
                    {booking.guestName}
                    {booking.guestName !== booking.guestUsername && (
                      <span className="ml-1 text-xs text-ink/45">
                        ({booking.guestUsername})
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-ink/80">
                    {formatValue(booking.roomNumber)}
                  </td>
                  <td className="px-5 py-3 text-ink/80">
                    {formatBookingStatus(booking)}
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

function BookingTypeBadge({ type }: { type: UpcomingBooking["type"] }) {
  const label = type === "facility" ? "Facility" : "Service";
  const className =
    type === "facility"
      ? "bg-sky-50 text-sky-800"
      : "bg-emerald-50 text-emerald-800";

  return (
    <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

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

function formatTime(booking: UpcomingBooking) {
  return booking.startTime;
}

function formatBookingStatus(booking: UpcomingBooking) {
  if (booking.isDone) return "Done";
  if (booking.isRead) return "Read";
  return "Unread";
}

function formatValue(value: string | null | undefined): string {
  return value || "-";
}
