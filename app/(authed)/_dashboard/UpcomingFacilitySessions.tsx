import type { UpcomingBooking } from "@/src/lib/bookings";

export default function UpcomingFacilitySessions({
  bookings,
}: {
  bookings: UpcomingBooking[];
}) {
  return (
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
                <tr key={booking.bookingId} className="border-t border-black/5">
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

function formatTimeRange(startTime: string, durationMinutes: number) {
  const [hh, mm] = startTime.split(":").map(Number);
  const start = new Date();
  start.setHours(hh, mm, 0, 0);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const fmt = (date: Date) =>
    `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes(),
    ).padStart(2, "0")}`;
  return `${fmt(start)} \u2013 ${fmt(end)}`;
}
