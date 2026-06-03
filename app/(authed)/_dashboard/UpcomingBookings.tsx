import Link from "next/link";
import CalendarDateField from "@/app/components/CalendarDateField";
import type { UpcomingBooking } from "@/src/lib/bookings";
import type {
  BookablePackageService,
  ServiceBookingKey,
} from "@/src/lib/service-bookings";

type UpcomingBookingFilterState = {
  bookingDate?: string;
  serviceKeys: ServiceBookingKey[];
};

export default function UpcomingBookings({
  bookings,
  filters,
  serviceOptions,
  today,
}: {
  bookings: UpcomingBooking[];
  filters: UpcomingBookingFilterState;
  serviceOptions: BookablePackageService[];
  today: string;
}) {
  const selectedServiceCount = filters.serviceKeys.length;
  const hasActiveFilters = Boolean(filters.bookingDate) || selectedServiceCount > 0;

  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-ink">Upcoming bookings</h2>
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
        <CalendarDateField
          id="upcoming-booking-date-filter"
          name="date"
          defaultValue={filters.bookingDate ?? ""}
          minDate={today}
          prefix="Date"
          wrapperClassName="relative"
          buttonClassName="flex h-9 w-[15.5rem] items-center gap-2 rounded-md border border-black/10 bg-white px-3 text-left text-sm text-ink shadow-sm shadow-black/[0.02] outline-none transition-colors hover:bg-white/90 focus:border-brand focus:ring-2 focus:ring-brand/15"
        />

        <details className="group relative">
          <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-md border border-black/10 bg-white px-3 text-sm text-ink/75 shadow-sm shadow-black/[0.02] hover:text-ink [&::-webkit-details-marker]:hidden">
            <span>
              Services
              {selectedServiceCount > 0 ? ` (${selectedServiceCount})` : ""}
            </span>
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rotate-45 border-b border-r border-ink/45"
            />
          </summary>

          <div className="absolute left-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-black/10 bg-white p-2 shadow-lg shadow-black/10">
            <fieldset>
              <legend className="px-2 py-1 text-xs font-medium uppercase tracking-[0.12em] text-ink/45">
                Services
              </legend>
              <div className="max-h-72 overflow-y-auto">
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
              </div>
            </fieldset>
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
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-surface text-[11px] uppercase tracking-[0.14em] text-ink/50">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Type</th>
                <th className="px-5 py-3 text-left font-medium">Date</th>
                <th className="px-5 py-3 text-left font-medium">Time</th>
                <th className="px-5 py-3 text-left font-medium">Booking</th>
                <th className="px-5 py-3 text-left font-medium">Guest</th>
                <th className="px-5 py-3 text-left font-medium">Detail</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr
                  key={`${booking.type}-${booking.bookingId}`}
                  className="border-t border-black/5"
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
                    {booking.type === "facility"
                      ? `${booking.bookedPax} / ${booking.capacityPax} pax`
                      : booking.isDone
                        ? "Done"
                        : booking.isRead
                          ? "Read"
                          : "Unread"}
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
  if (booking.durationMinutes === null) return booking.startTime;

  const [hh, mm] = booking.startTime.split(":").map(Number);
  const start = new Date();
  start.setHours(hh, mm, 0, 0);
  const end = new Date(start.getTime() + booking.durationMinutes * 60_000);
  const fmt = (date: Date) =>
    `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes(),
    ).padStart(2, "0")}`;
  return `${fmt(start)} - ${fmt(end)}`;
}
