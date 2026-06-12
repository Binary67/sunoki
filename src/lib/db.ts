import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DEFAULT_BRANDING_SETTINGS } from "./branding-defaults";
import { PACKAGE_SERVICE_COLUMNS } from "./package-entitlements";
import type { UserRole } from "./roles";

export type { UserRole } from "./roles";

const DB_PATH = join(process.cwd(), "data", "sunoki.db");

mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA busy_timeout = 5000;
`);

const packageServiceColumnSql = PACKAGE_SERVICE_COLUMNS.map(
  (column) =>
    `${column.name} INTEGER NOT NULL DEFAULT 0 CHECK (${column.name} >= -1)`,
).join(",\n    ");
const packageServiceKeySql = PACKAGE_SERVICE_COLUMNS.map(
  (column) => `'${column.name}'`,
).join(", ");
const guestServiceBookingColumnSql = `
    id               INTEGER PRIMARY KEY,
    user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    guest_profile_id INTEGER NOT NULL REFERENCES guest_profiles(id) ON DELETE CASCADE,
    service_key      TEXT NOT NULL CHECK (service_key IN (${packageServiceKeySql})),
    service_name     TEXT NOT NULL,
    booking_date     TEXT NOT NULL,
    booking_time     TEXT NOT NULL,
    status           TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked','cancelled')),
    admin_read       INTEGER NOT NULL DEFAULT 0 CHECK (admin_read IN (0, 1)),
    admin_done       INTEGER NOT NULL DEFAULT 0 CHECK (admin_done IN (0, 1)),
    admin_done_at    TEXT,
    cancelled_at     TEXT,
    created_at       TEXT NOT NULL DEFAULT (datetime('now'))
