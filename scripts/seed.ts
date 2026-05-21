import { db } from "../src/lib/db";
import { addBookingDays, formatBookingDate } from "../src/lib/booking-dates";

const upsert = db.prepare(
  `
    INSERT OR IGNORE INTO users (
      username,
      password,
      role,
      check_in_date,
      check_out_date
    )
    VALUES (?, ?, ?, ?, ?)
  `,
);

const defaultCheckInDate = formatBookingDate(new Date());
const defaultCheckOutDate = addBookingDays(defaultCheckInDate, 7);

const accounts = [
  {
    username: "superadmin",
    password: "superadmin123",
    role: "superadmin",
    checkInDate: null,
    checkOutDate: null,
  },
  {
    username: "admin",
    password: "admin123",
    role: "admin",
    checkInDate: null,
    checkOutDate: null,
  },
  {
    username: "guest",
    password: "guest123",
    role: "guest",
    checkInDate: defaultCheckInDate,
    checkOutDate: defaultCheckOutDate,
  },
] as const;

for (const {
  username,
  password,
  role,
  checkInDate,
  checkOutDate,
} of accounts) {
  const result = upsert.run(
    username,
    password,
    role,
    checkInDate,
    checkOutDate,
  );
  const action = Number(result.changes) === 1 ? "inserted" : "already exists";
  console.log(`${username} (${role}): ${action}`);
}

const facilities = [
  { slug: "karaoke", name: "Karaoke Lounge" },
  { slug: "gym", name: "Strength Studio" },
  { slug: "yoga", name: "Yoga Studio" },
  { slug: "lounge", name: "Tranquil Lounge" },
] as const;

const timeSlots = [
  "07:00",
  "08:30",
  "10:00",
  "11:30",
  "13:00",
  "14:30",
  "16:00",
  "18:00",
  "19:30",
  "21:00",
  "22:30",
] as const;

const insertFacility = db.prepare(
  "INSERT OR IGNORE INTO facilities (slug, name) VALUES (?, ?)",
);
const getFacility = db.prepare("SELECT id FROM facilities WHERE slug = ?");
const insertTimeSlot = db.prepare(
  `
    INSERT OR IGNORE INTO facility_time_slots (
      facility_id,
      start_time,
      duration_minutes,
      capacity_pax
    )
    VALUES (?, ?, 60, 2)
  `,
);

for (const facility of facilities) {
  const result = insertFacility.run(facility.slug, facility.name);
  const action = Number(result.changes) === 1 ? "inserted" : "already exists";
  console.log(`${facility.slug} facility: ${action}`);

  const row = getFacility.get(facility.slug) as { id: number };
  for (const timeSlot of timeSlots) {
    const slotResult = insertTimeSlot.run(row.id, timeSlot);
    const slotAction =
      Number(slotResult.changes) === 1 ? "inserted" : "already exists";
    console.log(`${facility.slug} ${timeSlot}: ${slotAction}`);
  }
}
