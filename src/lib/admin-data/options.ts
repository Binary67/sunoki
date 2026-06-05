import { db } from "../db";
import type { UserRole } from "../roles";
import { BOOKABLE_PACKAGE_SERVICES } from "../service-bookings/catalog";
import type {
  AdminRow,
  AdminRowValue,
  AdminSelectOptions,
  AdminTableDefinition,
} from "./definitions";

export type AdminSelectOptionKey = keyof AdminSelectOptions;

type FacilityOptionRow = {
  id: number;
  slug: string;
  name: string;
};

type UserOptionRow = {
  id: number;
  guestName: string | null;
  username: string;
  role: UserRole;
  active: number;
};

export function getAdminSelectOptions(
  requiredKeys: readonly AdminSelectOptionKey[] = [],
): AdminSelectOptions {
  const required = new Set(requiredKeys);
  const facilities = required.has("facilities") ? getFacilityOptions() : [];
  const users =
    required.has("guestUsers") || required.has("users") ? getUserOptions() : [];

  return buildSelectOptions(facilities, users);
}

export function getAdminDisplaySelectOptions(
  table: AdminTableDefinition,
  rows: readonly AdminRow[],
): AdminSelectOptions {
  const required = new Set(getRequiredSelectOptionKeys(table));
  const facilities = required.has("facilities")
    ? getFacilityOptionsByIds(getReferencedIds(table, rows, ["facilities"]))
    : [];
  const users =
    required.has("guestUsers") || required.has("users")
      ? getUserOptionsByIds(getReferencedIds(table, rows, ["guestUsers", "users"]))
      : [];

  return buildSelectOptions(facilities, users);
}

function buildSelectOptions(
  facilities: FacilityOptionRow[],
  users: UserOptionRow[],
): AdminSelectOptions {
  return {
    active: [
      { value: "1", label: "Active" },
      { value: "0", label: "Inactive" },
    ],
    bookableServices: BOOKABLE_PACKAGE_SERVICES.map((service) => ({
      value: service.key,
      label: service.name,
    })).sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
    ),
    celebrationChoiceRules: [
      { value: "none", label: "None" },
      { value: "choose_one", label: "Choose One" },
    ],
    facilities: facilities.map((facility) => ({
      value: String(facility.id),
      label: `${facility.name} (${facility.slug})`,
    })),
    guestUsers: users
      .filter((user) => user.role === "guest")
      .map((user) => ({
        value: String(user.id),
        label: `${formatGuestLabel(user)}${
          user.active === 1 ? "" : " (inactive)"
        }`,
      })),
    roles: [
      { value: "superadmin", label: "Super Admin" },
      { value: "admin", label: "Admin" },
      { value: "guest", label: "Guest" },
    ],
    users: users.map((user) => ({
      value: String(user.id),
      label: `${user.username} (${formatRoleLabel(user.role)}${
        user.active === 1 ? "" : ", inactive"
      })`,
    })),
  };
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

function getReferencedIds(
  table: AdminTableDefinition,
  rows: readonly AdminRow[],
  optionKeys: readonly AdminSelectOptionKey[],
): number[] {
  const optionKeySet = new Set(optionKeys);
  const columnNames = table.columns
    .filter((column) => column.optionsKey && optionKeySet.has(column.optionsKey))
    .map((column) => column.name);
  const ids = new Set<number>();

  for (const row of rows) {
    for (const columnName of columnNames) {
      const id = parseId(row[columnName]);
      if (id !== null) ids.add(id);
    }
  }

  return [...ids];
}

function parseId(value: AdminRowValue): number | null {
  const id = typeof value === "number" ? value : Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function getFacilityOptions(): FacilityOptionRow[] {
  return db
    .prepare("SELECT id, slug, name FROM facilities ORDER BY name ASC, id ASC")
    .all() as FacilityOptionRow[];
}

function getFacilityOptionsByIds(ids: number[]): FacilityOptionRow[] {
  if (ids.length === 0) return [];

  return db
    .prepare(
      `
        SELECT id, slug, name
        FROM facilities
        WHERE id IN (${ids.map(() => "?").join(", ")})
      `,
    )
    .all(...ids) as FacilityOptionRow[];
}

function getUserOptions(): UserOptionRow[] {
  return db
    .prepare(
      `
        SELECT
          u.id,
          gp.name AS guestName,
          u.username,
          u.role,
          u.active
        FROM users u
        LEFT JOIN guest_profiles gp ON gp.user_id = u.id
        ORDER BY gp.name ASC, u.username ASC, u.id ASC
      `,
    )
    .all() as UserOptionRow[];
}

function getUserOptionsByIds(ids: number[]): UserOptionRow[] {
  if (ids.length === 0) return [];

  return db
    .prepare(
      `
        SELECT
          u.id,
          gp.name AS guestName,
          u.username,
          u.role,
          u.active
        FROM users u
        LEFT JOIN guest_profiles gp ON gp.user_id = u.id
        WHERE u.id IN (${ids.map(() => "?").join(", ")})
      `,
    )
    .all(...ids) as UserOptionRow[];
}

function formatGuestLabel(user: UserOptionRow): string {
  return user.guestName ? `${user.guestName} (${user.username})` : user.username;
}

function formatRoleLabel(role: UserRole): string {
  switch (role) {
    case "superadmin":
      return "Super Admin";
    case "admin":
      return "Admin";
    case "guest":
      return "Guest";
  }
}
