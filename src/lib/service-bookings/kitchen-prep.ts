import { isBookingDate } from "../booking-dates";
import { db } from "../db";
import {
  KITCHEN_PREP_SERVICE_KEYS,
  type KitchenPrepServiceKey,
} from "./catalog";

export {
  KITCHEN_PREP_SERVICE_KEYS,
  KITCHEN_PREP_SERVICES,
  type KitchenPrepServiceKey,
} from "./catalog";

export type KitchenServicePrepBooking = {
  id: number;
  guestProfileId: number;
  guestName: string;
  roomNumber: string | null;
  serviceKey: KitchenPrepServiceKey;
  serviceName: string;
  bookingDate: string;
  bookingTime: string;
};

export type KitchenServicePrepBookingFilters = {
  bookingDateFrom?: string;
  bookingDateTo?: string;
  roomNumber?: string;
  serviceKeys?: readonly KitchenPrepServiceKey[];
};

type KitchenServicePrepBookingRow = {
  id: number;
  guestProfileId: number;
  guestName: string;
  roomNumber: string | null;
  serviceKey: KitchenPrepServiceKey;
  serviceName: string;
  bookingDate: string;
  bookingTime: string;
};

export function listKitchenServicePrepBookings({
  bookingDateFrom,
  bookingDateTo,
  roomNumber,
  serviceKeys,
}: KitchenServicePrepBookingFilters): KitchenServicePrepBooking[] {
  if (bookingDateFrom !== undefined && !isBookingDate(bookingDateFrom)) {
    return [];
  }
  if (bookingDateTo !== undefined && !isBookingDate(bookingDateTo)) return [];
  if (bookingDateFrom && bookingDateTo && bookingDateFrom > bookingDateTo) {
    return [];
  }

  const selectedServiceKeys = getKitchenPrepServiceKeys(serviceKeys);
  const conditions = [
    "b.status = 'booked'",
    `b.service_key IN (${selectedServiceKeys.map(() => "?").join(", ")})`,
  ];
  const params: string[] = [...selectedServiceKeys];

  if (bookingDateFrom && bookingDateTo) {
    conditions.push("b.booking_date >= ?");
    params.push(bookingDateFrom);
    conditions.push("b.booking_date <= ?");
    params.push(bookingDateTo);
  }

  if (roomNumber) {
    conditions.push("gp.room_number = ?");
    params.push(roomNumber);
  }

  const rows = db
    .prepare(
      `
        SELECT
          b.id AS id,
          b.guest_profile_id AS guestProfileId,
          gp.name AS guestName,
          gp.room_number AS roomNumber,
          b.service_key AS serviceKey,
          b.service_name AS serviceName,
          b.booking_date AS bookingDate,
          b.booking_time AS bookingTime
        FROM guest_service_bookings b
        JOIN guest_profiles gp ON gp.id = b.guest_profile_id
        WHERE ${conditions.join("\n          AND ")}
        ORDER BY
          b.booking_date ASC,
          gp.room_number IS NULL,
          gp.room_number ASC,
          gp.name COLLATE NOCASE ASC,
          b.booking_time ASC,
          b.id ASC
      `,
    )
    .all(...params) as KitchenServicePrepBookingRow[];

  return rows.map((row) => ({
    id: Number(row.id),
    guestProfileId: Number(row.guestProfileId),
    guestName: row.guestName,
    roomNumber: row.roomNumber,
    serviceKey: row.serviceKey,
    serviceName: row.serviceName,
    bookingDate: row.bookingDate,
    bookingTime: row.bookingTime,
  }));
}

function getKitchenPrepServiceKeys(
  serviceKeys: readonly KitchenPrepServiceKey[] | undefined,
): KitchenPrepServiceKey[] {
  if (!serviceKeys || serviceKeys.length === 0) {
    return [...KITCHEN_PREP_SERVICE_KEYS];
  }

  const requestedServiceKeys = new Set(serviceKeys);
  return KITCHEN_PREP_SERVICE_KEYS.filter((serviceKey) =>
    requestedServiceKeys.has(serviceKey),
  );
}
