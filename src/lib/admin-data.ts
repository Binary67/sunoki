import { db, type User } from "./db";
import { isBookingDate } from "./bookings";

export const EDITABLE_TABLE_NAMES = [
  "users",
  "facilities",
  "facility_time_slots",
  "facility_bookings",
] as const;

export type EditableTableName = (typeof EDITABLE_TABLE_NAMES)[number];

export const AUDIT_OPERATIONS = ["insert", "update", "delete"] as const;

export type AuditOperation = (typeof AUDIT_OPERATIONS)[number];

export type AdminRowValue = string | number | null;

export type AdminRow = Record<string, AdminRowValue>;

export type AdminColumnDefinition = {
  name: string;
  label: string;
  input?: "text" | "number" | "select" | "date" | "time";
  optionsKey?: "active" | "facilities" | "roles" | "timeSlots" | "users";
  readOnly?: boolean;
  required?: boolean;
  min?: number;
  defaultValue?: string;
};

export type AdminTableDefinition = {
  name: EditableTableName;
  label: string;
  columns: AdminColumnDefinition[];
};

export type AdminSelectOption = {
  value: string;
  label: string;
};

export type AdminSelectOptions = Record<
  NonNullable<AdminColumnDefinition["optionsKey"]>,
  AdminSelectOption[]
>;

export type AdminTableView = {
  table: AdminTableDefinition;
  rows: AdminRow[];
  selectOptions: AdminSelectOptions;
};

export type AdminMutationResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export type AuditLog = {
  id: number;
  actorUserId: number;
  actorUsername: string;
  operation: AuditOperation;
  tableName: EditableTableName;
  rowId: number;
  beforeJson: string | null;
  afterJson: string | null;
  createdAt: string;
};

const ADMIN_TABLES: Record<EditableTableName, AdminTableDefinition> = {
  users: {
    name: "users",
    label: "Users",
    columns: [
      { name: "id", label: "ID", readOnly: true },
      { name: "username", label: "Username", input: "text", required: true },
      { name: "password", label: "Password", input: "text", required: true },
      {
        name: "role",
        label: "Role",
        input: "select",
        optionsKey: "roles",
        required: true,
      },
      { name: "created_at", label: "Created", readOnly: true },
    ],
  },
  facilities: {
    name: "facilities",
    label: "Facilities",
    columns: [
      { name: "id", label: "ID", readOnly: true },
      { name: "slug", label: "Slug", input: "text", required: true },
      { name: "name", label: "Name", input: "text", required: true },
    ],
  },
  facility_time_slots: {
    name: "facility_time_slots",
    label: "Time Slots",
    columns: [
      { name: "id", label: "ID", readOnly: true },
      {
        name: "facility_id",
        label: "Facility",
        input: "select",
        optionsKey: "facilities",
        required: true,
      },
      {
        name: "start_time",
        label: "Start Time",
        input: "time",
        required: true,
      },
      {
        name: "duration_minutes",
        label: "Duration Minutes",
        input: "number",
        required: true,
        min: 1,
        defaultValue: "60",
      },
      {
        name: "capacity_pax",
        label: "Capacity Pax",
        input: "number",
        required: true,
        min: 1,
        defaultValue: "2",
      },
      {
        name: "active",
        label: "Active",
        input: "select",
        optionsKey: "active",
        required: true,
        defaultValue: "1",
      },
    ],
  },
  facility_bookings: {
    name: "facility_bookings",
    label: "Bookings",
    columns: [
      { name: "id", label: "ID", readOnly: true },
      {
        name: "user_id",
        label: "User",
        input: "select",
        optionsKey: "users",
        required: true,
      },
      {
        name: "facility_time_slot_id",
        label: "Time Slot",
        input: "select",
        optionsKey: "timeSlots",
        required: true,
      },
      {
        name: "booking_date",
        label: "Booking Date",
        input: "date",
        required: true,
      },
      { name: "created_at", label: "Created", readOnly: true },
    ],
  },
};

type ParsedValues =
  | { ok: true; values: Record<string, string | number> }
  | { ok: false; message: string };

