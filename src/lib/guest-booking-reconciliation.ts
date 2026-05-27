import { insertAuditLog } from "./admin-data/audit";
import type { AdminRow } from "./admin-data/definitions";
import { isBookingDate, isWithinBookingDateRange } from "./booking-dates";
import { db, type User } from "./db";
import type { GuestStayDates } from "./guest-profile-stay";

export type GuestBookingReconciliationResult = {
  facilityBookingsCancelled: number;
  serviceBookingsCancelled: number;
  futureCancelledBookingsRetained: number;
};

type FacilityBookingRow = {
  id: number;
  bookingDate: string;
  startTime: string;
};

type ServiceBookingRow = {
  id: number;
  bookingDate: string;
  bookingTime: string;
};

export function reconcileFutureGuestBookings({
  active,
  actor,
  stayDates,
  userId,
}: {
  active: 0 | 1;
  actor: User;
  stayDates: GuestStayDates;
  userId: number;
}): GuestBookingReconciliationResult {
  const now = new Date();
  const cancelledAt = formatDateTime(now);
  let facilityBookingsCancelled = 0;
  let serviceBookingsCancelled = 0;

  for (const booking of listBookedFacilityBookings(userId)) {
    if (!shouldCancelBooking(active, stayDates, booking, now)) continue;
    cancelFacilityBooking(actor, booking.id, cancelledAt);
    facilityBookingsCancelled += 1;
  }

  for (const booking of listBookedServiceBookings(userId)) {
    if (!shouldCancelBooking(active, stayDates, booking, now)) continue;
    cancelServiceBooking(actor, booking.id, cancelledAt);
    serviceBookingsCancelled += 1;
  }

  return {
    facilityBookingsCancelled,
    serviceBookingsCancelled,
    futureCancelledBookingsRetained: countFutureCancelledBookingsInStay(
      active,
      stayDates,
      userId,
      now,
    ),
  };
}

function listBookedFacilityBookings(userId: number): FacilityBookingRow[] {
  return db
    .prepare(
      `
        SELECT
          b.id,
          b.booking_date AS bookingDate,
          s.start_time AS startTime
        FROM facility_bookings b
        JOIN facility_time_slots s ON s.id = b.facility_time_slot_id
        WHERE b.user_id = ?
          AND b.status = 'booked'
      `,
    )
    .all(userId) as FacilityBookingRow[];
}

function listBookedServiceBookings(userId: number): ServiceBookingRow[] {
  return db
    .prepare(
      `
        SELECT
          id,
          booking_date AS bookingDate,
          booking_time AS bookingTime
        FROM guest_service_bookings
        WHERE user_id = ?
          AND status = 'booked'
      `,
    )
    .all(userId) as ServiceBookingRow[];
}

function shouldCancelBooking(
  active: 0 | 1,
  stayDates: GuestStayDates,
  booking: { bookingDate: string; startTime?: string; bookingTime?: string },
  now: Date,
): boolean {
  const time = booking.startTime ?? booking.bookingTime;
  if (!time || hasBookingStarted(booking.bookingDate, time, now)) return false;
  if (active !== 1) return true;
  if (!hasValidStayDates(stayDates)) return true;
  return !isWithinBookingDateRange(
    booking.bookingDate,
    stayDates.checkInDate,
    stayDates.checkOutDate,
  );
}

function cancelFacilityBooking(
  actor: User,
  bookingId: number,
  cancelledAt: string,
): void {
  const before = selectFacilityBookingAuditRow(bookingId);
  if (!before) throw new Error("Facility booking could not be loaded.");

  db.prepare(
    `
      UPDATE facility_bookings
      SET status = 'cancelled',
          cancelled_at = ?
      WHERE id = ?
        AND status = 'booked'
    `,
  ).run(cancelledAt, bookingId);

  const after = selectFacilityBookingAuditRow(bookingId);
  if (!after) throw new Error("Cancelled facility booking could not be loaded.");
  insertAuditLog(
    actor,
    "update",
    "facility_bookings",
    bookingId,
    before,
    after,
  );
}

