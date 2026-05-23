"use server";

import { redirect } from "next/navigation";
import { revokeCurrentSession } from "@/src/lib/auth";

export async function logoutAction(): Promise<void> {
  await revokeCurrentSession();
  redirect("/login");
}
