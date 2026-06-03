import type { UpcomingBooking } from "@/src/lib/bookings";

export default function UpcomingBookings({
  bookings,
}: {
  bookings: UpcomingBooking[];
}) {
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-ink">Upcoming bookings</h2>
        <span className="text-xs text-ink/50">
          {bookings.length} {bookings.length === 1 ? "booking" : "bookings"}
        </span>
      </div>

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
