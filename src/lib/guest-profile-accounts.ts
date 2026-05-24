import { randomInt } from "node:crypto";
import { db } from "./db";
import type { GuestStayDates } from "./guest-profile-stay";

const GUEST_USERNAME_LENGTH = 6;
const GUEST_USERNAME_ATTEMPTS = 100;

type InsertResult = {
  lastInsertRowid: number | bigint;
};

type GuestUsernameResult =
  | { ok: true; value: string }
  | { ok: false; message: string };

export type GuestProfileAccountMutationResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export function parseRequiredGuestAccount(
  formData: FormData,
):
  | { ok: true; username: string; password: string }
  | { ok: false; message: string } {
  const password = readPassword(formData);
  if (!password) {
    return { ok: false, message: "Guest account password is required." };
  }

  const username = generateGuestUsername();
  if (!username.ok) return username;

  return { ok: true, username: username.value, password };
}

export function parseOptionalGuestAccount(
  formData: FormData,
  hasLinkedUser: boolean,
):
  | { ok: true; username: string | null; password: string | null }
  | { ok: false; message: string } {
  const password = readPassword(formData);
  if (!hasLinkedUser && !password) {
    return { ok: true, username: null, password: null };
  }
  if (hasLinkedUser) {
    return { ok: true, username: null, password };
  }

  const username = generateGuestUsername();
  if (!username.ok) return username;

  return { ok: true, username: username.value, password };
}

export function insertGuestUser(
  username: string,
  password: string,
  stayDates: GuestStayDates,
): number {
  const result = db
    .prepare(
      `
        INSERT INTO users (
          username,
          password,
          role,
          active,
          check_in_date,
          check_out_date
        )
        VALUES (?, ?, 'guest', 1, ?, ?)
      `,
    )
    .run(
      username,
      password,
      stayDates.checkInDate,
      stayDates.checkOutDate,
    ) as InsertResult;

  return Number(result.lastInsertRowid);
}

export function updateGuestUser(
  userId: number,
  password: string | null,
  stayDates: GuestStayDates,
): void {
  if (password !== null) {
    db.prepare(
      `
        UPDATE users
        SET password = ?,
            check_in_date = ?,
            check_out_date = ?
        WHERE id = ?
      `,
    ).run(
      password,
      stayDates.checkInDate,
      stayDates.checkOutDate,
      userId,
    );
    return;
  }

  db.prepare(
    `
      UPDATE users
      SET check_in_date = ?,
          check_out_date = ?
      WHERE id = ?
    `,
  ).run(stayDates.checkInDate, stayDates.checkOutDate, userId);
}

export function updateGuestUserStayDates(
  userId: number,
  stayDates: GuestStayDates,
): void {
  db.prepare(
    `
      UPDATE users
      SET check_in_date = ?,
          check_out_date = ?
      WHERE id = ?
    `,
  ).run(stayDates.checkInDate, stayDates.checkOutDate, userId);
}

export function setGuestUserAccess(userId: number, active: 0 | 1): void {
  db.prepare("UPDATE users SET active = ? WHERE id = ?").run(active, userId);
  if (active === 1) return;

  db.prepare(
    `
      UPDATE sessions
      SET revoked_at = ?
      WHERE user_id = ?
        AND revoked_at IS NULL
    `,
  ).run(formatDateTime(new Date()), userId);
}

function generateGuestUsername(): GuestUsernameResult {
  for (let attempt = 0; attempt < GUEST_USERNAME_ATTEMPTS; attempt += 1) {
    const digits = "0123456789".split("");
    const firstDigitIndex = randomInt(1, digits.length);
    let username = digits.splice(firstDigitIndex, 1)[0];

    while (username.length < GUEST_USERNAME_LENGTH) {
      const digitIndex = randomInt(0, digits.length);
      username += digits.splice(digitIndex, 1)[0];
    }

    if (!hasUsername(username)) {
      return { ok: true, value: username };
    }
  }

  return {
    ok: false,
    message: "Unable to generate a guest username. Try saving again.",
  };
}

function readPassword(formData: FormData): string | null {
  const value = formData.get("account_password");
  return typeof value === "string" && value ? value : null;
}

function hasUsername(username: string): boolean {
  const row = db
    .prepare(
      `
        SELECT id
        FROM users
        WHERE username = ?
        LIMIT 1
      `,
    )
    .get(username) as { id: number } | undefined;

  return Boolean(row);
}

function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}