`;

db.exec(`
  CREATE TABLE IF NOT EXISTS branding_settings (
    id                INTEGER PRIMARY KEY CHECK (id = 1),
    brand_name        TEXT NOT NULL,
    brand_description TEXT NOT NULL,
    icon_data_url     TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id             INTEGER PRIMARY KEY,
    username       TEXT UNIQUE NOT NULL,
    password       TEXT NOT NULL,
    role           TEXT NOT NULL CHECK (role IN ('superadmin','admin','guest')),
    active         INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    check_in_date  TEXT,
    check_out_date TEXT,
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS facilities (
    id        INTEGER PRIMARY KEY,
    slug      TEXT UNIQUE NOT NULL,
    name      TEXT NOT NULL,
    tagline_1 TEXT,
    tagline_2 TEXT,
    tagline_3 TEXT
  );

  CREATE TABLE IF NOT EXISTS facility_bookings (
    id               INTEGER PRIMARY KEY,
    user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    guest_profile_id INTEGER NOT NULL REFERENCES guest_profiles(id) ON DELETE CASCADE,
    facility_id      INTEGER NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    booking_date     TEXT NOT NULL,
    booking_time     TEXT NOT NULL,
    status           TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked','cancelled')),
    admin_read       INTEGER NOT NULL DEFAULT 0 CHECK (admin_read IN (0, 1)),
    admin_done       INTEGER NOT NULL DEFAULT 0 CHECK (admin_done IN (0, 1)),
    admin_done_at    TEXT,
    cancelled_at     TEXT,
    created_at       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE UNIQUE INDEX IF NOT EXISTS facility_bookings_active_unique
    ON facility_bookings(facility_id, booking_date, booking_time)
    WHERE status = 'booked';

  CREATE INDEX IF NOT EXISTS facility_bookings_user_status_date_time_idx
    ON facility_bookings(user_id, status, booking_date, booking_time);

  CREATE INDEX IF NOT EXISTS facility_bookings_status_date_time_idx
    ON facility_bookings(status, booking_date, booking_time);

  CREATE TABLE IF NOT EXISTS guest_profiles (
    id                     INTEGER PRIMARY KEY,
    name                   TEXT NOT NULL,
    status                 TEXT NOT NULL DEFAULT 'incoming' CHECK (status IN ('incoming', 'checked_in')),
    room_number            TEXT,
    ic_no                  TEXT,
    ic_no_normalized       TEXT,
    handphone_no           TEXT,
    email                  TEXT,
    expected_delivery_date TEXT,
    check_in_date          TEXT,
    checkout_date          TEXT,
    hospital_of_delivery   TEXT,
    mode_of_delivery       TEXT,
    child_count            TEXT,
    special_note           TEXT,
    husband_name           TEXT,
    husband_ic_no          TEXT,
    husband_handphone_no   TEXT,
    husband_email          TEXT,
    address                TEXT,
    occupation             TEXT,
    occupation_2           TEXT,
    package_type           TEXT,
    package_payable_amount TEXT,
    deposit_to_pay         TEXT,
    balance_to_pay         TEXT,
    package_entitlement_snapshot_json TEXT,
    package_special_note   TEXT,
    consultant_name        TEXT,
    medical_food_notes     TEXT,
    kitchen_notes          TEXT,
    user_id                INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at             TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS guest_profile_addons (
    id               INTEGER PRIMARY KEY,
    guest_profile_id INTEGER NOT NULL REFERENCES guest_profiles(id) ON DELETE CASCADE,
    service_name     TEXT NOT NULL,
    category         TEXT NOT NULL DEFAULT 'custom' CHECK (category IN ('sunoki','custom')),
    quantity         INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    days             INTEGER CHECK (days IS NULL OR days > 0),
    price_cents      INTEGER NOT NULL CHECK (price_cents >= 0),
    remarks          TEXT,
    created_at       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS guest_profile_addons_guest_profile_id_idx
    ON guest_profile_addons(guest_profile_id);

  CREATE TABLE IF NOT EXISTS guest_service_bookings (
${guestServiceBookingColumnSql}
  );

  CREATE INDEX IF NOT EXISTS guest_service_bookings_user_service_status_idx
    ON guest_service_bookings(user_id, service_key, status, booking_date, booking_time);

  CREATE INDEX IF NOT EXISTS guest_service_bookings_profile_booked_service_idx
    ON guest_service_bookings(guest_profile_id, service_key, booking_date, booking_time, id)
    WHERE status = 'booked';

  CREATE UNIQUE INDEX IF NOT EXISTS guest_service_bookings_active_unique
    ON guest_service_bookings(service_key, booking_date, booking_time)
    WHERE status = 'booked';

  CREATE INDEX IF NOT EXISTS guest_service_bookings_status_date_time_idx
    ON guest_service_bookings(status, booking_date, booking_time);

  CREATE TABLE IF NOT EXISTS package_service_entitlements (
    id                      INTEGER PRIMARY KEY,
    package_name            TEXT UNIQUE NOT NULL,
    ${packageServiceColumnSql},
    celebration_choice_rule TEXT NOT NULL DEFAULT 'none' CHECK (celebration_choice_rule IN ('none','choose_one'))
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id             INTEGER PRIMARY KEY,
    actor_user_id  INTEGER NOT NULL,
    actor_username TEXT NOT NULL,
    operation      TEXT NOT NULL CHECK (operation IN ('insert','update','delete')),
    table_name     TEXT NOT NULL CHECK (table_name IN ('users','facilities','facility_bookings','guest_service_bookings','package_service_entitlements')),
    row_id         INTEGER NOT NULL,
    before_json    TEXT,
    after_json     TEXT,
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

db.prepare(
  `
    INSERT OR IGNORE INTO branding_settings (
      id,
      brand_name,
      brand_description,
      icon_data_url
    )
    VALUES (1, ?, ?, ?)
  `,
).run(
  DEFAULT_BRANDING_SETTINGS.brandName,
  DEFAULT_BRANDING_SETTINGS.brandDescription,
  DEFAULT_BRANDING_SETTINGS.iconDataUrl,
);

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS guest_profiles_user_id_unique
    ON guest_profiles(user_id)
    WHERE user_id IS NOT NULL;

  CREATE UNIQUE INDEX IF NOT EXISTS guest_profiles_incoming_ic_no_normalized_unique
    ON guest_profiles(ic_no_normalized)
    WHERE status = 'incoming' AND ic_no_normalized IS NOT NULL;

  CREATE INDEX IF NOT EXISTS guest_profiles_status_checkout_id_idx
    ON guest_profiles(status, checkout_date, id);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id         INTEGER PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    revoked_at TEXT
  );

  CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);

  CREATE TABLE IF NOT EXISTS login_attempts (
    attempt_key       TEXT PRIMARY KEY,
    failed_count      INTEGER NOT NULL CHECK (failed_count > 0),
    window_started_at TEXT NOT NULL,
    last_failed_at    TEXT NOT NULL,
    locked_until      TEXT
  );

  CREATE TABLE IF NOT EXISTS admin_import_drafts (
    token          TEXT PRIMARY KEY,
    actor_user_id  INTEGER NOT NULL,
    actor_username TEXT NOT NULL,
    payload_json   TEXT NOT NULL,
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at     TEXT NOT NULL
  );
`);

export type User = {
  id: number;
  username: string;
  role: UserRole;
  active: number;
  checkInDate: string | null;
  checkOutDate: string | null;
};

export type UserWithPassword = User & { password: string };
