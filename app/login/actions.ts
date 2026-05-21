"use server";

import { redirect } from "next/navigation";
import { getUserByUsername, setSessionCookie } from "@/src/lib/auth";
import { isAdminRole } from "@/src/lib/roles";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Enter a username and password." };
  }

  const user = getUserByUsername(username);
  if (!user || user.password !== password) {
    return { error: "Invalid username or password." };
  }

  await setSessionCookie(user.id);
  redirect(isAdminRole(user.role) ? "/" : "/booking/karaoke");
}
