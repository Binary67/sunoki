import { db } from "./db";
import { isBookingDate, isWithinBookingDateRange } from "./booking-dates";
import type { UserRole } from "./roles";

export type FacilitySlotAvailability = {
  id: number;
  startTime: string;
  durationMinutes: number;
  capacityPax: number;
  bookedPax: number;
  paxLeft: number;
  isAvailable: boolean;
};

export type FacilityAvailability = {
  id: number;
  slug: string;
  name: string;
  slots: FacilitySlotAvailability[];
};

type FacilityRow = {
  id: number;
  slug: string;
  name: string;
};

type SlotAvailabilityRow = {
  id: number;
  startTime: string;
  durationMinutes: number;
  capacityPax: number;
  bookedPax: number;
};

type SlotRow = {
  id: number;
  startTime: string;
  capacityPax: number;
};

type BookingUserRow = {
  role: UserRole;
  checkInDate: string | null;
  checkOutDate: string | null;
};

type CountRow = {
  bookedPax: number;
};

function hasSlotStarted(bookingDate: string, startTime: string, now = new Date()) {
  const [year, month, day] = bookingDate.split("-").map(Number);
  const [hour, minute] = startTime.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute) <= now;
}

export function getFacilityAvailability(
  facilitySlug: string,
  bookingDate: string,
): FacilityAvailability | null {
  if (!isBookingDate(bookingDate)) return null;

  const facility = db
    .prepare("SELECT id, slug, name FROM facilities WHERE slug = ?")
    .get(facilitySlug) as FacilityRow | undefined;

  if (!facility) return null;

  const rows = db
    .prepare(
      `
        SELECT
          s.id,
          s.start_time AS startTime,
          s.duration_minutes AS durationMinutes,
          s.capacity_pax AS capacityPax,
          COUNT(b.id) AS bookedPax
        FROM facility_time_slots s
        LEFT JOIN facility_bookings b
          ON b.facility_time_slot_id = s.id
         AND b.booking_date = ?
        WHERE s.facility_id = ?
          AND s.active = 1
        GROUP BY s.id
        ORDER BY s.start_time
      `,
    )
    .all(bookingDate, facility.id) as SlotAvailabilityRow[];

  return {
    ...facility,
    slots: rows.map((row) => {
      const bookedPax = Number(row.bookedPax);
      const capacityPax = Number(row.capacityPax);
      const paxLeft = Math.max(0, capacityPax - bookedPax);
      return {
        id: row.id,
        startTime: row.startTime,
        durationMinutes: Number(row.durationMinutes),
        capacityPax,
        bookedPax,
        paxLeft,
        isAvailable: paxLeft > 0,
      };
    }),
  };
}

export type UpcomingBooking = {
  bookingId: number;
  facilitySlug: string;
  facilityName: string;
  bookingDate: string;
  startTime: string;
  durationMinutes: number;
  guestUsername: string;
  capacityPax: number;
  bookedPax: number;
};

type UpcomingBookingRow = {
  bookingId: number;
  facilitySlug: string;
  facilityName: string;
  bookingDate: string;
  startTime: string;
  durationMinutes: number;
  guestUsername: string;
  capacityPax: number;
  bookedPax: number;
};

