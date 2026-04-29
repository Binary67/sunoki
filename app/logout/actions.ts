"use server";

import { redirect } from "next/navigation";
import { clearSessionCookie } from "@/src/lib/auth";

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
