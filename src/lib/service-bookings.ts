import { insertAuditLog } from "./admin-data/audit";
import { db, type User } from "./db";
import { isBookingDate, isWithinBookingDateRange } from "./booking-dates";
import { parsePackageEntitlementSnapshot } from "./package-entitlement-options";
import { UNLIMITED_PACKAGE_SERVICE_QUANTITY } from "./package-entitlements";
import type { UserRole } from "./roles";

export const RELAXING_HAIR_WASH_SERVICE = {
  key: "relaxing_hair_wash",
  name: "Relaxing Hair Wash",
} as const;

export type ServiceBookingKey = typeof RELAXING_HAIR_WASH_SERVICE.key;

export type GuestServiceBooking = {
  id: number;
  serviceKey: ServiceBookingKey;
  serviceName: string;
  bookingDate: string;
  bookingTime: string;
  isUpcoming: boolean;
};

export type GuestServiceBookingSummary = {
  serviceKey: ServiceBookingKey;
  serviceName: string;
  packageQuantity: number;
  purchasedPerkQuantity: number;
  totalQuantity: number;
  usedQuantity: number;
  remainingQuantity: number | null;
  bookings: GuestServiceBooking[];
};

type ServiceBookingUserRow = {
  role: UserRole;
  active: number;
  checkInDate: string | null;
  checkOutDate: string | null;
};

type GuestProfileServiceRow = {
  id: number;
  packageEntitlementSnapshotJson: string | null;
};

type QuantityRow = {
  quantity: number | null;
};

type CountRow = {
  count: number;
};

type ServiceBookingRow = {
  id: number;
  serviceKey: ServiceBookingKey;
  serviceName: string;
  bookingDate: string;
  bookingTime: string;
};

export type CreateServiceBookingInput = {
  auditActor?: User;
  userId: number;
  serviceKey: string;
  bookingDate: string;
  bookingTime: string;
};

export type CreateServiceBookingResult =
  | { ok: true; bookingId: number; serviceName: string }
  | { ok: false; error: string };

export function getGuestServiceBookingSummary(
  user: User,
  now = new Date(),
): GuestServiceBookingSummary | null {
  if (user.role !== "guest") return null;

  const profile = getGuestProfileForServiceBooking(user.id);
  if (!profile) return null;

  const entitlement = getRelaxingHairWashEntitlement(user.id, profile.id, profile);
  const bookings = listActiveServiceBookings(user.id, now);

  return {
    serviceKey: RELAXING_HAIR_WASH_SERVICE.key,
    serviceName: RELAXING_HAIR_WASH_SERVICE.name,
    ...entitlement,
    bookings,
  };
}

