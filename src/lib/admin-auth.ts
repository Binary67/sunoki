import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";
import type { User } from "./db";

export async function requireAdminUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/booking/karaoke");
  return user;
}
