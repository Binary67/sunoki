export const BACKUP_TABLE_NAMES = [
  "users",
  "facilities",
  "facility_time_slots",
  "guest_profiles",
  "guest_profile_addons",
  "facility_bookings",
  "guest_service_bookings",
] as const;

export type BackupTableName = (typeof BACKUP_TABLE_NAMES)[number];

export type BackupColumnDefinition = {
  name: string;
  valueType: "integer" | "text";
};

export type BackupTableDefinition = {
  name: BackupTableName;
  label: string;
  columns: BackupColumnDefinition[];
};

const BACKUP_TABLES: Record<BackupTableName, BackupTableDefinition> = {
  users: {
    name: "users",
    label: "Users",
    columns: [
      { name: "id", valueType: "integer" },
      { name: "username", valueType: "text" },
      { name: "password", valueType: "text" },
      { name: "role", valueType: "text" },
      { name: "active", valueType: "integer" },
      { name: "check_in_date", valueType: "text" },
      { name: "check_out_date", valueType: "text" },
      { name: "created_at", valueType: "text" },
    ],
  },
  facilities: {
    name: "facilities",
    label: "Facilities",
    columns: [
      { name: "id", valueType: "integer" },
      { name: "slug", valueType: "text" },
      { name: "name", valueType: "text" },
      { name: "tagline_1", valueType: "text" },
      { name: "tagline_2", valueType: "text" },
      { name: "tagline_3", valueType: "text" },
    ],
  },
  facility_time_slots: {
    name: "facility_time_slots",
    label: "Facility Time Slots",
    columns: [
      { name: "id", valueType: "integer" },
      { name: "facility_id", valueType: "integer" },
      { name: "start_time", valueType: "text" },
      { name: "duration_minutes", valueType: "integer" },
      { name: "capacity_pax", valueType: "integer" },
      { name: "active", valueType: "integer" },
    ],
  },
  guest_profiles: {
    name: "guest_profiles",
    label: "Guest Profiles",
    columns: [
      { name: "id", valueType: "integer" },
      { name: "name", valueType: "text" },
      { name: "status", valueType: "text" },
      { name: "room_number", valueType: "text" },
      { name: "ic_no", valueType: "text" },
      { name: "handphone_no", valueType: "text" },
      { name: "email", valueType: "text" },
      { name: "expected_delivery_date", valueType: "text" },
      { name: "hospital_of_delivery", valueType: "text" },
      { name: "mode_of_delivery", valueType: "text" },
      { name: "child_count", valueType: "text" },
      { name: "special_note", valueType: "text" },
      { name: "husband_name", valueType: "text" },
      { name: "husband_ic_no", valueType: "text" },
      { name: "husband_handphone_no", valueType: "text" },
      { name: "husband_email", valueType: "text" },
      { name: "address", valueType: "text" },
      { name: "occupation", valueType: "text" },
      { name: "occupation_2", valueType: "text" },
      { name: "package_type", valueType: "text" },
      { name: "package_payable_amount", valueType: "text" },
      { name: "deposit_to_pay", valueType: "text" },
      { name: "balance_to_pay", valueType: "text" },
      { name: "package_entitlement_snapshot_json", valueType: "text" },
      { name: "package_special_note", valueType: "text" },
      { name: "consultant_name", valueType: "text" },
      { name: "medical_food_notes", valueType: "text" },
      { name: "kitchen_notes", valueType: "text" },
      { name: "user_id", valueType: "integer" },
      { name: "created_at", valueType: "text" },
    ],
  },
  guest_profile_addons: {
    name: "guest_profile_addons",
    label: "Guest Profile Add-ons",
    columns: [
      { name: "id", valueType: "integer" },
      { name: "guest_profile_id", valueType: "integer" },
      { name: "service_name", valueType: "text" },
      { name: "category", valueType: "text" },
      { name: "quantity", valueType: "integer" },
      { name: "days", valueType: "integer" },
      { name: "price_cents", valueType: "integer" },
      { name: "remarks", valueType: "text" },
      { name: "created_at", valueType: "text" },
    ],
  },
  facility_bookings: {
    name: "facility_bookings",
    label: "Facility Bookings",
    columns: [
      { name: "id", valueType: "integer" },
      { name: "user_id", valueType: "integer" },
      { name: "facility_time_slot_id", valueType: "integer" },
      { name: "booking_date", valueType: "text" },
      { name: "status", valueType: "text" },
      { name: "admin_read", valueType: "integer" },
      { name: "admin_done", valueType: "integer" },
      { name: "admin_done_at", valueType: "text" },
      { name: "cancelled_at", valueType: "text" },
      { name: "created_at", valueType: "text" },
    ],
  },
  guest_service_bookings: {
    name: "guest_service_bookings",
    label: "Guest Service Bookings",
    columns: [
      { name: "id", valueType: "integer" },
      { name: "user_id", valueType: "integer" },
      { name: "guest_profile_id", valueType: "integer" },
      { name: "service_key", valueType: "text" },
      { name: "service_name", valueType: "text" },
      { name: "booking_date", valueType: "text" },
      { name: "booking_time", valueType: "text" },
      { name: "status", valueType: "text" },
      { name: "admin_read", valueType: "integer" },
      { name: "admin_done", valueType: "integer" },
      { name: "admin_done_at", valueType: "text" },
      { name: "cancelled_at", valueType: "text" },
      { name: "created_at", valueType: "text" },
    ],
  },
};

export function getBackupTableDefinition(
  tableName: BackupTableName,
): BackupTableDefinition {
  return BACKUP_TABLES[tableName];
}

export function getBackupTableLabel(tableName: BackupTableName): string {
  return BACKUP_TABLES[tableName].label;
}
