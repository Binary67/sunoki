import { insertAuditLog } from "./admin-data/audit";
import type { AdminRow } from "./admin-data/definitions";
import { db, type User } from "./db";
import { isBookingDate, isWithinBookingDateRange } from "./booking-dates";
import type { UserRole } from "./roles";
import type { ServiceBookingKey } from "./service-bookings/catalog";

export type FacilityBookingOption = {
  id: number;
  name: string;
};

type FacilityRow = FacilityBookingOption;

type FacilityBookingUserRow = {
  role: UserRole;
  active: number;
  checkInDate: string | null;
  checkOutDate: string | null;
  guestProfileId: number | null;
  guestProfileStatus: string | null;
};

type ExistingRow = {
  id: number;
};

function hasBookingStarted(
  bookingDate: string,
  bookingTime: string,
  now = new Date(),
) {
  const [year, month, day] = bookingDate.split("-").map(Number);
  const [hour, minute] = bookingTime.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute) <= now;
}

function isBookingTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export type UpcomingBookingType = "facility" | "service";

export type UpcomingBooking = {
  type: UpcomingBookingType;
  bookingId: number;
  serviceKey: ServiceBookingKey | null;
  name: string;
  bookingDate: string;
  startTime: string;
  guestName: string;
  guestUsername: string;
  roomNumber: string | null;
  isRead: boolean;
  isDone: boolean;
};

type UpcomingFacilityBookingRow = {
  bookingId: number;
  name: string;
  bookingDate: string;
  startTime: string;
  guestName: string | null;
  guestUsername: string;
  roomNumber: string | null;
  adminRead: number;
  adminDone: number;
};

type UpcomingServiceBookingRow = {
  bookingId: number;
  serviceKey: ServiceBookingKey;
  name: string;
  bookingDate: string;
  startTime: string;
  guestName: string | null;
  guestUsername: string;
  roomNumber: string | null;
  adminRead: number;
  adminDone: number;
};

export type UpcomingBookingFilters = {
  bookingDate?: string;
  facilityIds?: number[];
  serviceKeys?: ServiceBookingKey[];
};

function formatNowForSqlite(now: Date): { date: string; time: string } {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  return { date: `${year}-${month}-${day}`, time: `${hour}:${minute}` };
}

