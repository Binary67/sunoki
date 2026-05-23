"use server";

import { redirect } from "next/navigation";
import { getUserByUsername, setSessionCookie } from "@/src/lib/auth";
import {
  clearLoginAttempts,
  getActiveLoginLock,
  INVALID_LOGIN_MESSAGE,
  LOGIN_LOCKED_MESSAGE,
  recordFailedLogin,
} from "@/src/lib/login-attempts";
import { isAdminRole } from "@/src/lib/roles";

export type LoginState = { error?: string; submissionId?: number };

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

  redirect(isAdminRole(user.role) ? "/" : "/booking/karaoke");
}
