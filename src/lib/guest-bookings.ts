import { db } from "./db";
import type { GuestProfileStatus } from "./guest-profile-types";

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
  id: number;
  packageEntitlementSnapshotJson: string | null;
  status: GuestProfileStatus;
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
  adminRead: number;
  adminDone: number;
  adminDoneAt: string | null;
};

type FacilityBookingByProfileRow = FacilityBookingRow & {
  profileId: number;
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

type ServiceBookingByProfileRow = ServiceBookingRow & {
  profileId: number;
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
          b.booking_time AS bookingTime,
          b.admin_read AS adminRead,
          b.admin_done AS adminDone,
          b.admin_done_at AS adminDoneAt
        FROM facility_bookings b
        JOIN facilities f ON f.id = b.facility_id
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
    ...facilityBookings.map(mapFacilityBookingChecklistItem),
    ...serviceBookings.map(mapServiceBookingChecklistItem),
  ].sort(compareGuestBookingChecklistItems);
}

export function listGuestBookingChecklistsByProfileIds(
  profileIds: number[],
): Map<number, GuestBookingChecklistItem[]> {
  const validProfileIds = getValidProfileIds(profileIds);
  const bookingsByProfileId = new Map<number, GuestBookingChecklistItem[]>();
  if (validProfileIds.length === 0) return bookingsByProfileId;

  const placeholders = validProfileIds.map(() => "?").join(", ");
  const facilityBookings = db
    .prepare(
      `
        SELECT
          gp.id AS profileId,
          b.id,
          f.name,
          b.booking_date AS bookingDate,
          b.booking_time AS bookingTime,
          b.admin_read AS adminRead,
          b.admin_done AS adminDone,
          b.admin_done_at AS adminDoneAt
        FROM guest_profiles gp
        JOIN facility_bookings b ON b.user_id = gp.user_id
        JOIN facilities f ON f.id = b.facility_id
        WHERE gp.id IN (${placeholders})
          AND b.status = 'booked'
      `,
    )
    .all(...validProfileIds) as FacilityBookingByProfileRow[];

  const serviceBookings = db
    .prepare(
      `
        SELECT
          gp.id AS profileId,
          b.id,
          b.service_name AS name,
          b.booking_date AS bookingDate,
          b.booking_time AS bookingTime,
          b.admin_read AS adminRead,
          b.admin_done AS adminDone,
          b.admin_done_at AS adminDoneAt
        FROM guest_profiles gp
        JOIN guest_service_bookings b ON b.guest_profile_id = gp.id
        WHERE gp.id IN (${placeholders})
          AND gp.user_id IS NOT NULL
          AND b.status = 'booked'
      `,
    )
    .all(...validProfileIds) as ServiceBookingByProfileRow[];

  for (const booking of facilityBookings) {
    addBookingChecklistItem(
      bookingsByProfileId,
      booking.profileId,
      mapFacilityBookingChecklistItem(booking),
    );
  }

  for (const booking of serviceBookings) {
    addBookingChecklistItem(
      bookingsByProfileId,
      booking.profileId,
      mapServiceBookingChecklistItem(booking),
    );
  }

  for (const bookings of bookingsByProfileId.values()) {
    bookings.sort(compareGuestBookingChecklistItems);
  }

  return bookingsByProfileId;
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

export function listUnreadGuestBookingProfileIds(profileIds: number[]): Set<number> {
  const validProfileIds = getValidProfileIds(profileIds);
  const unreadProfileIds = new Set<number>();
  if (validProfileIds.length === 0) return unreadProfileIds;

  const placeholders = validProfileIds.map(() => "?").join(", ");
  const rows = db
    .prepare(
      `
        SELECT gp.id AS profileId
        FROM guest_profiles gp
        JOIN facility_bookings b ON b.user_id = gp.user_id
        WHERE gp.id IN (${placeholders})
          AND b.status = 'booked'
          AND b.admin_read = 0
        UNION
        SELECT gp.id AS profileId
        FROM guest_profiles gp
        JOIN guest_service_bookings b ON b.guest_profile_id = gp.id
        WHERE gp.id IN (${placeholders})
          AND gp.user_id IS NOT NULL
          AND b.status = 'booked'
          AND b.admin_read = 0
      `,
    )
    .all(...validProfileIds, ...validProfileIds) as { profileId: number }[];

  for (const row of rows) {
    unreadProfileIds.add(Number(row.profileId));
  }

  return unreadProfileIds;
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
        SELECT
          id,
          user_id AS userId,
          status,
          package_entitlement_snapshot_json AS packageEntitlementSnapshotJson
        FROM guest_profiles
        WHERE id = ?
      `,
    )
    .get(profileId) as GuestProfileUserRow | undefined;

  return row ?? null;
}

function mapFacilityBookingChecklistItem(
  booking: FacilityBookingRow,
): GuestBookingChecklistItem {
  return {
    id: Number(booking.id),
    type: "facility",
    name: booking.name,
    bookingDate: booking.bookingDate,
    bookingTime: booking.bookingTime,
    detail: null,
    isRead: booking.adminRead === 1,
    isDone: booking.adminDone === 1,
    doneAt: booking.adminDoneAt,
  };
}

function mapServiceBookingChecklistItem(
  booking: ServiceBookingRow,
): GuestBookingChecklistItem {
  return {
    id: Number(booking.id),
    type: "service",
    name: booking.name,
    bookingDate: booking.bookingDate,
    bookingTime: booking.bookingTime,
    detail: null,
    isRead: booking.adminRead === 1,
    isDone: booking.adminDone === 1,
    doneAt: booking.adminDoneAt,
  };
}

function addBookingChecklistItem(
  bookingsByProfileId: Map<number, GuestBookingChecklistItem[]>,
  profileId: number,
  booking: GuestBookingChecklistItem,
): void {
  const bookings = bookingsByProfileId.get(profileId);
  if (bookings) {
    bookings.push(booking);
  } else {
    bookingsByProfileId.set(profileId, [booking]);
  }
}

function compareGuestBookingChecklistItems(
  a: GuestBookingChecklistItem,
  b: GuestBookingChecklistItem,
): number {
  const aTime = `${a.bookingDate} ${a.bookingTime}`;
  const bTime = `${b.bookingDate} ${b.bookingTime}`;
  return aTime.localeCompare(bTime) || a.type.localeCompare(b.type) || a.id - b.id;
}

function getValidProfileIds(profileIds: number[]): number[] {
  return [
    ...new Set(
      profileIds.filter((profileId) => Number.isInteger(profileId) && profileId > 0),
    ),
  ];
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