export function getUpcomingBookings(
  filters: UpcomingBookingFilters = {},
  now: Date = new Date(),
): UpcomingBooking[] {
  const cutoff = formatNowForSqlite(now);
  const facilityIds = filters.facilityIds ?? [];
  const serviceKeys = filters.serviceKeys ?? [];
  const hasFacilityFilters = facilityIds.length > 0;
  const hasServiceFilters = serviceKeys.length > 0;
  const includeFacilities = !hasServiceFilters || hasFacilityFilters;
  const includeServices = !hasFacilityFilters || hasServiceFilters;
  const facilityWhere = [
    "b.status = 'booked'",
    "(b.booking_date, b.booking_time) >= (?, ?)",
  ];
  const facilityParams: (string | number)[] = [cutoff.date, cutoff.time];
  const serviceWhere = [
    "b.status = 'booked'",
    "(b.booking_date, b.booking_time) >= (?, ?)",
  ];
  const serviceParams = [cutoff.date, cutoff.time];

  if (filters.bookingDate) {
    facilityWhere.push("b.booking_date = ?");
    facilityParams.push(filters.bookingDate);
    serviceWhere.push("b.booking_date = ?");
    serviceParams.push(filters.bookingDate);
  }

  if (facilityIds.length > 0) {
    facilityWhere.push(
      `b.facility_id IN (${facilityIds.map(() => "?").join(", ")})`,
    );
    facilityParams.push(...facilityIds);
  }

  if (serviceKeys.length > 0) {
    serviceWhere.push(
      `b.service_key IN (${serviceKeys.map(() => "?").join(", ")})`,
    );
    serviceParams.push(...serviceKeys);
  }

  const facilityRows: UpcomingFacilityBookingRow[] = includeFacilities
    ? (db
        .prepare(
          `
        SELECT
          b.id              AS bookingId,
          f.name            AS name,
          b.booking_date    AS bookingDate,
          b.booking_time    AS startTime,
          gp.name           AS guestName,
          gp.room_number    AS roomNumber,
          u.username        AS guestUsername,
          b.admin_read      AS adminRead,
          b.admin_done      AS adminDone
        FROM facility_bookings b
        JOIN facilities f ON f.id = b.facility_id
        JOIN users u ON u.id = b.user_id
        LEFT JOIN guest_profiles gp ON gp.id = b.guest_profile_id
        WHERE ${facilityWhere.join("\n          AND ")}
        ORDER BY b.booking_date ASC, b.booking_time ASC, b.id ASC
      `,
        )
        .all(...facilityParams) as UpcomingFacilityBookingRow[])
    : [];

  const serviceRows: UpcomingServiceBookingRow[] = includeServices
    ? (db
        .prepare(
          `
        SELECT
          b.id              AS bookingId,
          b.service_key     AS serviceKey,
          b.service_name    AS name,
          b.booking_date    AS bookingDate,
          b.booking_time    AS startTime,
          gp.name           AS guestName,
          gp.room_number    AS roomNumber,
          u.username        AS guestUsername,
          b.admin_read      AS adminRead,
          b.admin_done      AS adminDone
        FROM guest_service_bookings b
        JOIN users u ON u.id = b.user_id
        LEFT JOIN guest_profiles gp ON gp.id = b.guest_profile_id
        WHERE ${serviceWhere.join("\n          AND ")}
        ORDER BY b.booking_date ASC, b.booking_time ASC, b.id ASC
      `,
        )
        .all(...serviceParams) as UpcomingServiceBookingRow[])
    : [];

  return [
    ...facilityRows.map((row) => ({
      type: "facility" as const,
      bookingId: Number(row.bookingId),
      serviceKey: null,
      name: row.name,
      bookingDate: row.bookingDate,
      startTime: row.startTime,
      guestName: row.guestName ?? row.guestUsername,
      guestUsername: row.guestUsername,
      roomNumber: row.roomNumber,
      isRead: row.adminRead === 1,
      isDone: row.adminDone === 1,
    })),
    ...serviceRows.map((row) => ({
      type: "service" as const,
      bookingId: Number(row.bookingId),
      serviceKey: row.serviceKey,
      name: row.name,
      bookingDate: row.bookingDate,
      startTime: row.startTime,
      guestName: row.guestName ?? row.guestUsername,
      guestUsername: row.guestUsername,
      roomNumber: row.roomNumber,
      isRead: row.adminRead === 1,
      isDone: row.adminDone === 1,
    })),
  ].sort((a, b) => {
    const aTime = `${a.bookingDate} ${a.startTime}`;
    const bTime = `${b.bookingDate} ${b.startTime}`;
    return (
      aTime.localeCompare(bTime) ||
      a.type.localeCompare(b.type) ||
      a.bookingId - b.bookingId
    );
  });
}

export function listFacilityBookingOptions(): FacilityBookingOption[] {
  return (
    db
      .prepare("SELECT id, name FROM facilities ORDER BY name ASC, id ASC")
      .all() as FacilityRow[]
  ).map((facility) => ({
    id: Number(facility.id),
    name: facility.name,
  }));
}

export type CreateFacilityBookingInput = {
  auditActor?: User;
  userId: number;
  facilityId: number;
  bookingDate: string;
  bookingTime: string;
};

export type CreateFacilityBookingResult =
  | { ok: true; bookingId: number; facilityName: string }
  | { ok: false; error: string };

export type UpdateFacilityBookingInput = {
  auditActor: User;
  bookingId: number;
  userId: number;
  facilityId: number;
  bookingDate: string;
  bookingTime: string;
};

export type UpdateFacilityBookingResult =
  | { ok: true; bookingId: number; facilityName: string }
  | { ok: false; error: string };

