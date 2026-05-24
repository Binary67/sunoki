import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DEFAULT_BRANDING_SETTINGS } from "./branding-defaults";
import type { UserRole } from "./roles";

export type { UserRole } from "./roles";

const DB_PATH = join(process.cwd(), "data", "sunoki.db");

mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
  CREATE TABLE IF NOT EXISTS branding_settings (
    id                INTEGER PRIMARY KEY CHECK (id = 1),
    brand_name        TEXT NOT NULL,
    brand_description TEXT NOT NULL,
    icon_data_url     TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id             INTEGER PRIMARY KEY,
    username       TEXT NOT NULL,
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

  CREATE TABLE IF NOT EXISTS facility_time_slots (
    id               INTEGER PRIMARY KEY,
    facility_id      INTEGER NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    start_time       TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
    capacity_pax     INTEGER NOT NULL DEFAULT 2 CHECK (capacity_pax > 0),
    active           INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    UNIQUE (facility_id, start_time)
  );

  CREATE TABLE IF NOT EXISTS facility_bookings (
    id                    INTEGER PRIMARY KEY,
    user_id               INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    facility_time_slot_id INTEGER NOT NULL REFERENCES facility_time_slots(id) ON DELETE CASCADE,
    booking_date          TEXT NOT NULL,
    created_at            TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (user_id, facility_time_slot_id, booking_date)
  );

  CREATE TABLE IF NOT EXISTS guest_profiles (
    id                     INTEGER PRIMARY KEY,
    name                   TEXT NOT NULL,
    status                 TEXT NOT NULL DEFAULT 'not_checked_in' CHECK (status IN ('not_checked_in', 'checked_in')),
    room_number            TEXT,
    ic_no                  TEXT,
    handphone_no           TEXT,
    email                  TEXT,
    expected_delivery_date TEXT,
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
    days             INTEGER CHECK (days IS NULL OR days > 0),
    price_cents      INTEGER NOT NULL CHECK (price_cents >= 0),
    created_at       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS guest_profile_addons_guest_profile_id_idx
    ON guest_profile_addons(guest_profile_id);

  CREATE TABLE IF NOT EXISTS audit_logs (
    id             INTEGER PRIMARY KEY,
    actor_user_id  INTEGER NOT NULL,
    actor_username TEXT NOT NULL,
    operation      TEXT NOT NULL CHECK (operation IN ('insert','update','delete')),
    table_name     TEXT NOT NULL CHECK (table_name IN ('users','facilities','facility_time_slots','facility_bookings')),
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
  CREATE UNIQUE INDEX IF NOT EXISTS users_active_username_unique
    ON users(username)
    WHERE active = 1;

  CREATE UNIQUE INDEX IF NOT EXISTS guest_profiles_user_id_unique
    ON guest_profiles(user_id)
    WHERE user_id IS NOT NULL;
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
