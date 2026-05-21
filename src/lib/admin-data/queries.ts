import { db } from "../db";
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
): AdminTableView {
  const table = getAdminTableDefinition(tableName);
  const rows = db
    .prepare(
      `SELECT ${getColumnList(table)} FROM ${table.name} ORDER BY id ASC`,
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
): AdminRow | null {
  return selectRowById(getAdminTableDefinition(tableName), rowId);
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