type InsertResult = {
  lastInsertRowid: number | bigint;
};

type FacilityOptionRow = {
  id: number;
  slug: string;
  name: string;
};

type UserOptionRow = {
  id: number;
  username: string;
  role: "admin" | "guest";
};

type TimeSlotOptionRow = {
  id: number;
  facilityName: string;
  startTime: string;
  durationMinutes: number;
  active: number;
};

type AuditLogRow = {
  id: number;
  actorUserId: number;
  actorUsername: string;
  operation: AuditOperation;
  tableName: EditableTableName;
  rowId: number;
  beforeJson: string | null;
  afterJson: string | null;
  createdAt: string;
};

export function isEditableTableName(
  value: string,
): value is EditableTableName {
  return (EDITABLE_TABLE_NAMES as readonly string[]).includes(value);
}

export function isAuditOperation(value: string): value is AuditOperation {
  return (AUDIT_OPERATIONS as readonly string[]).includes(value);
}

export function getDefaultAdminTableName(): EditableTableName {
  return "users";
}

export function getAdminTableDefinition(
  tableName: EditableTableName,
): AdminTableDefinition {
  return ADMIN_TABLES[tableName];
}

export function getAdminTableLabel(tableName: EditableTableName): string {
  return ADMIN_TABLES[tableName].label;
}

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

export function getAdminSelectOptions(): AdminSelectOptions {
  const facilities = db
    .prepare("SELECT id, slug, name FROM facilities ORDER BY name ASC, id ASC")
    .all() as FacilityOptionRow[];
  const users = db
    .prepare("SELECT id, username, role FROM users ORDER BY username ASC, id ASC")
    .all() as UserOptionRow[];
  const timeSlots = db
    .prepare(
      `
        SELECT
          s.id,
          f.name AS facilityName,
          s.start_time AS startTime,
          s.duration_minutes AS durationMinutes,
          s.active
        FROM facility_time_slots s
        JOIN facilities f ON f.id = s.facility_id
        ORDER BY f.name ASC, s.start_time ASC, s.id ASC
      `,
    )
    .all() as TimeSlotOptionRow[];

  return {
    active: [
      { value: "1", label: "Active" },
      { value: "0", label: "Inactive" },
    ],
    facilities: facilities.map((facility) => ({
      value: String(facility.id),
      label: `${facility.name} (${facility.slug})`,
    })),
    roles: [
      { value: "admin", label: "Admin" },
      { value: "guest", label: "Guest" },
    ],
    timeSlots: timeSlots.map((slot) => ({
      value: String(slot.id),
      label: `${slot.facilityName} - ${slot.startTime} - ${slot.durationMinutes} min${
        Number(slot.active) === 1 ? "" : " - inactive"
      }`,
    })),
    users: users.map((user) => ({
      value: String(user.id),
      label: `${user.username} (${user.role})`,
    })),
  };
}

export function createAdminRow(
  actor: User,
  tableName: EditableTableName,
  formData: FormData,
): AdminMutationResult {
  const table = getAdminTableDefinition(tableName);
  const parsed = parseFormValues(tableName, formData);
  if (!parsed.ok) return { ok: false, message: parsed.message };

  try {
    runTransaction(() => {
      const columns = Object.keys(parsed.values);
      const placeholders = columns.map(() => "?").join(", ");
      const result = db
        .prepare(
          `
            INSERT INTO ${table.name} (${columns.join(", ")})
            VALUES (${placeholders})
          `,
        )
        .run(...columns.map((column) => parsed.values[column])) as InsertResult;
      const rowId = Number(result.lastInsertRowid);
      const after = selectRowById(table, rowId);
      if (!after) throw new Error("Inserted row could not be loaded.");
      insertAuditLog(actor, "insert", table.name, rowId, null, after);
    });
    return { ok: true, message: "Row created." };
  } catch {
    return {
      ok: false,
      message: "Unable to create row. Check unique values and relationships.",
    };
  }
}

