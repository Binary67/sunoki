import { db } from "../src/lib/db";

const upsert = db.prepare(
  "INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)",
);

const accounts = [
  { username: "admin", password: "admin123", role: "admin" },
  { username: "guest", password: "guest123", role: "guest" },
] as const;

for (const { username, password, role } of accounts) {
  const result = upsert.run(username, password, role);
  const action = Number(result.changes) === 1 ? "inserted" : "already exists";
  console.log(`${username} (${role}): ${action}`);
}
