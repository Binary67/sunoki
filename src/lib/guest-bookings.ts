import { db } from "./db";

export type GuestBookingType = "facility" | "service";
export type GuestBookingStatusField = "read" | "done";

export type GuestBookingChecklistItem = {
  id: number;
  type: GuestBookingType;
  name: string;
  bookingDate: string;
  bookingTime: string;
  detail: string | null;
  isRead: boolean;
  isDone: boolean;
  doneAt: string | null;
};

type GuestProfileUserRow = {
  userId: number | null;
};

type BookingStatusRow = {
  adminRead: number;
  adminDone: number;
};

type FacilityBookingRow = {
  id: number;
  name: string;
  bookingDate: string;
  bookingTime: string;
  durationMinutes: number;
  adminRead: number;
  adminDone: number;
  adminDoneAt: string | null;
};

type ServiceBookingRow = {
  id: number;
  name: string;
  bookingDate: string;
  bookingTime: string;
  adminRead: number;
  adminDone: number;
  adminDoneAt: string | null;
};

export type UpdateGuestBookingStatusResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export function listGuestBookingChecklist(
  profileId: number,
): GuestBookingChecklistItem[] {
  const profile = getGuestProfileUser(profileId);
  if (!profile?.userId) return [];

  const facilityBookings = db
    .prepare(
      `
        SELECT
          b.id,
          f.name,
          b.booking_date AS bookingDate,
          s.start_time AS bookingTime,
          s.duration_minutes AS durationMinutes,
          b.admin_read AS adminRead,
          b.admin_done AS adminDone,
          b.admin_done_at AS adminDoneAt
        FROM facility_bookings b
        JOIN facility_time_slots s ON s.id = b.facility_time_slot_id
        JOIN facilities f ON f.id = s.facility_id
        WHERE b.user_id = ?
          AND b.status = 'booked'
      `,
    )
    .all(profile.userId) as FacilityBookingRow[];

  const serviceBookings = db
    .prepare(
      `
        SELECT
          id,
          service_name AS name,
          booking_date AS bookingDate,
          booking_time AS bookingTime,
          admin_read AS adminRead,
          admin_done AS adminDone,
          admin_done_at AS adminDoneAt
        FROM guest_service_bookings
        WHERE guest_profile_id = ?
          AND status = 'booked'
      `,
    )
    .all(profileId) as ServiceBookingRow[];

  return [
    ...facilityBookings.map((booking) => ({
      id: Number(booking.id),
      type: "facility" as const,
      name: booking.name,
      bookingDate: booking.bookingDate,
      bookingTime: booking.bookingTime,
      detail: `${Number(booking.durationMinutes)} min`,
      isRead: booking.adminRead === 1,
      isDone: booking.adminDone === 1,
      doneAt: booking.adminDoneAt,
    })),
    ...serviceBookings.map((booking) => ({
      id: Number(booking.id),
      type: "service" as const,
      name: booking.name,
      bookingDate: booking.bookingDate,
      bookingTime: booking.bookingTime,
      detail: null,
      isRead: booking.adminRead === 1,
      isDone: booking.adminDone === 1,
      doneAt: booking.adminDoneAt,
    })),
  ].sort((a, b) => {
    const aTime = `${a.bookingDate} ${a.bookingTime}`;
    const bTime = `${b.bookingDate} ${b.bookingTime}`;
    return aTime.localeCompare(bTime) || a.type.localeCompare(b.type) || a.id - b.id;
  });
}

export function hasUnreadGuestBookings(profileId: number): boolean {
  const profile = getGuestProfileUser(profileId);
  if (!profile?.userId) return false;

  const row = db
    .prepare(
      `
        SELECT 1 AS unread
        FROM facility_bookings
        WHERE user_id = ?
          AND status = 'booked'
          AND admin_read = 0
        UNION ALL
        SELECT 1 AS unread
        FROM guest_service_bookings
        WHERE guest_profile_id = ?
          AND status = 'booked'
          AND admin_read = 0
        LIMIT 1
      `,
    )
    .get(profile.userId, profileId) as { unread: number } | undefined;

  return Boolean(row);
}

export function updateGuestBookingStatus({
  bookingId,
  checked,
  field,
  profileId,
  type,
}: {
  bookingId: number;
  checked: boolean;
  field: GuestBookingStatusField;
  profileId: number;
  type: GuestBookingType;
}): UpdateGuestBookingStatusResult {
  if (!Number.isInteger(profileId) || profileId <= 0) {
    return { ok: false, message: "Choose a valid guest profile." };
  }
  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return { ok: false, message: "Choose a valid booking." };
  }

  const profile = getGuestProfileUser(profileId);
  if (!profile?.userId) {
    return { ok: false, message: "Guest profile has no linked account." };
  }

  const booking =
    type === "facility"
      ? getFacilityBookingStatus(bookingId, profile.userId)
      : getServiceBookingStatus(bookingId, profileId);
  if (!booking) {
    return { ok: false, message: "Booking not found." };
  }

  if (field === "read") {
    if (!checked && booking.adminDone === 1) {
      return {
        ok: false,
        message: "Uncheck Done before marking this booking unread.",
      };
    }
    updateBookingColumn(type, bookingId, "admin_read", checked ? 1 : 0);
    return { ok: true, message: "Booking status updated." };
  }

  if (checked && booking.adminRead !== 1) {
    return {
      ok: false,
      message: "Mark the booking as read before marking it done.",
    };
  }

  updateBookingDone(type, bookingId, checked);
  return { ok: true, message: "Booking status updated." };
}

function getGuestProfileUser(profileId: number): GuestProfileUserRow | null {
  const row = db
    .prepare(
      `
        SELECT user_id AS userId
        FROM guest_profiles
        WHERE id = ?
      `,
    )
    .get(profileId) as GuestProfileUserRow | undefined;

  return row ?? null;
}

function getFacilityBookingStatus(
  bookingId: number,
  userId: number,
): BookingStatusRow | null {
  const row = db
    .prepare(
      `
        SELECT
          admin_read AS adminRead,
          admin_done AS adminDone
        FROM facility_bookings
        WHERE id = ?
          AND user_id = ?
          AND status = 'booked'
      `,
    )
    .get(bookingId, userId) as BookingStatusRow | undefined;

  return row ?? null;
}

function getServiceBookingStatus(
  bookingId: number,
  profileId: number,
): BookingStatusRow | null {
  const row = db
    .prepare(
      `
        SELECT
          admin_read AS adminRead,
          admin_done AS adminDone
        FROM guest_service_bookings
        WHERE id = ?
          AND guest_profile_id = ?
          AND status = 'booked'
      `,
    )
    .get(bookingId, profileId) as BookingStatusRow | undefined;

  return row ?? null;
}

function updateBookingColumn(
  type: GuestBookingType,
  bookingId: number,
  column: "admin_read",
  value: number,
): void {
  db.prepare(
    `
      UPDATE ${getBookingTableName(type)}
      SET ${column} = ?
      WHERE id = ?
    `,
  ).run(value, bookingId);
}

function updateBookingDone(
  type: GuestBookingType,
  bookingId: number,
  done: boolean,
): void {
  db.prepare(
    `
      UPDATE ${getBookingTableName(type)}
      SET admin_done = ?,
          admin_done_at = ${done ? "datetime('now')" : "NULL"}
      WHERE id = ?
    `,
  ).run(done ? 1 : 0, bookingId);
}

function getBookingTableName(type: GuestBookingType): string {
  return type === "facility" ? "facility_bookings" : "guest_service_bookings";
}
