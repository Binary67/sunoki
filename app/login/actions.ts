"use server";

import { networkInterfaces } from "node:os";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getUserByUsername, setSessionCookie } from "@/src/lib/auth";
import {
  clearLoginAttempts,
  getActiveLoginLock,
  INVALID_LOGIN_MESSAGE,
  LOGIN_LOCKED_MESSAGE,
  recordFailedLogin,
} from "@/src/lib/login-attempts";

export type LoginState = { error?: string; submissionId?: number };
export type SharePageLinkResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

const DEFAULT_SHARE_PORT = "3000";

export async function getSharePageLinkAction(): Promise<SharePageLinkResult> {
  const address = getLanIpv4Address();
  if (!address) {
    return { ok: false, error: "Could not detect a LAN address." };
  }

  const host = (await headers()).get("host") ?? "";
  const port = getHostPort(host);

  return { ok: true, url: `http://${address}:${port}/login` };
}

export async function loginAction(
  prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const submissionId = (prev.submissionId ?? 0) + 1;
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Enter a username and password.", submissionId };
  }

  if (getActiveLoginLock(username)) {
    return { error: LOGIN_LOCKED_MESSAGE, submissionId };
  }

  const user = getUserByUsername(username);
  if (!user || user.password !== password) {
    const attempt = recordFailedLogin(username);
    return {
      error: attempt.locked ? LOGIN_LOCKED_MESSAGE : INVALID_LOGIN_MESSAGE,
      submissionId,
    };
  }

  clearLoginAttempts(username);
  const session = await setSessionCookie(user);
  if (!session.ok) return { error: session.message, submissionId };

  redirect("/");
}

function getLanIpv4Address(): string | null {
  const addresses: string[] = [];

  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) {
        addresses.push(entry.address);
      }
    }
  }

  return (
    addresses.find((address) => address.startsWith("192.168.")) ??
    addresses.find((address) => address.startsWith("10.")) ??
    addresses.find(is172PrivateAddress) ??
    null
  );
}

function is172PrivateAddress(address: string): boolean {
  const parts = address.split(".");
  if (parts[0] !== "172") return false;

  const secondOctet = Number(parts[1]);
  return secondOctet >= 16 && secondOctet <= 31;
}

function getHostPort(host: string): string {
  const port = host.slice(host.lastIndexOf(":") + 1);
  return /^\d+$/.test(port) && port !== host ? port : DEFAULT_SHARE_PORT;
}
