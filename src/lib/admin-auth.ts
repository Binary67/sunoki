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

export async function requireSuperAdminUser(): Promise<User> {
  const user = await requireAdminUser();
  if (user.role !== "superadmin") {
    redirect("/admin/data/users?error=Only%20super%20admins%20can%20manage%20this%20page.");
  }
  return user;
}
