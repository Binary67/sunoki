import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db, type User, type UserWithPassword } from "./db";

const SESSION_COOKIE = "session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set. Add it to .env.local.");
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function signSessionToken(userId: number): string {
  const payload = String(userId);
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string): number | null {
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const provided = token.slice(dot + 1);
  const expected = sign(payload);
  if (provided.length !== expected.length) return null;
  const ok = timingSafeEqual(
    Buffer.from(provided, "hex"),
    Buffer.from(expected, "hex"),
  );
  if (!ok) return null;
  const id = Number(payload);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function setSessionCookie(userId: number): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, signSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export function getUserByUsername(username: string): UserWithPassword | null {
  const row = db
    .prepare(
      `
        SELECT
          id,
          username,
          password,
          role,
          check_in_date AS checkInDate,
          check_out_date AS checkOutDate
        FROM users
        WHERE username = ?
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
  const id = verifySessionToken(token);
  if (id === null) return null;
  return getUserById(id);
}
