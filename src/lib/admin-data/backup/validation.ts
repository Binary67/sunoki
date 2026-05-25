import type { AdminRow } from "../definitions";
import {
  validateFacilities,
  validateTimeSlots,
} from "./validation-facilities";
import {
  validateGuestProfileAddons,
  validateGuestProfiles,
} from "./validation-guests";
import {
  validateFacilityBookings,
  validateGuestServiceBookings,
} from "./validation-bookings";
import { validateUsers } from "./validation-users";
import type {
  BackupImportError,
  BackupRowsByTable,
  ParsedRowsByTable,
} from "./types";

export function validateParsedRows(
  parsedRows: ParsedRowsByTable,
): { rows: BackupRowsByTable; errors: BackupImportError[] } {
  const errors: BackupImportError[] = [];
  const rows = {
    users: validateUsers(parsedRows.users, errors),
    facilities: validateFacilities(parsedRows.facilities, errors),
    facility_time_slots: [] as AdminRow[],
    guest_profiles: [] as AdminRow[],
    guest_profile_addons: [] as AdminRow[],
    facility_bookings: [] as AdminRow[],
    guest_service_bookings: [] as AdminRow[],
  };

  rows.facility_time_slots = validateTimeSlots(
    parsedRows.facility_time_slots,
    rows.facilities,
    errors,
  );
  rows.guest_profiles = validateGuestProfiles(
    parsedRows.guest_profiles,
    rows.users,
    errors,
  );
  rows.guest_profile_addons = validateGuestProfileAddons(
    parsedRows.guest_profile_addons,
    rows.guest_profiles,
    errors,
  );
  rows.facility_bookings = validateFacilityBookings(
    parsedRows.facility_bookings,
    rows.users,
    rows.facility_time_slots,
    errors,
  );
  rows.guest_service_bookings = validateGuestServiceBookings(
    parsedRows.guest_service_bookings,
    rows.users,
    rows.guest_profiles,
    errors,
  );

  return { rows, errors };
}