function formatNowForSqlite(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

export function getUpcomingBookings(now: Date = new Date()): UpcomingBooking[] {
  const cutoff = formatNowForSqlite(now);

  const rows = db
    .prepare(
      `
        SELECT
          b.id              AS bookingId,
          f.slug            AS facilitySlug,
          f.name            AS facilityName,
          b.booking_date    AS bookingDate,
          s.start_time      AS startTime,
          s.duration_minutes AS durationMinutes,
          u.username        AS guestUsername,
          s.capacity_pax    AS capacityPax,
          (
            SELECT COUNT(*)
            FROM facility_bookings b2
            WHERE b2.facility_time_slot_id = b.facility_time_slot_id
              AND b2.booking_date = b.booking_date
          ) AS bookedPax
        FROM facility_bookings b
        JOIN facility_time_slots s ON s.id = b.facility_time_slot_id
        JOIN facilities f ON f.id = s.facility_id
        JOIN users u ON u.id = b.user_id
        WHERE (b.booking_date || ' ' || s.start_time) >= ?
        ORDER BY b.booking_date ASC, s.start_time ASC, b.id ASC
      `,
    )
    .all(cutoff) as UpcomingBookingRow[];

  return rows.map((row) => ({
    bookingId: Number(row.bookingId),
    facilitySlug: row.facilitySlug,
    facilityName: row.facilityName,
    bookingDate: row.bookingDate,
    startTime: row.startTime,
    durationMinutes: Number(row.durationMinutes),
    guestUsername: row.guestUsername,
    capacityPax: Number(row.capacityPax),
    bookedPax: Number(row.bookedPax),
  }));
}

export type CreateFacilityBookingInput = {
  userId: number;
  facilitySlug: string;
  bookingDate: string;
  timeSlotId: number;
};

export type CreateFacilityBookingResult =
  | { ok: true; startTime: string }
  | { ok: false; error: string };

export function createFacilityBooking({
  userId,
  facilitySlug,
  bookingDate,
  timeSlotId,
}: CreateFacilityBookingInput): CreateFacilityBookingResult {
  if (!isBookingDate(bookingDate) || !Number.isInteger(timeSlotId)) {
    return { ok: false, error: "Choose a valid date and time slot." };
  }

  let inTransaction = false;

  try {
    db.exec("BEGIN IMMEDIATE");
    inTransaction = true;

    const bookingUser = db
      .prepare(
        `
          SELECT
            role,
            check_in_date AS checkInDate,
            check_out_date AS checkOutDate
          FROM users
          WHERE id = ?
        `,
      )
      .get(userId) as BookingUserRow | undefined;

    if (!bookingUser) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return { ok: false, error: "Sign in before reserving a time slot." };
    }

    if (bookingUser.role === "guest") {
      const checkInDate = bookingUser.checkInDate;
      const checkOutDate = bookingUser.checkOutDate;

      if (
        !checkInDate ||
        !checkOutDate ||
        !isBookingDate(checkInDate) ||
        !isBookingDate(checkOutDate) ||
        checkOutDate < checkInDate
      ) {
        db.exec("ROLLBACK");
        inTransaction = false;
        return {
          ok: false,
          error: "Your stay dates are not set up for booking.",
        };
      }

      if (!isWithinBookingDateRange(bookingDate, checkInDate, checkOutDate)) {
        db.exec("ROLLBACK");
        inTransaction = false;
        return { ok: false, error: "Choose a date within your stay dates." };
      }
    }

    const slot = db
      .prepare(
        `
          SELECT
            s.id,
            s.start_time AS startTime,
            s.capacity_pax AS capacityPax
          FROM facility_time_slots s
          JOIN facilities f ON f.id = s.facility_id
          WHERE s.id = ?
            AND f.slug = ?
            AND s.active = 1
        `,
      )
      .get(timeSlotId, facilitySlug) as SlotRow | undefined;

    if (!slot) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return { ok: false, error: "Choose a valid date and time slot." };
    }

    if (hasSlotStarted(bookingDate, slot.startTime)) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return { ok: false, error: "Choose an upcoming date and time slot." };
    }

    const existing = db
      .prepare(
        `
          SELECT id
          FROM facility_bookings
          WHERE user_id = ?
            AND facility_time_slot_id = ?
            AND booking_date = ?
        `,
      )
      .get(userId, timeSlotId, bookingDate);

    if (existing) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return { ok: false, error: "You already booked this time slot." };
    }

    const count = db
      .prepare(
        `
          SELECT COUNT(*) AS bookedPax
          FROM facility_bookings
          WHERE facility_time_slot_id = ?
            AND booking_date = ?
        `,
      )
      .get(timeSlotId, bookingDate) as CountRow;

    if (Number(count.bookedPax) >= Number(slot.capacityPax)) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return { ok: false, error: "This time slot is no longer available." };
    }

    db.prepare(
      `
        INSERT INTO facility_bookings (
          user_id,
          facility_time_slot_id,
          booking_date
        )
        VALUES (?, ?, ?)
      `,
    ).run(userId, timeSlotId, bookingDate);

    db.exec("COMMIT");
    inTransaction = false;
    return { ok: true, startTime: slot.startTime };
  } catch {
    if (inTransaction) db.exec("ROLLBACK");
    return { ok: false, error: "Unable to reserve this time slot." };
  }
}
