import { PACKAGE_SERVICE_COLUMNS } from "../package-entitlements";

export const EDITABLE_TABLE_NAMES = [
  "users",
  "facilities",
  "facility_bookings",
  "guest_service_bookings",
  "package_service_entitlements",
] as const;

export type EditableTableName = (typeof EDITABLE_TABLE_NAMES)[number];

const AUDIT_TABLE_NAMES = [
  "users",
  "facilities",
  "facility_bookings",
  "guest_service_bookings",
  "package_service_entitlements",
] as const;

export type AuditTableName = (typeof AUDIT_TABLE_NAMES)[number];

export type AdminRowValue = string | number | null;

export type AdminRow = Record<string, AdminRowValue>;

export type AdminColumnDefinition = {
  name: string;
  label: string;
  input?:
    | "text"
    | "password"
    | "number"
    | "select"
    | "date"
    | "time"
    | "packageQuantity";
  optionsKey?:
    | "active"
    | "bookableServices"
    | "celebrationChoiceRules"
    | "facilities"
    | "guestUsers"
    | "roles"
    | "users";
  readOnly?: boolean;
  required?: boolean;
  min?: number;
  maxLength?: number;
  defaultValue?: string;
};

export type AdminTableDefinition = {
  name: EditableTableName;
  label: string;
  columns: AdminColumnDefinition[];
  mutationMode?: "update-only";
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
  pagination?: AdminTablePagination;
};

export type AdminTablePagination = {
  page: number;
  pageSize: number;
  totalPages: number;
  totalRows: number;
};

export type AdminMutationResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

const TABLE_LABELS: Record<AuditTableName, string> = {
  users: "Users",
  facilities: "Facility Content",
  facility_bookings: "Bookings",
  guest_service_bookings: "Service Bookings",
  package_service_entitlements: "Packages",
};

export const FACILITY_TAGLINE_MAX_LENGTH = 40;

const ADMIN_TABLES: Record<EditableTableName, AdminTableDefinition> = {
  users: {
    name: "users",
    label: TABLE_LABELS.users,
    columns: [
      { name: "id", label: "ID", readOnly: true },
      { name: "username", label: "Username", input: "text", required: true },
      { name: "password", label: "Password", input: "password", required: true },
      {
        name: "role",
        label: "Role",
        input: "select",
        optionsKey: "roles",
        required: true,
      },
      {
        name: "active",
        label: "Access",
        optionsKey: "active",
        readOnly: true,
      },
      {
        name: "check_in_date",
        label: "Check-in Date",
        input: "date",
      },
      {
        name: "check_out_date",
        label: "Check-out Date",
        input: "date",
      },
      { name: "created_at", label: "Created", readOnly: true },
    ],
  },
  facilities: {
    name: "facilities",
    label: TABLE_LABELS.facilities,
    mutationMode: "update-only",
    columns: [
      { name: "id", label: "ID", readOnly: true },
      { name: "slug", label: "Slug", readOnly: true },
      { name: "name", label: "Name", readOnly: true },
      {
        name: "tagline_1",
        label: "Tagline 1",
        input: "text",
        maxLength: FACILITY_TAGLINE_MAX_LENGTH,
      },
      {
        name: "tagline_2",
        label: "Tagline 2",
        input: "text",
        maxLength: FACILITY_TAGLINE_MAX_LENGTH,
      },
      {
        name: "tagline_3",
        label: "Tagline 3",
        input: "text",
        maxLength: FACILITY_TAGLINE_MAX_LENGTH,
      },
    ],
  },
  facility_bookings: {
    name: "facility_bookings",
    label: TABLE_LABELS.facility_bookings,
    columns: [
      { name: "id", label: "ID", readOnly: true },
      {
        name: "user_id",
        label: "Guest",
        input: "select",
        optionsKey: "guestUsers",
        required: true,
      },
      {
        name: "facility_id",
        label: "Facility",
        input: "select",
        optionsKey: "facilities",
        required: true,
      },
      {
        name: "booking_date",
        label: "Booking Date",
        input: "date",
        required: true,
      },
      {
        name: "booking_time",
        label: "Booking Time",
        input: "time",
        required: true,
      },
      { name: "status", label: "Status", readOnly: true },
      { name: "cancelled_at", label: "Cancelled At", readOnly: true },
      { name: "created_at", label: "Created", readOnly: true },
    ],
  },
  guest_service_bookings: {
    name: "guest_service_bookings",
    label: TABLE_LABELS.guest_service_bookings,
    columns: [
      { name: "id", label: "ID", readOnly: true },
      {
        name: "user_id",
        label: "Guest",
        input: "select",
        optionsKey: "guestUsers",
        required: true,
      },
      {
        name: "service_key",
        label: "Service",
        input: "select",
        optionsKey: "bookableServices",
        required: true,
      },
      {
        name: "booking_date",
        label: "Booking Date",
        input: "date",
        required: true,
      },
      {
        name: "booking_time",
        label: "Booking Time",
        input: "time",
        required: true,
      },
      { name: "status", label: "Status", readOnly: true },
      { name: "cancelled_at", label: "Cancelled At", readOnly: true },
      { name: "created_at", label: "Created", readOnly: true },
    ],
  },
  package_service_entitlements: {
    name: "package_service_entitlements",
    label: TABLE_LABELS.package_service_entitlements,
    mutationMode: "update-only",
    columns: [
      { name: "id", label: "ID", readOnly: true },
      { name: "package_name", label: "Package", readOnly: true },
      ...PACKAGE_SERVICE_COLUMNS.map((column) => ({
        name: column.name,
        label: column.label,
        input: "packageQuantity" as const,
        required: true,
        min: 0,
      })),
      {
        name: "celebration_choice_rule",
        label: "Celebration Choice Rule",
        input: "select",
        optionsKey: "celebrationChoiceRules",
        required: true,
      },
    ],
  },
};

export function isEditableTableName(
  value: string,
): value is EditableTableName {
  return (EDITABLE_TABLE_NAMES as readonly string[]).includes(value);
}

export function isAuditTableName(value: string): value is AuditTableName {
  return (AUDIT_TABLE_NAMES as readonly string[]).includes(value);
}

export function getDefaultAdminTableName(): EditableTableName {
  return "users";
}

export function getAdminTableDefinition(
  tableName: EditableTableName,
): AdminTableDefinition {
  return ADMIN_TABLES[tableName];
}

export function isUpdateOnlyAdminTable(tableName: EditableTableName): boolean {
  return ADMIN_TABLES[tableName].mutationMode === "update-only";
}

export function getAdminTableLabel(tableName: AuditTableName): string {
  return TABLE_LABELS[tableName];
}
