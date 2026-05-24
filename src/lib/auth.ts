import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { formatBookingDate, isBookingDate } from "./booking-dates";
import { db, type User, type UserWithPassword } from "./db";

const SESSION_COOKIE = "session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const SESSION_TOKEN_BYTES = 32;

type SessionUserRow = User & {
  expiresAt: string;
};

type CountRow = {
  count: number;
};

export type SetSessionCookieResult =
  | { ok: true }
  | { ok: false; message: string };

export type RevokeUserSessionsResult =
  | {
      ok: true;
      message: string;
      targetUser: User;
      beforeCount: number;
      afterCount: number;
    }
  | { ok: false; message: string };

function createSessionToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString("hex");
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function formatSessionDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function getCheckoutExpiry(checkOutDate: string): Date | null {
  if (!isBookingDate(checkOutDate)) return null;
  const [year, month, day] = checkOutDate.split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59);
}

function getSessionExpiry(user: User, now: Date): Date | null {
  if (user.role === "guest") {
    return user.checkOutDate ? getCheckoutExpiry(user.checkOutDate) : null;
  }

  return new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000);
}

function hasValidGuestCheckout(user: User, now: Date): boolean {
  if (user.role !== "guest") return true;
  const expiry = user.checkOutDate ? getCheckoutExpiry(user.checkOutDate) : null;
  return Boolean(expiry && expiry.getTime() > now.getTime());
}

function getCookieMaxAge(expiresAt: Date, now: Date): number {
  return Math.max(1, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
}

function deactivateExpiredGuestUsers(now: Date): void {
  const today = formatBookingDate(now);
  const expiredUsers = db
    .prepare(
      `
        SELECT u.id
        FROM users u
        JOIN guest_profiles gp ON gp.user_id = u.id
        WHERE u.role = 'guest'
          AND u.active = 1
          AND gp.status = 'checked_in'
          AND u.check_out_date IS NOT NULL
          AND length(u.check_out_date) = 10
          AND u.check_out_date < ?
      `,
    )
    .all(today) as { id: number }[];

  if (expiredUsers.length === 0) return;

  db.exec("BEGIN");
  try {
    const revokedAt = formatSessionDateTime(now);
    const deactivateUser = db.prepare(
      "UPDATE users SET active = 0 WHERE id = ?",
    );
    const revokeSessions = db.prepare(
      `
        UPDATE sessions
        SET revoked_at = ?
        WHERE user_id = ?
          AND revoked_at IS NULL
      `,
    );

    for (const user of expiredUsers) {
      deactivateUser.run(user.id);
      revokeSessions.run(revokedAt, user.id);
    }

    db.exec("COMMIT");
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // The transaction may already be closed if SQLite rejected BEGIN.
    }
    throw error;
  }
}

export async function setSessionCookie(
  user: User,
): Promise<SetSessionCookieResult> {
  if (user.active !== 1) {
    return {
      ok: false,
      message: "This account is inactive.",
    };
  }

  const now = new Date();
  const expiresAt = getSessionExpiry(user, now);
  if (!expiresAt || expiresAt.getTime() <= now.getTime()) {
    return {
      ok: false,
      message: "This account no longer has an active access window.",
    };
  }

  const token = createSessionToken();
  db.prepare(
    `
      INSERT INTO sessions (
        user_id,
        token_hash,
        created_at,
        expires_at
      )
      VALUES (?, ?, ?, ?)
    `,
  ).run(
    user.id,
    hashSessionToken(token),
    formatSessionDateTime(now),
    formatSessionDateTime(expiresAt),
  );

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getCookieMaxAge(expiresAt, now),
  });

  return { ok: true };
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function revokeCurrentSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    db.prepare(
      `
        UPDATE sessions
        SET revoked_at = ?
        WHERE token_hash = ?
          AND revoked_at IS NULL
      `,
    ).run(formatSessionDateTime(new Date()), hashSessionToken(token));
  }
  store.delete(SESSION_COOKIE);
}

export function getActiveSessionCount(userId: number): number {
  const now = formatSessionDateTime(new Date());
  const row = db
    .prepare(
      `
        SELECT COUNT(*) AS count
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.user_id = ?
          AND s.revoked_at IS NULL
          AND s.expires_at > ?
          AND u.active = 1
          AND (
            u.role != 'guest'
            OR (
              u.check_out_date IS NOT NULL
              AND length(u.check_out_date) = 10
              AND (u.check_out_date || ' 23:59:59') > ?
            )
          )
      `,
    )
    .get(userId, now, now) as CountRow;
  return Number(row.count);
}

export function revokeUserSessions(
  actor: User,
  targetUserId: number,
): RevokeUserSessionsResult {
  if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
    return { ok: false, message: "Choose a valid user." };
  }

  const targetUser = getUserById(targetUserId);
  if (!targetUser) return { ok: false, message: "User not found." };

  if (actor.role === "guest") {
    return { ok: false, message: "Only admins can revoke sessions." };
  }
  if (actor.role !== "superadmin" && targetUser.role !== "guest") {
    return { ok: false, message: "Only super admins can revoke admin sessions." };
  }

  const beforeCount = getActiveSessionCount(targetUser.id);
  const now = formatSessionDateTime(new Date());
  db.prepare(
    `
      UPDATE sessions
      SET revoked_at = ?
      WHERE user_id = ?
        AND revoked_at IS NULL
        AND expires_at > ?
    `,
  ).run(now, targetUser.id, now);

  const afterCount = getActiveSessionCount(targetUser.id);
  return {
    ok: true,
    message:
      beforeCount === 0 ? "No active sessions to revoke." : "User sessions revoked.",
    targetUser,
    beforeCount,
    afterCount,
  };
}

export function getUserByUsername(username: string): UserWithPassword | null {
  deactivateExpiredGuestUsers(new Date());

  const row = db
    .prepare(
      `
        SELECT
          id,
          username,
          password,
          role,
          active,
          check_in_date AS checkInDate,
          check_out_date AS checkOutDate
        FROM users
        WHERE username = ?
          AND active = 1
      `,
    )
    .get(username) as UserWithPassword | undefined;
  return row ? { ...row } : null;
}

export function getUserById(id: number): User | null {
  const row = db
    .prepare(
      `
        SELECT
          id,
          username,
          role,
          active,
          check_in_date AS checkInDate,
          check_out_date AS checkOutDate
        FROM users
        WHERE id = ?
      `,
    )
    .get(id) as User | undefined;
  return row ? { ...row } : null;
}

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const now = new Date();
  deactivateExpiredGuestUsers(now);

  const row = db
    .prepare(
      `
        SELECT
          u.id,
          u.username,
          u.role,
          u.active,
          u.check_in_date AS checkInDate,
          u.check_out_date AS checkOutDate,
          s.expires_at AS expiresAt
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ?
          AND s.revoked_at IS NULL
          AND s.expires_at > ?
          AND u.active = 1
      `,
    )
    .get(hashSessionToken(token), formatSessionDateTime(now)) as
    | SessionUserRow
    | undefined;

  if (!row) return null;
  const user = {
    id: row.id,
    username: row.username,
    role: row.role,
    active: row.active,
    checkInDate: row.checkInDate,
    checkOutDate: row.checkOutDate,
  };

  return hasValidGuestCheckout(user, now) ? user : null;
}
