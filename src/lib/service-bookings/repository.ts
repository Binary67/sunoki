import type { AdminRow } from "../admin-data/definitions";
import { db } from "../db";
import type { GuestProfileStatus } from "../guest-profile-types";
import type { UserRole } from "../roles";
import type { ServiceBookingKey } from "./catalog";
import { hasServiceBookingStarted } from "./time";

export type ServiceBookingUserRow = {
  role: UserRole;
  active: number;
  checkInDate: string | null;
  checkOutDate: string | null;
};

export type GuestProfileServiceRow = {
  id: number;
  status: GuestProfileStatus;
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

export function selectServiceBookingAuditRow(
  bookingId: number,
): AdminRow | null {
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

export function getServiceBookingUser(
  userId: number,
): ServiceBookingUserRow | null {
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

export function getGuestProfileForServiceBooking(
  userId: number,
): GuestProfileServiceRow | null {
  const row = db
    .prepare(
      `
        SELECT
          id,
          status,
          package_entitlement_snapshot_json AS packageEntitlementSnapshotJson
        FROM guest_profiles
        WHERE user_id = ?
      `,
    )
    .get(userId) as GuestProfileServiceRow | undefined;

  return row ?? null;
}

export function getPurchasedPerkQuantity(
  guestProfileId: number,
  serviceName: string,
): number {
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
    .get(guestProfileId, serviceName) as
    | QuantityRow
    | undefined;

  return Number(row?.quantity ?? 0);
}

export function getBookedServiceBookingCount(
  userId: number,
  serviceKey: ServiceBookingKey,
  excludeBookingId?: number,
): number {
  const excludeClause = excludeBookingId ? "AND id != ?" : "";
  const params = excludeBookingId
    ? [userId, serviceKey, excludeBookingId]
    : [userId, serviceKey];
  const row = db
    .prepare(
      `
        SELECT COUNT(*) AS count
        FROM guest_service_bookings
        WHERE user_id = ?
          AND service_key = ?
          AND status = 'booked'
          ${excludeClause}
      `,
    )
    .get(...params) as CountRow;

  return Number(row.count);
}

export function getServiceBookingLimit(
  serviceKey: ServiceBookingKey,
): number | null {
  const row = db
    .prepare(
      `
        SELECT max_concurrent_bookings AS count
        FROM service_booking_limits
        WHERE service_key = ?
      `,
    )
    .get(serviceKey) as CountRow | undefined;

  return row ? Number(row.count) : null;
}

export function getActiveServiceBookingSlotCount(
  serviceKey: ServiceBookingKey,
  bookingDate: string,
  bookingTime: string,
  excludeBookingId?: number,
): number {
  const excludeClause = excludeBookingId ? "AND id != ?" : "";
  const params = excludeBookingId
    ? [serviceKey, bookingDate, bookingTime, excludeBookingId]
    : [serviceKey, bookingDate, bookingTime];
  const row = db
    .prepare(
      `
        SELECT COUNT(*) AS count
        FROM guest_service_bookings
        WHERE service_key = ?
          AND booking_date = ?
          AND booking_time = ?
          AND status = 'booked'
          ${excludeClause}
      `,
    )
    .get(...params) as CountRow;

  return Number(row.count);
}

export function guestHasActiveServiceBookingSlot(
  userId: number,
  serviceKey: ServiceBookingKey,
  bookingDate: string,
  bookingTime: string,
  excludeBookingId?: number,
): boolean {
  const excludeClause = excludeBookingId ? "AND id != ?" : "";
  const params = excludeBookingId
    ? [userId, serviceKey, bookingDate, bookingTime, excludeBookingId]
    : [userId, serviceKey, bookingDate, bookingTime];
  const row = db
    .prepare(
      `
        SELECT id
        FROM guest_service_bookings
        WHERE user_id = ?
          AND service_key = ?
          AND booking_date = ?
          AND booking_time = ?
          AND status = 'booked'
          ${excludeClause}
        LIMIT 1
      `,
    )
    .get(...params);

  return Boolean(row);
}

export function listActiveServiceBookings(
  userId: number,
  serviceKey: ServiceBookingKey,
  now: Date,
): {
  id: number;
  serviceKey: ServiceBookingKey;
  serviceName: string;
  bookingDate: string;
  bookingTime: string;
  isUpcoming: boolean;
}[] {
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
    .all(userId, serviceKey) as ServiceBookingRow[];

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