export function updateAdminRow(
  actor: User,
  tableName: EditableTableName,
  rowId: number,
  formData: FormData,
): AdminMutationResult {
  const table = getAdminTableDefinition(tableName);
  if (!Number.isInteger(rowId) || rowId <= 0) {
    return { ok: false, message: "Choose a valid row." };
  }

  const parsed = parseFormValues(tableName, formData);
  if (!parsed.ok) return { ok: false, message: parsed.message };

  let found = true;

  try {
    runTransaction(() => {
      const before = selectRowById(table, rowId);
      if (!before) {
        found = false;
        return;
      }

      const columns = Object.keys(parsed.values);
      db.prepare(
        `
          UPDATE ${table.name}
          SET ${columns.map((column) => `${column} = ?`).join(", ")}
          WHERE id = ?
        `,
      ).run(...columns.map((column) => parsed.values[column]), rowId);

      const after = selectRowById(table, rowId);
      if (!after) throw new Error("Updated row could not be loaded.");
      insertAuditLog(actor, "update", table.name, rowId, before, after);
    });

    if (!found) return { ok: false, message: "Row not found." };
    return { ok: true, message: "Row updated." };
  } catch {
    return {
      ok: false,
      message: "Unable to update row. Check unique values and relationships.",
    };
  }
}

export function deleteAdminRow(
  actor: User,
  tableName: EditableTableName,
  rowId: number,
): AdminMutationResult {
  const table = getAdminTableDefinition(tableName);
  if (!Number.isInteger(rowId) || rowId <= 0) {
    return { ok: false, message: "Choose a valid row." };
  }

  let found = true;

  try {
    runTransaction(() => {
      const before = selectRowById(table, rowId);
      if (!before) {
        found = false;
        return;
      }

      db.prepare(`DELETE FROM ${table.name} WHERE id = ?`).run(rowId);
      insertAuditLog(actor, "delete", table.name, rowId, before, null);
    });

    if (!found) return { ok: false, message: "Row not found." };
    return { ok: true, message: "Row deleted." };
  } catch {
    return {
      ok: false,
      message: "Unable to delete row. Check related records.",
    };
  }
}