function cancelServiceBooking(
  actor: User,
  bookingId: number,
  cancelledAt: string,
): void {
  const before = selectServiceBookingAuditRow(bookingId);
  if (!before) throw new Error("Service booking could not be loaded.");

  db.prepare(
    `
      UPDATE guest_service_bookings
      SET status = 'cancelled',
          cancelled_at = ?
      WHERE id = ?
        AND status = 'booked'
    `,
  ).run(cancelledAt, bookingId);

  const after = selectServiceBookingAuditRow(bookingId);
  if (!after) throw new Error("Cancelled service booking could not be loaded.");
  insertAuditLog(
    actor,
    "update",
    "guest_service_bookings",
    bookingId,
    before,
    after,
  );
}

function countFutureCancelledBookingsInStay(
  active: 0 | 1,
  stayDates: GuestStayDates,
  userId: number,
  now: Date,
): number {
  if (active !== 1 || !hasValidStayDates(stayDates)) return 0;

  const facilityRows = db
    .prepare(
      `
        SELECT
          b.booking_date AS bookingDate,
          s.start_time AS startTime
        FROM facility_bookings b
        JOIN facility_time_slots s ON s.id = b.facility_time_slot_id
        WHERE b.user_id = ?
          AND b.status = 'cancelled'
      `,
    )
    .all(userId) as FacilityBookingRow[];
  const serviceRows = db
    .prepare(
      `
        SELECT
          booking_date AS bookingDate,
          booking_time AS bookingTime
        FROM guest_service_bookings
        WHERE user_id = ?
          AND status = 'cancelled'
      `,
    )
    .all(userId) as ServiceBookingRow[];

  return [
    ...facilityRows.filter((booking) =>
      isFutureBookingWithinStay(booking, stayDates, now),
    ),
    ...serviceRows.filter((booking) =>
      isFutureBookingWithinStay(booking, stayDates, now),
    ),
  ].length;
}

function isFutureBookingWithinStay(
  booking: { bookingDate: string; startTime?: string; bookingTime?: string },
  stayDates: GuestStayDates,
  now: Date,
): boolean {
  const time = booking.startTime ?? booking.bookingTime;
  return Boolean(
    time &&
      !hasBookingStarted(booking.bookingDate, time, now) &&
      stayDates.checkInDate &&
      stayDates.checkOutDate &&
      isWithinBookingDateRange(
        booking.bookingDate,
        stayDates.checkInDate,
        stayDates.checkOutDate,
      ),
  );
}

function selectFacilityBookingAuditRow(bookingId: number): AdminRow | null {
  const row = db
    .prepare(
      `
        SELECT
          id,
          user_id,
          facility_time_slot_id,
          booking_date,
          status,
          admin_read,
          admin_done,
          admin_done_at,
          cancelled_at,
          created_at
        FROM facility_bookings
        WHERE id = ?
      `,
    )
    .get(bookingId) as AdminRow | undefined;

  return row ? { ...row } : null;
}

function selectServiceBookingAuditRow(bookingId: number): AdminRow | null {
  const row = db
    .prepare(
      `
        SELECT
          id,
          user_id,
          guest_profile_id,
          service_key,
          service_name,
          booking_date,
          booking_time,
          status,
          admin_read,
          admin_done,
          admin_done_at,
          cancelled_at,
          created_at
        FROM guest_service_bookings
        WHERE id = ?
      `,
    )
    .get(bookingId) as AdminRow | undefined;

  return row ? { ...row } : null;
}

function hasValidStayDates(
  stayDates: GuestStayDates,
): stayDates is { checkInDate: string; checkOutDate: string } {
  return Boolean(
    stayDates.checkInDate &&
      stayDates.checkOutDate &&
      isBookingDate(stayDates.checkInDate) &&
      isBookingDate(stayDates.checkOutDate) &&
      stayDates.checkOutDate >= stayDates.checkInDate,
  );
}

function hasBookingStarted(
  bookingDate: string,
  bookingTime: string,
  now: Date,
): boolean {
  const [year, month, day] = bookingDate.split("-").map(Number);
  const [hour, minute] = bookingTime.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute) <= now;
}

function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}
