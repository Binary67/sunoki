import { db } from "../db";
import {
  BOOKABLE_PACKAGE_SERVICES,
  getBookablePackageService,
} from "../service-bookings/catalog";

export type BookingCountType = "service" | "facility";

export type BookingCountItem = {
  key: string;
  name: string;
  bookedCount: number;
  doneCount: number;
};

export type BookingCountReport = {
  services: BookingCountItem[];
  facilities: BookingCountItem[];
};

export type BookingCountDetailRow = {
  id: number;
  guestName: string;
  name: string;
  bookingDate: string;
  bookingTime: string;
  status: string;
  adminRead: number;
  adminDone: number;
  cancelledAt: string | null;
  createdAt: string;
};

export type BookingCountDetails = {
  type: BookingCountType;
  name: string;
  rows: BookingCountDetailRow[];
};

type DateRangeInput = {
  from: string;
  to: string;
};

type CountRow = {
  key: string | number;
  bookedCount: number;
  doneCount: number;
};

type FacilityRow = {
  id: number;
  name: string;
};

type DetailRow = {
  id: number;
  guestName: string | null;
  guestUsername: string;
  name: string;
  bookingDate: string;
  bookingTime: string;
  status: string;
  adminRead: number;
  adminDone: number;
  cancelledAt: string | null;
  createdAt: string;
};

export function getBookingCountReport({
  from,
  to,
}: DateRangeInput): BookingCountReport {
  const serviceCounts = getServiceCounts(from, to);
  const facilityCounts = getFacilityCounts(from, to);

  return {
    services: BOOKABLE_PACKAGE_SERVICES.map((service) => {
      const counts = serviceCounts.get(service.key);
      return {
        key: service.key,
        name: service.name,
        bookedCount: counts?.bookedCount ?? 0,
        doneCount: counts?.doneCount ?? 0,
      };
    }).sort(compareBookingCountItems),
    facilities: listFacilities()
      .map((facility) => {
        const counts = facilityCounts.get(String(facility.id));
        return {
          key: String(facility.id),
          name: facility.name,
          bookedCount: counts?.bookedCount ?? 0,
          doneCount: counts?.doneCount ?? 0,
        };
      })
      .sort(compareBookingCountItems),
  };
}

export function getBookingCountDetails({
  from,
  key,
  to,
  type,
}: DateRangeInput & {
  key: string;
  type: BookingCountType;
}): BookingCountDetails | null {
  if (type === "service") {
    const service = getBookablePackageService(key);
    if (!service) return null;

    return {
      type,
      name: service.name,
      rows: mapDetailRows(
        db
          .prepare(
            `
              SELECT
                b.id,
                gp.name AS guestName,
                u.username AS guestUsername,
                b.service_name AS name,
                b.booking_date AS bookingDate,
                b.booking_time AS bookingTime,
                b.status,
                b.admin_read AS adminRead,
                b.admin_done AS adminDone,
                b.cancelled_at AS cancelledAt,
                b.created_at AS createdAt
              FROM guest_service_bookings b
              JOIN users u ON u.id = b.user_id
              LEFT JOIN guest_profiles gp ON gp.id = b.guest_profile_id
              WHERE b.service_key = ?
                AND b.booking_date >= ?
                AND b.booking_date <= ?
              ORDER BY b.booking_date ASC, b.booking_time ASC, b.id ASC
            `,
          )
          .all(service.key, from, to) as DetailRow[],
      ),
    };
  }

  const facilityId = Number(key);
  if (!Number.isInteger(facilityId) || facilityId <= 0) return null;

  const facility = getFacility(facilityId);
  if (!facility) return null;

  return {
    type,
    name: facility.name,
    rows: mapDetailRows(
      db
        .prepare(
          `
            SELECT
              b.id,
              gp.name AS guestName,
              u.username AS guestUsername,
              f.name AS name,
              b.booking_date AS bookingDate,
              b.booking_time AS bookingTime,
              b.status,
              b.admin_read AS adminRead,
              b.admin_done AS adminDone,
              b.cancelled_at AS cancelledAt,
              b.created_at AS createdAt
            FROM facility_bookings b
            JOIN facilities f ON f.id = b.facility_id
            JOIN users u ON u.id = b.user_id
            LEFT JOIN guest_profiles gp ON gp.id = b.guest_profile_id
            WHERE b.facility_id = ?
              AND b.booking_date >= ?
              AND b.booking_date <= ?
            ORDER BY b.booking_date ASC, b.booking_time ASC, b.id ASC
          `,
        )
        .all(facility.id, from, to) as DetailRow[],
    ),
  };
}

function getServiceCounts(from: string, to: string): Map<string, CountRow> {
  return rowsToCountMap(
    db
      .prepare(
        `
          SELECT
            service_key AS key,
            SUM(CASE WHEN status = 'booked' THEN 1 ELSE 0 END) AS bookedCount,
            SUM(CASE WHEN status = 'booked' AND admin_done = 1 THEN 1 ELSE 0 END) AS doneCount
          FROM guest_service_bookings
          WHERE booking_date >= ?
            AND booking_date <= ?
          GROUP BY service_key
        `,
      )
      .all(from, to) as CountRow[],
  );
}

function getFacilityCounts(from: string, to: string): Map<string, CountRow> {
  return rowsToCountMap(
    db
      .prepare(
        `
          SELECT
            facility_id AS key,
            SUM(CASE WHEN status = 'booked' THEN 1 ELSE 0 END) AS bookedCount,
            SUM(CASE WHEN status = 'booked' AND admin_done = 1 THEN 1 ELSE 0 END) AS doneCount
          FROM facility_bookings
          WHERE booking_date >= ?
            AND booking_date <= ?
          GROUP BY facility_id
        `,
      )
      .all(from, to) as CountRow[],
  );
}

function rowsToCountMap(rows: CountRow[]): Map<string, CountRow> {
  return new Map(
    rows.map((row) => [
      String(row.key),
      {
        key: row.key,
        bookedCount: Number(row.bookedCount),
        doneCount: Number(row.doneCount),
      },
    ]),
  );
}

function listFacilities(): FacilityRow[] {
  return db
    .prepare("SELECT id, name FROM facilities ORDER BY name ASC, id ASC")
    .all() as FacilityRow[];
}

function getFacility(id: number): FacilityRow | null {
  const row = db
    .prepare("SELECT id, name FROM facilities WHERE id = ?")
    .get(id) as FacilityRow | undefined;
  return row ?? null;
}

function mapDetailRows(rows: DetailRow[]): BookingCountDetailRow[] {
  return rows.map((row) => ({
    id: Number(row.id),
    guestName: row.guestName ?? row.guestUsername,
    name: row.name,
    bookingDate: row.bookingDate,
    bookingTime: row.bookingTime,
    status: row.status,
    adminRead: Number(row.adminRead),
    adminDone: Number(row.adminDone),
    cancelledAt: row.cancelledAt,
    createdAt: row.createdAt,
  }));
}

function compareBookingCountItems(
  a: BookingCountItem,
  b: BookingCountItem,
): number {
  return (
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) ||
    a.key.localeCompare(b.key)
  );
}
