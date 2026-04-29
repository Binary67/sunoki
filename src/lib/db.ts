import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const DB_PATH = join(process.cwd(), "data", "sunoki.db");

mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY,
    username   TEXT UNIQUE NOT NULL,
    password   TEXT NOT NULL,
    role       TEXT NOT NULL CHECK (role IN ('admin','guest')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export type User = {
  id: number;
  username: string;
  role: "admin" | "guest";
};

export type UserWithPassword = User & { password: string };
