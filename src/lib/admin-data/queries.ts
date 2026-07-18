import { db, type User } from "../db";
import { formatBookingDate } from "../booking-dates";
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
  guestNameSearch?: string;
  page?: number;
  pageSize?: number;
  userAccess?: UserAccessFilter;
};

export type FacilityDeletionImpact = {
  id: number;
  name: string;
  relatedBookingCount: number;
  upcomingBookingCount: number;
};

export function getAdminTableView(
  tableName: EditableTableName,
  actor: User,
  options: AdminTableViewOptions = {},
): AdminTableView {
  const table = getAdminTableDefinition(tableName);
  const viewScope = getViewScope(tableName, actor, options);
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
          ${viewScope.whereClause}
          ORDER BY id ASC
          LIMIT ? OFFSET ?
        `,
      )
      .all(...viewScope.params, pageSize + 1, offset) as AdminRow[];
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
        ${viewScope.whereClause}
        ORDER BY id ASC
      `,
    )
    .all(...viewScope.params) as AdminRow[];

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

export function getFacilityDeletionImpact(
  facilityId: number,
): FacilityDeletionImpact | null {
  if (!Number.isInteger(facilityId) || facilityId <= 0) return null;

  const now = new Date();
  const today = formatBookingDate(now);
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}`;
  const row = db
    .prepare(
      `
        SELECT
          f.id,
          f.name,
          COUNT(b.id) AS relatedBookingCount,
          SUM(
            CASE
              WHEN b.status = 'booked'
                AND (
                  b.booking_date > ?
                  OR (b.booking_date = ? AND b.booking_time >= ?)
                )
              THEN 1
              ELSE 0
            END
          ) AS upcomingBookingCount
        FROM facilities f
        LEFT JOIN facility_bookings b ON b.facility_id = f.id
        WHERE f.id = ?
        GROUP BY f.id, f.name
      `,
    )
    .get(today, today, currentTime, facilityId) as
    | {
        id: number;
        name: string;
        relatedBookingCount: number;
        upcomingBookingCount: number;
      }
    | undefined;

  return row
    ? {
        id: Number(row.id),
        name: row.name,
        relatedBookingCount: Number(row.relatedBookingCount),
        upcomingBookingCount: Number(row.upcomingBookingCount),
      }
    : null;
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

function getViewScope(
  tableName: EditableTableName,
  actor: User,
  options: AdminTableViewOptions,
): { whereClause: string; params: (string | number)[] } {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (tableName === "users" && actor.role !== "superadmin") {
    conditions.push("role = ?");
    params.push("guest");
  }

  if (tableName === "users" && options.userAccess === "active") {
    conditions.push("active = ?");
    params.push(1);
  } else if (tableName === "users" && options.userAccess === "inactive") {
    conditions.push("active = ?");
    params.push(0);
  }

  if (
    tableName === "facility_bookings" ||
    tableName === "guest_service_bookings"
  ) {
    const today = formatBookingDate(new Date());
    conditions.push(`
      guest_profile_id IN (
        SELECT gp.id
        FROM guest_profiles gp
        JOIN users u ON u.id = gp.user_id
        WHERE u.role = 'guest'
          AND u.active = 1
          AND gp.status = 'checked_in'
          AND u.check_out_date IS NOT NULL
          AND length(u.check_out_date) = 10
          AND u.check_out_date >= ?
          AND gp.checkout_date IS NOT NULL
          AND length(gp.checkout_date) = 10
          AND gp.checkout_date >= ?
      )
    `);
    params.push(today, today);
  }

  if (
    tableName === "facility_bookings" ||
    tableName === "guest_service_bookings"
  ) {
    const guestNameSearch = options.guestNameSearch?.trim();
    if (guestNameSearch) {
      conditions.push(
        "guest_profile_id IN (SELECT id FROM guest_profiles WHERE name LIKE ? ESCAPE '\\')",
      );
      params.push(`%${escapeLikePattern(guestNameSearch)}%`);
    }
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
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
