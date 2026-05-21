import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const DB_PATH = join(process.cwd(), "data", "sunoki.db");

mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY,
    username   TEXT UNIQUE NOT NULL,
    password   TEXT NOT NULL,
    role       TEXT NOT NULL CHECK (role IN ('admin','guest')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS facilities (
    id   INTEGER PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL
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

export type User = {
  id: number;
  username: string;
  role: "admin" | "guest";
};

export type UserWithPassword = User & { password: string };
