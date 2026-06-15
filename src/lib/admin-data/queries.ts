import { db, type User } from "../db";
import {
  getAdminTableDefinition,
  type AdminRow,
  type AdminTableDefinition,
  type AdminTableView,
  type EditableTableName,
} from "./definitions";
import {
  getAdminDisplaySelectOptions,
  getAdminSelectOptions,
  type AdminSelectOptionKey,
} from "./options";

export type UserAccessFilter = "active" | "inactive";

export type AdminTableViewOptions = {
  page?: number;
  pageSize?: number;
  userAccess?: UserAccessFilter;
};

export function getAdminTableView(
  tableName: EditableTableName,
  actor: User,
  options: AdminTableViewOptions = {},
): AdminTableView {
  const table = getAdminTableDefinition(tableName);
  const userScope = getUserScope(tableName, actor, options.userAccess);
  const pageSize = getPageSize(options.pageSize);

  if (pageSize) {
    const page =
      options.page && Number.isInteger(options.page) && options.page > 0
        ? options.page
        : 1;
    const offset = (page - 1) * pageSize;

    const fetchedRows = db
      .prepare(
        `
          SELECT ${getTableViewColumnList(table)}
          FROM ${table.name}
          ${userScope.whereClause}
          ORDER BY id ASC
          LIMIT ? OFFSET ?
        `,
      )
      .all(...userScope.params, pageSize + 1, offset) as AdminRow[];
    const rows = fetchedRows.slice(0, pageSize);

    return {
      table,
      rows,
      selectOptions: getAdminDisplaySelectOptions(table, rows),
      pagination: {
        page,
        pageSize,
        hasPreviousPage: page > 1,
        hasNextPage: fetchedRows.length > pageSize,
      },
    };
  }

  const rows = db
    .prepare(
      `
        SELECT ${getTableViewColumnList(table)}
        FROM ${table.name}
        ${userScope.whereClause}
        ORDER BY id ASC
      `,
    )
    .all(...userScope.params) as AdminRow[];

  return {
    table,
    rows,
    selectOptions: getAdminDisplaySelectOptions(table, rows),
  };
}

export function getAdminFormSelectOptions(
  tableName: EditableTableName,
): AdminTableView["selectOptions"] {
  const table = getAdminTableDefinition(tableName);
  return getAdminSelectOptions(getRequiredSelectOptionKeys(table));
}

function getPageSize(value: number | undefined): number | null {
  return value && Number.isInteger(value) && value > 0 ? value : null;
}

function getRequiredSelectOptionKeys(
  table: AdminTableDefinition,
): AdminSelectOptionKey[] {
  const keys = new Set<AdminSelectOptionKey>();
  for (const column of table.columns) {
    if (column.optionsKey) keys.add(column.optionsKey);
  }
  return [...keys];
}

function getUserScope(
  tableName: EditableTableName,
  actor: User,
  userAccess: UserAccessFilter | undefined,
): { whereClause: string; params: (string | number)[] } {
  if (tableName !== "users") return { whereClause: "", params: [] };

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (actor.role !== "superadmin") {
    conditions.push("role = ?");
    params.push("guest");
  }

  if (userAccess === "active") {
    conditions.push("active = ?");
    params.push(1);
  } else if (userAccess === "inactive") {
    conditions.push("active = ?");
    params.push(0);
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
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

function getTableViewColumnList(table: AdminTableDefinition): string {
  const columns = table.columns.map((column) => column.name);
  if (
    table.name === "facility_bookings" ||
    table.name === "guest_service_bookings"
  ) {
    columns.push("admin_read", "admin_done");
  }
  return columns.join(", ");
}