export function createServiceBooking({
  auditActor,
  userId,
  serviceKey,
  bookingDate,
  bookingTime,
}: CreateServiceBookingInput): CreateServiceBookingResult {
  if (serviceKey !== RELAXING_HAIR_WASH_SERVICE.key) {
    return { ok: false, error: "Choose a valid service." };
  }
  if (!isBookingDate(bookingDate) || !isBookingTime(bookingTime)) {
    return { ok: false, error: "Choose a valid service date and time." };
  }
  if (hasServiceBookingStarted(bookingDate, bookingTime)) {
    return { ok: false, error: "Choose an upcoming service date and time." };
  }

  let inTransaction = false;

  try {
    db.exec("BEGIN IMMEDIATE");
    inTransaction = true;

    const bookingUser = getServiceBookingUser(userId);
    if (!bookingUser) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return { ok: false, error: "Sign in before booking a service." };
    }
    if (bookingUser.active !== 1) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return { ok: false, error: "This account is inactive." };
    }
    if (bookingUser.role !== "guest") {
      db.exec("ROLLBACK");
      inTransaction = false;
      return { ok: false, error: "Only guests can book services." };
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
        error: "Your stay dates are not set up for service booking.",
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
      return { ok: false, error: "Choose a date within your stay dates." };
    }

    const profile = getGuestProfileForServiceBooking(userId);
    if (!profile) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return { ok: false, error: "Your guest profile is not set up." };
    }

    const entitlement = getRelaxingHairWashEntitlement(
      userId,
      profile.id,
      profile,
    );
    if (
      entitlement.remainingQuantity !== null &&
      entitlement.remainingQuantity <= 0
    ) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return {
        ok: false,
        error:
          "You have used all Relaxing Hair Wash sessions. Please inform admin to add more in your guest profile.",
      };
    }

    const existing = db
      .prepare(
        `
          SELECT id
          FROM guest_service_bookings
          WHERE user_id = ?
            AND service_key = ?
            AND booking_date = ?
            AND booking_time = ?
            AND status = 'booked'
        `,
      )
      .get(userId, serviceKey, bookingDate, bookingTime);
    if (existing) {
      db.exec("ROLLBACK");
      inTransaction = false;
      return {
        ok: false,
        error: "You already booked this service date and time.",
      };
    }

    const result = db.prepare(
      `
        INSERT INTO guest_service_bookings (
          user_id,
          guest_profile_id,
          service_key,
          service_name,
          booking_date,
          booking_time
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
    ).run(
      userId,
      profile.id,
      RELAXING_HAIR_WASH_SERVICE.key,
      RELAXING_HAIR_WASH_SERVICE.name,
      bookingDate,
      bookingTime,
    ) as { lastInsertRowid: number | bigint };

    if (auditActor) {
      const after = selectServiceBookingAuditRow(Number(result.lastInsertRowid));
      if (!after) throw new Error("Inserted service booking could not be loaded.");
      insertAuditLog(
        auditActor,
        "insert",
        "guest_service_bookings",
        Number(result.lastInsertRowid),
        null,
        after,
      );
    }

    db.exec("COMMIT");
    inTransaction = false;
    return {
      ok: true,
      bookingId: Number(result.lastInsertRowid),
      serviceName: RELAXING_HAIR_WASH_SERVICE.name,
    };
  } catch {
    if (inTransaction) db.exec("ROLLBACK");
    return { ok: false, error: "Unable to book this service." };
  }
}

function selectServiceBookingAuditRow(bookingId: number) {
  return db
    .prepare(
      `
        SELECT
          id,
          user_id,
          service_name,
          booking_date,
          booking_time,
          status,
          created_at
        FROM guest_service_bookings
        WHERE id = ?
      `,
    )
    .get(bookingId) as
    | {
        id: number;
        user_id: number;
        service_name: string;
        booking_date: string;
        booking_time: string;
        status: string;
        created_at: string;
      }
    | undefined;
}

function getServiceBookingUser(userId: number): ServiceBookingUserRow | null {
  const row = db
    .prepare(
      `
        SELECT
          role,
          active,
          check_in_date AS checkInDate,
          check_out_date AS checkOutDate
        FROM users
        WHERE id = ?
      `,
    )
    .get(userId) as ServiceBookingUserRow | undefined;

  return row ?? null;
}

function getGuestProfileForServiceBooking(
  userId: number,
): GuestProfileServiceRow | null {
  const row = db
    .prepare(
      `
        SELECT
          id,
          package_entitlement_snapshot_json AS packageEntitlementSnapshotJson
        FROM guest_profiles
        WHERE user_id = ?
      `,
    )
    .get(userId) as GuestProfileServiceRow | undefined;

  return row ?? null;
}

function getRelaxingHairWashEntitlement(
  userId: number,
  guestProfileId: number,
  profile: GuestProfileServiceRow,
): Omit<GuestServiceBookingSummary, "serviceKey" | "serviceName" | "bookings"> {
  const snapshot = parsePackageEntitlementSnapshot(
    profile.packageEntitlementSnapshotJson,
  );
  const packageQuantity =
    snapshot?.services.find(
      (service) => service.name === RELAXING_HAIR_WASH_SERVICE.key,
    )?.quantity ?? 0;
  const purchasedPerkQuantity = getPurchasedPerkQuantity(guestProfileId);
  const totalQuantity =
    packageQuantity === UNLIMITED_PACKAGE_SERVICE_QUANTITY
      ? UNLIMITED_PACKAGE_SERVICE_QUANTITY
      : packageQuantity + purchasedPerkQuantity;
  const usedQuantity = getActiveServiceBookingCount(userId);
  const remainingQuantity =
    totalQuantity === UNLIMITED_PACKAGE_SERVICE_QUANTITY
      ? null
      : Math.max(0, totalQuantity - usedQuantity);

  return {
    packageQuantity,
    purchasedPerkQuantity,
    totalQuantity,
    usedQuantity,
    remainingQuantity,
  };
}

function getPurchasedPerkQuantity(guestProfileId: number): number {
  const row = db
    .prepare(
      `
        SELECT SUM(quantity) AS quantity
        FROM guest_profile_addons
        WHERE guest_profile_id = ?
          AND category = 'sunoki'
          AND service_name = ?
      `,
    )
    .get(guestProfileId, RELAXING_HAIR_WASH_SERVICE.name) as
    | QuantityRow
    | undefined;

  return Number(row?.quantity ?? 0);
}

function getActiveServiceBookingCount(userId: number): number {
  const row = db
    .prepare(
      `
        SELECT COUNT(*) AS count
        FROM guest_service_bookings
        WHERE user_id = ?
          AND service_key = ?
          AND status = 'booked'
      `,
    )
    .get(userId, RELAXING_HAIR_WASH_SERVICE.key) as CountRow;

  return Number(row.count);
}

function listActiveServiceBookings(
  userId: number,
  now: Date,
): GuestServiceBooking[] {
  const rows = db
    .prepare(
      `
        SELECT
          id,
          service_key AS serviceKey,
          service_name AS serviceName,
          booking_date AS bookingDate,
          booking_time AS bookingTime
        FROM guest_service_bookings
        WHERE user_id = ?
          AND service_key = ?
          AND status = 'booked'
        ORDER BY booking_date ASC, booking_time ASC, id ASC
      `,
    )
    .all(userId, RELAXING_HAIR_WASH_SERVICE.key) as ServiceBookingRow[];

  return rows.map((row) => ({
    id: Number(row.id),
    serviceKey: row.serviceKey,
    serviceName: row.serviceName,
    bookingDate: row.bookingDate,
    bookingTime: row.bookingTime,
    isUpcoming: !hasServiceBookingStarted(
      row.bookingDate,
      row.bookingTime,
      now,
    ),
  }));
}

function isBookingTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function hasServiceBookingStarted(
  bookingDate: string,
  bookingTime: string,
  now = new Date(),
): boolean {
  const [year, month, day] = bookingDate.split("-").map(Number);
  const [hour, minute] = bookingTime.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute) <= now;
}
