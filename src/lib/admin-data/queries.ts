import { db, type User } from "../db";
import {
  getAdminTableDefinition,
  type AdminRow,
  type AdminTableDefinition,
  type AdminTableView,
  type EditableTableName,
} from "./definitions";
import {
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
  const selectOptions = getAdminSelectOptions(getRequiredSelectOptionKeys(table));

  if (pageSize) {
    const requestedPage =
      options.page && Number.isInteger(options.page) && options.page > 0
        ? options.page
        : 1;
    const totalRows = getRowCount(table, userScope.whereClause, userScope.params);
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const offset = (page - 1) * pageSize;

    const rows = db
      .prepare(
        `
          SELECT ${getColumnList(table)}
          FROM ${table.name}
          ${userScope.whereClause}
          ORDER BY id ASC
          LIMIT ? OFFSET ?
        `,
      )
      .all(...userScope.params, pageSize, offset) as AdminRow[];

    return {
      table,
      rows,
      selectOptions,
      pagination: {
        page,
        pageSize,
        totalPages,
        totalRows,
      },
    };
  }

  const rows = db
    .prepare(
      `
        SELECT ${getColumnList(table)}
        FROM ${table.name}
        ${userScope.whereClause}
        ORDER BY id ASC
      `,
    )
    .all(...userScope.params) as AdminRow[];

  return {
    table,
    rows,
    selectOptions,
  };
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

function getRowCount(
  table: AdminTableDefinition,
  whereClause: string,
  params: (string | number)[],
): number {
  const row = db
    .prepare(
      `
        SELECT COUNT(*) AS totalRows
        FROM ${table.name}
        ${whereClause}
      `,
    )
    .get(...params) as { totalRows: number } | undefined;

  return row?.totalRows ?? 0;
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
