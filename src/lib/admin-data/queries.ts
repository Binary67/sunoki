import { db, type User } from "../db";
import {
  getAdminTableDefinition,
  type AdminRow,
  type AdminTableDefinition,
  type AdminTableView,
  type EditableTableName,
} from "./definitions";
import { getAdminSelectOptions } from "./options";

export function getAdminTableView(
  tableName: EditableTableName,
  actor: User,
): AdminTableView {
  const table = getAdminTableDefinition(tableName);
  const userFilter =
    tableName === "users" && actor.role !== "superadmin"
      ? " WHERE role = 'guest'"
      : "";
  const rows = db
    .prepare(
      `SELECT ${getColumnList(table)} FROM ${table.name}${userFilter} ORDER BY id ASC`,
    )
    .all() as AdminRow[];

  return {
    table,
    rows,
    selectOptions: getAdminSelectOptions(),
  };
}

export function getAdminRowForEdit(
  tableName: EditableTableName,
  rowId: number,
  actor: User,
): AdminRow | null {
  const row = selectRowById(getAdminTableDefinition(tableName), rowId);
  if (
    tableName === "users" &&
    actor.role !== "superadmin" &&
    row?.role !== "guest"
  ) {
    return null;
  }
  return row;
}

export function selectRowById(
  table: AdminTableDefinition,
  rowId: number,
): AdminRow | null {
  const row = db
    .prepare(`SELECT ${getColumnList(table)} FROM ${table.name} WHERE id = ?`)
    .get(rowId) as AdminRow | undefined;
  return row ? { ...row } : null;
}

function getColumnList(table: AdminTableDefinition): string {
  return table.columns.map((column) => column.name).join(", ");
}