export function createFacilityBooking({
  auditActor,
  userId,
  facilityId,
  bookingDate,
  bookingTime,
}: CreateFacilityBookingInput): CreateFacilityBookingResult {
  if (
    !Number.isInteger(userId) ||
    !Number.isInteger(facilityId) ||
    !isBookingDate(bookingDate) ||
    !isBookingTime(bookingTime)
  ) {
    return { ok: false, error: "Choose a valid facility date and time." };
  }
  if (hasBookingStarted(bookingDate, bookingTime)) {
    return { ok: false, error: "Choose an upcoming facility date and time." };
  }

  let inTransaction = false;

  try {
    db.exec("BEGIN IMMEDIATE");
    inTransaction = true;

    const bookingUser = getFacilityBookingUser(userId);
    if (!bookingUser) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return { ok: false, error: "Choose a valid guest." };
    }
    if (bookingUser.active !== 1) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return { ok: false, error: "Guest is inactive." };
    }
    if (bookingUser.role !== "guest") {
      db.exec("ROLLBACK");
      inTransaction = false;
      return { ok: false, error: "Facility bookings require a guest user." };
    }
    if (!bookingUser.guestProfileId) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return {
        ok: false,
        error: "The selected guest does not have a linked guest profile.",
      };
    }
    if (bookingUser.guestProfileStatus !== "checked_in") {
      db.exec("ROLLBACK");
      inTransaction = false;
      return {
        ok: false,
        error: "The selected guest must be checked in before booking facilities.",
      };
    }

    if (
      !bookingUser.checkInDate ||
      !bookingUser.checkOutDate ||
      !isBookingDate(bookingUser.checkInDate) ||
      !isBookingDate(bookingUser.checkOutDate) ||
      bookingUser.checkOutDate < bookingUser.checkInDate
    ) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return {
        ok: false,
        error: "The selected guest does not have valid stay dates.",
      };
    }
    if (
      !isWithinBookingDateRange(
        bookingDate,
        bookingUser.checkInDate,
        bookingUser.checkOutDate,
      )
    ) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return { ok: false, error: "Booking date must be within the guest stay dates." };
    }

    const facility = getFacility(facilityId);
    if (!facility) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return { ok: false, error: "Choose a valid facility." };
    }

    const existing = db
      .prepare(
        `
          SELECT id
          FROM facility_bookings
          WHERE facility_id = ?
            AND booking_date = ?
            AND booking_time = ?
            AND status = 'booked'
        `,
      )
      .get(facilityId, bookingDate, bookingTime) as ExistingRow | undefined;

    if (existing) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return {
        ok: false,
        error: "This facility is already booked at that date and time.",
      };
    }

    const result = db.prepare(
      `
        INSERT INTO facility_bookings (
          user_id,
          guest_profile_id,
          facility_id,
          booking_date,
          booking_time
        )
        VALUES (?, ?, ?, ?, ?)
      `,
    ).run(
      userId,
      bookingUser.guestProfileId,
      facilityId,
      bookingDate,
      bookingTime,
    ) as { lastInsertRowid: number | bigint };

    const bookingId = Number(result.lastInsertRowid);
    if (auditActor) {
      const after = selectFacilityBookingAuditRow(bookingId);
      if (!after) throw new Error("Inserted facility booking could not be loaded.");
      insertAuditLog(
        auditActor,
        "insert",
        "facility_bookings",
        bookingId,
        null,
        after,
      );
    }

    db.exec("COMMIT");
    inTransaction = false;
    return { ok: true, bookingId, facilityName: facility.name };
  } catch {
    if (inTransaction) db.exec("ROLLBACK");
    return { ok: false, error: "Unable to book this facility." };
  }
}

