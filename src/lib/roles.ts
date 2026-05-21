export type UserRole = "superadmin" | "admin" | "guest";

export function isAdminRole(role: UserRole): boolean {
  return role === "superadmin" || role === "admin";
}
