import type {
  AdminRow,
  EditableTableName,
} from "@/src/lib/admin-data/definitions";
import type { User } from "@/src/lib/db";

export function canManageUserRecord(actor: User, row: AdminRow): boolean {
  return actor.role === "superadmin" && getUserRole(row) !== "guest";
}

export function canEditRecord(
  tableName: EditableTableName,
  row: AdminRow,
): boolean {
  if (
    tableName === "facility_bookings" ||
    tableName === "guest_service_bookings"
  ) {
    return row.status === "booked";
  }
  return true;
}

export function getCannotEditRowMessage(tableName: EditableTableName): string {
  if (
    tableName === "facility_bookings" ||
    tableName === "guest_service_bookings"
  ) {
    return "Cancelled bookings cannot be edited.";
  }
  return "Guest accounts are managed from guest profiles.";
}

export function getUserRole(row: AdminRow): string | null {
  return typeof row.role === "string" ? row.role : null;
}

export function getUserLabel(row: AdminRow, rowId: number): string {
  const username = row.username;
  return typeof username === "string" && username ? username : `user #${rowId}`;
}