export function updateFacilityBooking({
  auditActor,
  bookingId,
  userId,
  facilityId,
  bookingDate,
  bookingTime,
}: UpdateFacilityBookingInput): UpdateFacilityBookingResult {
  if (
    !Number.isInteger(bookingId) ||
    !Number.isInteger(userId) ||
    !Number.isInteger(facilityId) ||
    !isBookingDate(bookingDate) ||
    !isBookingTime(bookingTime)
  ) {
    return { ok: false, error: "Choose a valid facility date and time." };
  }
  if (hasBookingStarted(bookingDate, bookingTime)) {
    return { ok: false, error: "Choose an upcoming facility date and time." };
  }

  let inTransaction = false;

  try {
    db.exec("BEGIN IMMEDIATE");
    inTransaction = true;

    const before = selectFacilityBookingAuditRow(bookingId);
    if (!before) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return { ok: false, error: "Booking not found." };
    }
    if (before.status !== "booked") {
      db.exec("ROLLBACK");
      inTransaction = false;
      return { ok: false, error: "Only booked facility bookings can be edited." };
    }

    const bookingUser = getFacilityBookingUser(userId);
    if (!bookingUser) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return { ok: false, error: "Choose a valid guest." };
    }
    if (bookingUser.active !== 1) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return { ok: false, error: "Guest is inactive." };
    }
    if (bookingUser.role !== "guest") {
      db.exec("ROLLBACK");
      inTransaction = false;
      return { ok: false, error: "Facility bookings require a guest user." };
    }
    if (!bookingUser.guestProfileId) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return {
        ok: false,
        error: "The selected guest does not have a linked guest profile.",
      };
    }
    if (bookingUser.guestProfileStatus !== "checked_in") {
      db.exec("ROLLBACK");
      inTransaction = false;
      return {
        ok: false,
        error: "The selected guest must be checked in before booking facilities.",
      };
    }

    if (
      !bookingUser.checkInDate ||
      !bookingUser.checkOutDate ||
      !isBookingDate(bookingUser.checkInDate) ||
      !isBookingDate(bookingUser.checkOutDate) ||
      bookingUser.checkOutDate < bookingUser.checkInDate
    ) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return {
        ok: false,
        error: "The selected guest does not have valid stay dates.",
      };
    }
    if (
      !isWithinBookingDateRange(
        bookingDate,
        bookingUser.checkInDate,
        bookingUser.checkOutDate,
      )
    ) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return { ok: false, error: "Booking date must be within the guest stay dates." };
    }

    const facility = getFacility(facilityId);
    if (!facility) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return { ok: false, error: "Choose a valid facility." };
    }

    const existing = db
      .prepare(
        `
          SELECT id
          FROM facility_bookings
          WHERE facility_id = ?
            AND booking_date = ?
            AND booking_time = ?
            AND status = 'booked'
            AND id != ?
        `,
      )
      .get(
        facilityId,
        bookingDate,
        bookingTime,
        bookingId,
      ) as ExistingRow | undefined;

    if (existing) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return {
        ok: false,
        error: "This facility is already booked at that date and time.",
      };
    }

    db.prepare(
      `
        UPDATE facility_bookings
        SET user_id = ?,
            guest_profile_id = ?,
            facility_id = ?,
            booking_date = ?,
            booking_time = ?
        WHERE id = ?
      `,
    ).run(
      userId,
      bookingUser.guestProfileId,
      facilityId,
      bookingDate,
      bookingTime,
      bookingId,
    );

    const after = selectFacilityBookingAuditRow(bookingId);
    if (!after) throw new Error("Updated facility booking could not be loaded.");
    insertAuditLog(
      auditActor,
      "update",
      "facility_bookings",
      bookingId,
      before,
      after,
    );

    db.exec("COMMIT");
    inTransaction = false;
    return { ok: true, bookingId, facilityName: facility.name };
  } catch {
    if (inTransaction) db.exec("ROLLBACK");
    return { ok: false, error: "Unable to update this facility booking." };
  }
}

function getFacilityBookingUser(userId: number): FacilityBookingUserRow | null {
  const row = db
    .prepare(
      `
        SELECT
          u.role,
          u.active,
          u.check_in_date AS checkInDate,
          u.check_out_date AS checkOutDate,
          gp.id AS guestProfileId,
          gp.status AS guestProfileStatus
        FROM users u
        LEFT JOIN guest_profiles gp ON gp.user_id = u.id
        WHERE u.id = ?
      `,
    )
    .get(userId) as FacilityBookingUserRow | undefined;

  return row ?? null;
}

function getFacility(facilityId: number): FacilityRow | null {
  const row = db
    .prepare(
      `
        SELECT id, name
        FROM facilities
        WHERE id = ?
      `,
    )
    .get(facilityId) as FacilityRow | undefined;

  return row ?? null;
}

function selectFacilityBookingAuditRow(bookingId: number): AdminRow | null {
  const row = db
    .prepare(
      `
        SELECT
          id,
          user_id,
          guest_profile_id,
          facility_id,
          booking_date,
          booking_time,
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
