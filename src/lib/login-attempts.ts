import { db, type User } from "./db";

const FAILED_LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LOCK_MS = 15 * 60 * 1000;

export const INVALID_LOGIN_MESSAGE = "Invalid username or password.";
export const LOGIN_LOCKED_MESSAGE =
  "The account is locked temporarily. Please try again later or contact an admin.";

type LoginAttemptRow = {
  attemptKey: string;
  failedCount: number;
  windowStartedAt: string;
  lastFailedAt: string;
  lockedUntil: string | null;
};

export type ActiveLoginLock = {
  lockedUntil: string;
};

export type RecordFailedLoginResult =
  | { locked: true; lockedUntil: string }
  | { locked: false };

export type ClearUserLoginLockResult =
  | {
      ok: true;
      message: string;
      targetUser: User;
      beforeLockedUntil: string | null;
      afterLockedUntil: string | null;
    }
  | { ok: false; message: string };

function normalizeLoginAttemptKey(username: string): string {
  return username.trim().toLowerCase();
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

function parseDateTime(value: string): Date {
  const [datePart, timePart] = value.split(" ");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, second);
}

function getAttemptRow(attemptKey: string): LoginAttemptRow | null {
  const row = db
    .prepare(
      `
        SELECT
          attempt_key AS attemptKey,
          failed_count AS failedCount,
          window_started_at AS windowStartedAt,
          last_failed_at AS lastFailedAt,
          locked_until AS lockedUntil
        FROM login_attempts
        WHERE attempt_key = ?
      `,
    )
    .get(attemptKey) as LoginAttemptRow | undefined;
  return row ? { ...row } : null;
}

function isLocked(row: LoginAttemptRow, nowText: string): boolean {
  return Boolean(row.lockedUntil && row.lockedUntil > nowText);
}

function getUserById(userId: number): User | null {
  const row = db
    .prepare(
      `
        SELECT
          id,
          username,
          role,
          check_in_date AS checkInDate,
          check_out_date AS checkOutDate
        FROM users
        WHERE id = ?
      `,
    )
    .get(userId) as User | undefined;
  return row ? { ...row } : null;
}

export function getActiveLoginLock(
  username: string,
  now = new Date(),
): ActiveLoginLock | null {
  const attemptKey = normalizeLoginAttemptKey(username);
  if (!attemptKey) return null;

  const row = getAttemptRow(attemptKey);
  if (!row || !row.lockedUntil) return null;

  return row.lockedUntil > formatDateTime(now)
    ? { lockedUntil: row.lockedUntil }
    : null;
}

export function recordFailedLogin(
  username: string,
  now = new Date(),
): RecordFailedLoginResult {
  const attemptKey = normalizeLoginAttemptKey(username);
  if (!attemptKey) return { locked: false };

  const nowText = formatDateTime(now);
  const row = getAttemptRow(attemptKey);
  if (row && isLocked(row, nowText)) {
    return { locked: true, lockedUntil: row.lockedUntil as string };
  }

  const shouldStartWindow =
    !row ||
    Boolean(row.lockedUntil) ||
    now.getTime() - parseDateTime(row.windowStartedAt).getTime() >=
      LOGIN_WINDOW_MS;
  const failedCount = shouldStartWindow ? 1 : Number(row.failedCount) + 1;
  const lockedUntil =
    failedCount >= FAILED_LOGIN_LIMIT
      ? formatDateTime(new Date(now.getTime() + LOGIN_LOCK_MS))
      : null;

  db.prepare(
    `
      INSERT INTO login_attempts (
        attempt_key,
        failed_count,
        window_started_at,
        last_failed_at,
        locked_until
      )
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(attempt_key) DO UPDATE SET
        failed_count = excluded.failed_count,
        window_started_at = excluded.window_started_at,
        last_failed_at = excluded.last_failed_at,
        locked_until = excluded.locked_until
    `,
  ).run(
    attemptKey,
    failedCount,
    shouldStartWindow ? nowText : row.windowStartedAt,
    nowText,
    lockedUntil,
  );

  return lockedUntil
    ? { locked: true, lockedUntil }
    : { locked: false };
}

export function clearLoginAttempts(username: string): void {
  const attemptKey = normalizeLoginAttemptKey(username);
  if (!attemptKey) return;

  db.prepare("DELETE FROM login_attempts WHERE attempt_key = ?").run(attemptKey);
}

export function clearUserLoginLock(
  actor: User,
  targetUserId: number,
): ClearUserLoginLockResult {
  if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
    return { ok: false, message: "Choose a valid user." };
  }

  const targetUser = getUserById(targetUserId);
  if (!targetUser) return { ok: false, message: "User not found." };

  if (actor.role === "guest") {
    return { ok: false, message: "Only admins can clear login locks." };
  }
  if (actor.role !== "superadmin" && targetUser.role !== "guest") {
    return {
      ok: false,
      message: "Only super admins can clear admin login locks.",
    };
  }

  const before = getActiveLoginLock(targetUser.username);
  clearLoginAttempts(targetUser.username);

  return {
    ok: true,
    message: before ? "Login lock cleared." : "No temporary login lock to clear.",
    targetUser,
    beforeLockedUntil: before?.lockedUntil ?? null,
    afterLockedUntil: null,
  };
}
