import type { AdminRow } from "../definitions";
import { getGuestStayDates } from "../../guest-profile-stay";
import { validateFacilities } from "./validation-facilities";
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
    guest_profiles: [] as AdminRow[],
    guest_profile_addons: [] as AdminRow[],
    facility_bookings: [] as AdminRow[],
    guest_service_bookings: [] as AdminRow[],
  };

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
  applyDerivedGuestProfileCheckoutDates(
    rows.guest_profiles,
    rows.guest_profile_addons,
  );
  rows.facility_bookings = validateFacilityBookings(
    parsedRows.facility_bookings,
    rows.users,
    rows.guest_profiles,
    rows.facilities,
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

function applyDerivedGuestProfileCheckoutDates(
  guestProfiles: AdminRow[],
  guestProfileAddons: AdminRow[],
): void {
  const addonsByProfileId = new Map<
    number,
    { serviceName: string; days: number | null }[]
  >();

  for (const addon of guestProfileAddons) {
    if (
      typeof addon.guest_profile_id !== "number" ||
      typeof addon.service_name !== "string"
    ) {
      continue;
    }

    const addons = addonsByProfileId.get(addon.guest_profile_id) ?? [];
    addons.push({
      serviceName: addon.service_name,
      days: typeof addon.days === "number" ? addon.days : null,
    });
    addonsByProfileId.set(addon.guest_profile_id, addons);
  }

  for (const profile of guestProfiles) {
    const checkInDate =
      typeof profile.check_in_date === "string" ? profile.check_in_date : null;
    const profileId = typeof profile.id === "number" ? profile.id : null;
    profile.checkout_date = getGuestStayDates(
      checkInDate,
      profileId ? (addonsByProfileId.get(profileId) ?? []) : [],
    ).checkOutDate;
  }
}