export function getAuditLogs(filters: {
  tableName?: EditableTableName;
  operation?: AuditOperation;
}): AuditLog[] {
  const conditions: string[] = [];
  const params: string[] = [];

  if (filters.tableName) {
    conditions.push("table_name = ?");
    params.push(filters.tableName);
  }

  if (filters.operation) {
    conditions.push("operation = ?");
    params.push(filters.operation);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = db
    .prepare(
      `
        SELECT
          id,
          actor_user_id AS actorUserId,
          actor_username AS actorUsername,
          operation,
          table_name AS tableName,
          row_id AS rowId,
          before_json AS beforeJson,
          after_json AS afterJson,
          created_at AS createdAt
        FROM audit_logs
        ${where}
        ORDER BY id DESC
        LIMIT 200
      `,
    )
    .all(...params) as AuditLogRow[];

  return rows.map((row) => ({
    id: Number(row.id),
    actorUserId: Number(row.actorUserId),
    actorUsername: row.actorUsername,
    operation: row.operation,
    tableName: row.tableName,
    rowId: Number(row.rowId),
    beforeJson: row.beforeJson,
    afterJson: row.afterJson,
    createdAt: row.createdAt,
  }));
}

function getColumnList(table: AdminTableDefinition): string {
  return table.columns.map((column) => column.name).join(", ");
}

function selectRowById(
  table: AdminTableDefinition,
  rowId: number,
): AdminRow | null {
  const row = db
    .prepare(`SELECT ${getColumnList(table)} FROM ${table.name} WHERE id = ?`)
    .get(rowId) as AdminRow | undefined;
  return row ? { ...row } : null;
}

function insertAuditLog(
  actor: User,
  operation: AuditOperation,
  tableName: EditableTableName,
  rowId: number,
  before: AdminRow | null,
  after: AdminRow | null,
): void {
  db.prepare(
    `
      INSERT INTO audit_logs (
        actor_user_id,
        actor_username,
        operation,
        table_name,
        row_id,
        before_json,
        after_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    actor.id,
    actor.username,
    operation,
    tableName,
    rowId,
    before ? JSON.stringify(before) : null,
    after ? JSON.stringify(after) : null,
  );
}

function runTransaction(fn: () => void): void {
  let inTransaction = false;
  try {
    db.exec("BEGIN IMMEDIATE");
    inTransaction = true;
    fn();
    db.exec("COMMIT");
    inTransaction = false;
  } catch (error) {
    if (inTransaction) db.exec("ROLLBACK");
    throw error;
  }
}

function parseFormValues(
  tableName: EditableTableName,
  formData: FormData,
): ParsedValues {
  switch (tableName) {
    case "users": {
      const username = readRequiredText(formData, "username", "Username");
      if (!username.ok) return username;
      const password = readRequiredText(formData, "password", "Password", false);
      if (!password.ok) return password;
      const role = readRequiredText(formData, "role", "Role");
      if (!role.ok) return role;
      if (role.value !== "admin" && role.value !== "guest") {
        return { ok: false, message: "Choose a valid role." };
      }
      return {
        ok: true,
        values: {
          username: username.value,
          password: password.value,
          role: role.value,
        },
      };
    }
    case "facilities": {
      const slug = readRequiredText(formData, "slug", "Slug");
      if (!slug.ok) return slug;
      const name = readRequiredText(formData, "name", "Name");
      if (!name.ok) return name;
      return { ok: true, values: { slug: slug.value, name: name.value } };
    }
    case "facility_time_slots": {
      const facilityId = readPositiveInteger(formData, "facility_id", "Facility");
      if (!facilityId.ok) return facilityId;
      const startTime = readRequiredText(formData, "start_time", "Start time");
      if (!startTime.ok) return startTime;
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime.value)) {
        return { ok: false, message: "Enter a valid start time." };
      }
      const duration = readPositiveInteger(
        formData,
        "duration_minutes",
        "Duration minutes",
      );
      if (!duration.ok) return duration;
      const capacity = readPositiveInteger(
        formData,
        "capacity_pax",
        "Capacity pax",
      );
      if (!capacity.ok) return capacity;
      const active = readRequiredText(formData, "active", "Active");
      if (!active.ok) return active;
      if (active.value !== "0" && active.value !== "1") {
        return { ok: false, message: "Choose whether the slot is active." };
      }
      return {
        ok: true,
        values: {
          facility_id: facilityId.value,
          start_time: startTime.value,
          duration_minutes: duration.value,
          capacity_pax: capacity.value,
          active: Number(active.value),
        },
      };
    }
    case "facility_bookings": {
      const userId = readPositiveInteger(formData, "user_id", "User");
      if (!userId.ok) return userId;
      const timeSlotId = readPositiveInteger(
        formData,
        "facility_time_slot_id",
        "Time slot",
      );
      if (!timeSlotId.ok) return timeSlotId;
      const bookingDate = readRequiredText(
        formData,
        "booking_date",
        "Booking date",
      );
      if (!bookingDate.ok) return bookingDate;
      if (!isBookingDate(bookingDate.value)) {
        return { ok: false, message: "Enter a valid booking date." };
      }
      return {
        ok: true,
        values: {
          user_id: userId.value,
          facility_time_slot_id: timeSlotId.value,
          booking_date: bookingDate.value,
        },
      };
    }
  }
}

function readRequiredText(
  formData: FormData,
  key: string,
  label: string,
  trim = true,
):
  | { ok: true; value: string }
  | { ok: false; message: string } {
  const raw = formData.get(key);
  const value = typeof raw === "string" ? (trim ? raw.trim() : raw) : "";
  if (!value) return { ok: false, message: `${label} is required.` };
  return { ok: true, value };
}

function readPositiveInteger(
  formData: FormData,
  key: string,
  label: string,
):
  | { ok: true; value: number }
  | { ok: false; message: string } {
  const raw = formData.get(key);
  const value = typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isInteger(value) || value <= 0) {
    return { ok: false, message: `Choose a valid ${label.toLowerCase()}.` };
  }
  return { ok: true, value };
}
