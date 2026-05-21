import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";
import type { User } from "./db";
import { isAdminRole } from "./roles";

export async function requireAdminUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdminRole(user.role)) redirect("/booking/karaoke");
  return user;
}
