import { isBookingDate, isWithinBookingDateRange } from "../../booking-dates";
import type { AdminRow } from "../definitions";
import { indexRowsById } from "./diff";
import type {
  BackupImportError,
  BackupRowsByTable,
  ParsedRowsByTable,
  ParsedSheetRow,
} from "./types";
import {
  addRowError,
  readBookingDateValue,
  readDateTimeValue,
  readIntegerValue,
  readLimitedOptionalTextValue,
  readOptionalDateTimeValue,
  readOptionalTextValue,
  readPositiveIntegerValue,
  readRequiredTextValue,
  textOrNull,
  validateRequiredBookingDate,
} from "./values";

const RELAXING_HAIR_WASH_SERVICE_KEY = "relaxing_hair_wash";
const RELAXING_HAIR_WASH_SERVICE_NAME = "Relaxing Hair Wash";
const REQUIRED_FACILITY_SLUGS = ["karaoke", "gym", "yoga", "lounge"] as const;

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

function validateUsers(
  rows: ParsedSheetRow[],
  errors: BackupImportError[],
): AdminRow[] {
  const normalized: AdminRow[] = [];
  const ids = new Set<number>();
  const usernames = new Set<string>();
  let superAdminCount = 0;

  for (const row of rows) {
    const id = readPositiveIntegerValue(row, "users", "id", "ID", errors);
    const username = readRequiredTextValue(
      row,
      "users",
      "username",
      "Username",
      errors,
    );
    const password = readRequiredTextValue(
      row,
      "users",
      "password",
      "Password",
      errors,
      false,
    );
    const role = readRequiredTextValue(row, "users", "role", "Role", errors);
    const active = readIntegerValue(
      row,
      "users",
      "active",
      "Access",
      errors,
    );
    const checkInDate = readOptionalTextValue(
      row,
      "users",
      "check_in_date",
      "Check-in date",
      errors,
    );
    const checkOutDate = readOptionalTextValue(
      row,
      "users",
      "check_out_date",
      "Check-out date",
      errors,
    );
    const createdAt = readDateTimeValue(
      row,
      "users",
      "created_at",
      "Created",
      errors,
    );

    if (id !== null) {
      if (ids.has(id)) {
        addRowError(errors, row, "users", "id", `Duplicate user ID ${id}.`);
      }
      ids.add(id);
    }

    if (active !== null && active !== 0 && active !== 1) {
      addRowError(errors, row, "users", "active", "Access must be 0 or 1.");
    }

    if (username !== null) {
      const key = username.toLowerCase();
      if (usernames.has(key)) {
        addRowError(
          errors,
          row,
          "users",
          "username",
          `Duplicate username "${username}".`,
        );
      }
      usernames.add(key);
    }

    if (role !== "superadmin" && role !== "admin" && role !== "guest") {
      addRowError(errors, row, "users", "role", "Choose a valid role.");
    }

    if (role === "superadmin") superAdminCount += 1;

    if (role === "guest") {
      validateRequiredBookingDate(
        checkInDate,
        row,
        "users",
        "check_in_date",
        "Check-in date",
        errors,
      );
      validateRequiredBookingDate(
        checkOutDate,
        row,
        "users",
        "check_out_date",
        "Check-out date",
        errors,
      );
      if (
        checkInDate &&
        checkOutDate &&
        isBookingDate(checkInDate) &&
        isBookingDate(checkOutDate) &&
        checkOutDate < checkInDate
      ) {
        addRowError(
          errors,
          row,
          "users",
          "check_out_date",
          "Check-out date must be on or after check-in date.",
        );
      }
    } else if (checkInDate !== null || checkOutDate !== null) {
      addRowError(
        errors,
        row,
        "users",
        "check_in_date",
        "Admin users must not have stay dates.",
      );
    }

    normalized.push({
      id,
      username,
      password,
      role,
      active,
      check_in_date: role === "guest" ? checkInDate : null,
      check_out_date: role === "guest" ? checkOutDate : null,
      created_at: createdAt,
    });
  }

  if (superAdminCount === 0) {
    errors.push({
      tableName: "users",
      message: "At least one superadmin user is required.",
    });
  }

  return normalized;
}

function validateFacilities(
  rows: ParsedSheetRow[],
  errors: BackupImportError[],
): AdminRow[] {
  const normalized: AdminRow[] = [];
  const ids = new Set<number>();
  const slugs = new Set<string>();

  for (const row of rows) {
    const id = readPositiveIntegerValue(row, "facilities", "id", "ID", errors);
    const slug = readRequiredTextValue(
      row,
      "facilities",
      "slug",
      "Slug",
      errors,
    );
    const name = readRequiredTextValue(
      row,
      "facilities",
      "name",
      "Name",
      errors,
    );
    const tagline1 = readLimitedOptionalTextValue(
      row,
      "facilities",
      "tagline_1",
      "Tagline 1",
      errors,
    );
    const tagline2 = readLimitedOptionalTextValue(
      row,
      "facilities",
      "tagline_2",
      "Tagline 2",
      errors,
    );
    const tagline3 = readLimitedOptionalTextValue(
      row,
      "facilities",
      "tagline_3",
      "Tagline 3",
      errors,
    );

    if (id !== null) {
      if (ids.has(id)) {
        addRowError(
          errors,
          row,
          "facilities",
          "id",
          `Duplicate facility ID ${id}.`,
        );
      }
      ids.add(id);
    }

    if (slug !== null) {
      if (slugs.has(slug)) {
        addRowError(
          errors,
          row,
          "facilities",
          "slug",
          `Duplicate facility slug "${slug}".`,
        );
      }
      if (!isRequiredFacilitySlug(slug)) {
        addRowError(
          errors,
          row,
          "facilities",
          "slug",
          "Choose a valid facility slug.",
        );
      }
      slugs.add(slug);
    }

    normalized.push({
      id,
      slug,
      name,
      tagline_1: tagline1,
      tagline_2: tagline2,
      tagline_3: tagline3,
    });
  }

  for (const slug of REQUIRED_FACILITY_SLUGS) {
    if (!slugs.has(slug)) {
      errors.push({
        tableName: "facilities",
        message: `Facility "${slug}" is missing from the workbook.`,
      });
    }
  }

  return normalized;
}

function validateTimeSlots(
  rows: ParsedSheetRow[],
  facilities: AdminRow[],
  errors: BackupImportError[],
): AdminRow[] {
  const normalized: AdminRow[] = [];
  const ids = new Set<number>();
  const facilityIds = new Set(facilities.map((row) => Number(row.id)));
  const uniqueSlots = new Set<string>();

  for (const row of rows) {
    const id = readPositiveIntegerValue(
      row,
      "facility_time_slots",
      "id",
      "ID",
      errors,
    );
    const facilityId = readPositiveIntegerValue(
      row,
      "facility_time_slots",
      "facility_id",
      "Facility",
      errors,
    );
    const startTime = readRequiredTextValue(
      row,
      "facility_time_slots",
      "start_time",
      "Start time",
      errors,
    );
    const duration = readPositiveIntegerValue(
      row,
      "facility_time_slots",
      "duration_minutes",
      "Duration minutes",
      errors,
    );
    const capacity = readPositiveIntegerValue(
      row,
      "facility_time_slots",
      "capacity_pax",
      "Capacity pax",
      errors,
    );
    const active = readIntegerValue(
      row,
      "facility_time_slots",
      "active",
      "Active",
      errors,
    );

    if (id !== null) {
      if (ids.has(id)) {
        addRowError(
          errors,
          row,
          "facility_time_slots",
          "id",
          `Duplicate time slot ID ${id}.`,
        );
      }
      ids.add(id);
    }

    if (facilityId !== null && !facilityIds.has(facilityId)) {
      addRowError(
        errors,
        row,
        "facility_time_slots",
        "facility_id",
        `Facility ID ${facilityId} is not present in the workbook.`,
      );
    }

    if (startTime !== null && !isTimeValue(startTime)) {
      addRowError(
        errors,
        row,
        "facility_time_slots",
        "start_time",
        "Enter a valid start time.",
      );
    }

    if (active !== null && active !== 0 && active !== 1) {
      addRowError(
        errors,
        row,
        "facility_time_slots",
        "active",
        "Active must be 0 or 1.",
      );
    }

    if (facilityId !== null && startTime !== null) {
      const key = `${facilityId}:${startTime}`;
      if (uniqueSlots.has(key)) {
        addRowError(
          errors,
          row,
          "facility_time_slots",
          "start_time",
          "Facility and start time must be unique.",
        );
      }
      uniqueSlots.add(key);
    }

    normalized.push({
      id,
      facility_id: facilityId,
      start_time: startTime,
      duration_minutes: duration,
      capacity_pax: capacity,
      active,
    });
  }

  return normalized;
}

function validateGuestProfiles(
  rows: ParsedSheetRow[],
  users: AdminRow[],
  errors: BackupImportError[],
): AdminRow[] {
  const normalized: AdminRow[] = [];
  const ids = new Set<number>();
  const userIds = new Set<number>();
  const usersById = indexRowsById(users);

  for (const row of rows) {
    const id = readPositiveIntegerValue(
      row,
      "guest_profiles",
      "id",
      "ID",
      errors,
    );
    const name = readRequiredTextValue(
      row,
      "guest_profiles",
      "name",
      "Name",
      errors,
    );
    const status = readRequiredTextValue(
      row,
      "guest_profiles",
      "status",
      "Status",
      errors,
    );
    const expectedDeliveryDate = readOptionalBookingDateValue(
      row,
      "guest_profiles",
      "expected_delivery_date",
      "Expected delivery date",
      errors,
    );
    const userId = readOptionalPositiveIntegerValue(
      row,
      "guest_profiles",
      "user_id",
      "User",
      errors,
    );
    const createdAt = readDateTimeValue(
      row,
      "guest_profiles",
      "created_at",
      "Created",
      errors,
    );

    if (id !== null) {
      if (ids.has(id)) {
        addRowError(
          errors,
          row,
          "guest_profiles",
          "id",
          `Duplicate guest profile ID ${id}.`,
        );
      }
      ids.add(id);
    }

    if (status !== "incoming" && status !== "checked_in") {
      addRowError(
        errors,
        row,
        "guest_profiles",
        "status",
        "Choose a valid status.",
      );
    }

    if (userId !== null) {
      const user = usersById.get(userId);
      if (!user) {
        addRowError(
          errors,
          row,
          "guest_profiles",
          "user_id",
          `User ID ${userId} is not present in the workbook.`,
        );
      } else if (user.role !== "guest") {
        addRowError(
          errors,
          row,
          "guest_profiles",
          "user_id",
          "Guest profiles must link to guest users.",
        );
      }

      if (userIds.has(userId)) {
        addRowError(
          errors,
          row,
          "guest_profiles",
          "user_id",
          `User ID ${userId} is linked to more than one guest profile.`,
        );
      }
      userIds.add(userId);
    }

    normalized.push({
      id,
      name,
      status,
      room_number: readOptionalTextValue(
        row,
        "guest_profiles",
        "room_number",
        "Room number",
        errors,
      ),
      ic_no: readOptionalTextValue(
        row,
        "guest_profiles",
        "ic_no",
        "IC No.",
        errors,
      ),
      handphone_no: readOptionalTextValue(
        row,
        "guest_profiles",
        "handphone_no",
        "Handphone No.",
        errors,
      ),
      email: readOptionalTextValue(
        row,
        "guest_profiles",
        "email",
        "Email",
        errors,
      ),
      expected_delivery_date: expectedDeliveryDate,
      hospital_of_delivery: readOptionalTextValue(
        row,
        "guest_profiles",
        "hospital_of_delivery",
        "Hospital of delivery",
        errors,
      ),
      mode_of_delivery: readOptionalTextValue(
        row,
        "guest_profiles",
        "mode_of_delivery",
        "Mode of delivery",
        errors,
      ),
      child_count: readOptionalTextValue(
        row,
        "guest_profiles",
        "child_count",
        "Child count",
        errors,
      ),
      special_note: readOptionalTextValue(
        row,
        "guest_profiles",
        "special_note",
        "Special note",
        errors,
      ),
      husband_name: readOptionalTextValue(
        row,
        "guest_profiles",
        "husband_name",
        "Husband name",
        errors,
      ),
      husband_ic_no: readOptionalTextValue(
        row,
        "guest_profiles",
        "husband_ic_no",
        "Husband IC No.",
        errors,
      ),
      husband_handphone_no: readOptionalTextValue(
        row,
        "guest_profiles",
        "husband_handphone_no",
        "Husband handphone No.",
        errors,
      ),
      husband_email: readOptionalTextValue(
        row,
        "guest_profiles",
        "husband_email",
        "Husband email",
        errors,
      ),
      address: readOptionalTextValue(
        row,
        "guest_profiles",
        "address",
        "Address",
        errors,
      ),
      occupation: readOptionalTextValue(
        row,
        "guest_profiles",
        "occupation",
        "Occupation",
        errors,
      ),
      occupation_2: readOptionalTextValue(
        row,
        "guest_profiles",
        "occupation_2",
        "Occupation 2",
        errors,
      ),
      package_type: readOptionalTextValue(
        row,
        "guest_profiles",
        "package_type",
        "Package type",
        errors,
      ),
      package_payable_amount: readOptionalTextValue(
        row,
        "guest_profiles",
        "package_payable_amount",
        "Package payable amount",
        errors,
      ),
      deposit_to_pay: readOptionalTextValue(
        row,
        "guest_profiles",
        "deposit_to_pay",
        "Deposit to pay",
        errors,
      ),
      balance_to_pay: readOptionalTextValue(
        row,
        "guest_profiles",
        "balance_to_pay",
        "Balance to pay",
        errors,
      ),
      package_entitlement_snapshot_json: readOptionalTextValue(
        row,
        "guest_profiles",
        "package_entitlement_snapshot_json",
        "Package entitlement snapshot",
        errors,
      ),
      package_special_note: readOptionalTextValue(
        row,
        "guest_profiles",
        "package_special_note",
        "Package special note",
        errors,
      ),
      consultant_name: readOptionalTextValue(
        row,
        "guest_profiles",
        "consultant_name",
        "Consultant name",
        errors,
      ),
      medical_food_notes: readOptionalTextValue(
        row,
        "guest_profiles",
        "medical_food_notes",
        "Medical food notes",
        errors,
      ),
      kitchen_notes: readOptionalTextValue(
        row,
        "guest_profiles",
        "kitchen_notes",
        "Kitchen notes",
        errors,
      ),
      user_id: userId,
      created_at: createdAt,
    });
  }

  return normalized;
}

function validateGuestProfileAddons(
  rows: ParsedSheetRow[],
  guestProfiles: AdminRow[],
  errors: BackupImportError[],
): AdminRow[] {
  const normalized: AdminRow[] = [];
  const ids = new Set<number>();
  const guestProfileIds = new Set(guestProfiles.map((row) => Number(row.id)));

  for (const row of rows) {
    const id = readPositiveIntegerValue(
      row,
      "guest_profile_addons",
      "id",
      "ID",
      errors,
    );
    const guestProfileId = readPositiveIntegerValue(
      row,
      "guest_profile_addons",
      "guest_profile_id",
      "Guest profile",
      errors,
    );
    const serviceName = readRequiredTextValue(
      row,
      "guest_profile_addons",
      "service_name",
      "Service name",
      errors,
    );
    const category = readRequiredTextValue(
      row,
      "guest_profile_addons",
      "category",
      "Category",
      errors,
    );
    const quantity = readPositiveIntegerValue(
      row,
      "guest_profile_addons",
      "quantity",
      "Quantity",
      errors,
    );
    const days = readOptionalPositiveIntegerValue(
      row,
      "guest_profile_addons",
      "days",
      "Days",
      errors,
    );
    const priceCents = readIntegerValue(
      row,
      "guest_profile_addons",
      "price_cents",
      "Price cents",
      errors,
    );
    const remarks = readOptionalTextValue(
      row,
      "guest_profile_addons",
      "remarks",
      "Remarks",
      errors,
    );
    const createdAt = readDateTimeValue(
      row,
      "guest_profile_addons",
      "created_at",
      "Created",
      errors,
    );

    if (id !== null) {
      if (ids.has(id)) {
        addRowError(
          errors,
          row,
          "guest_profile_addons",
          "id",
          `Duplicate add-on ID ${id}.`,
        );
      }
      ids.add(id);
    }

    if (guestProfileId !== null && !guestProfileIds.has(guestProfileId)) {
      addRowError(
        errors,
        row,
        "guest_profile_addons",
        "guest_profile_id",
        `Guest profile ID ${guestProfileId} is not present in the workbook.`,
      );
    }

    if (category !== "sunoki" && category !== "custom") {
      addRowError(
        errors,
        row,
        "guest_profile_addons",
        "category",
        "Category must be sunoki or custom.",
      );
    }

    if (priceCents !== null && priceCents < 0) {
      addRowError(
        errors,
        row,
        "guest_profile_addons",
        "price_cents",
        "Price cents must be 0 or more.",
      );
    }

    normalized.push({
      id,
      guest_profile_id: guestProfileId,
      service_name: serviceName,
      category,
      quantity,
      days,
      price_cents: priceCents,
      remarks,
      created_at: createdAt,
    });
  }

  return normalized;
}

function validateFacilityBookings(
  rows: ParsedSheetRow[],
  users: AdminRow[],
  timeSlots: AdminRow[],
  errors: BackupImportError[],
): AdminRow[] {
  const normalized: AdminRow[] = [];
  const ids = new Set<number>();
  const usersById = indexRowsById(users);
  const timeSlotIds = new Set(timeSlots.map((row) => Number(row.id)));
  const uniqueBookings = new Set<string>();

  for (const row of rows) {
    const id = readPositiveIntegerValue(
      row,
      "facility_bookings",
      "id",
      "ID",
      errors,
    );
    const userId = readPositiveIntegerValue(
      row,
      "facility_bookings",
      "user_id",
      "User",
      errors,
    );
    const timeSlotId = readPositiveIntegerValue(
      row,
      "facility_bookings",
      "facility_time_slot_id",
      "Time slot",
      errors,
    );
    const bookingDate = readBookingDateValue(
      row,
      "facility_bookings",
      "booking_date",
      "Booking date",
      errors,
    );
    const adminRead = readBooleanIntegerValue(
      row,
      "facility_bookings",
      "admin_read",
      "Admin read",
      errors,
    );
    const adminDone = readBooleanIntegerValue(
      row,
      "facility_bookings",
      "admin_done",
      "Admin done",
      errors,
    );
    const adminDoneAt = readOptionalDateTimeValue(
      row,
      "facility_bookings",
      "admin_done_at",
      "Admin done at",
      errors,
    );
    const createdAt = readDateTimeValue(
      row,
      "facility_bookings",
      "created_at",
      "Created",
      errors,
    );

    if (id !== null) {
      if (ids.has(id)) {
        addRowError(
          errors,
          row,
          "facility_bookings",
          "id",
          `Duplicate booking ID ${id}.`,
        );
      }
      ids.add(id);
    }

    const user = userId !== null ? (usersById.get(userId) ?? null) : null;
    if (userId !== null && !user) {
      addRowError(
        errors,
        row,
        "facility_bookings",
        "user_id",
        `User ID ${userId} is not present in the workbook.`,
      );
    }

    if (timeSlotId !== null && !timeSlotIds.has(timeSlotId)) {
      addRowError(
        errors,
        row,
        "facility_bookings",
        "facility_time_slot_id",
        `Time slot ID ${timeSlotId} is not present in the workbook.`,
      );
    }

    if (user && user.active !== 1) {
      addRowError(
        errors,
        row,
        "facility_bookings",
        "user_id",
        "Facility bookings must use active users.",
      );
    }

    validateBookingWithinGuestStay(
      row,
      "facility_bookings",
      "booking_date",
      bookingDate,
      user,
      errors,
    );

    if (userId !== null && timeSlotId !== null && bookingDate !== null) {
      const key = `${userId}:${timeSlotId}:${bookingDate}`;
      if (uniqueBookings.has(key)) {
        addRowError(
          errors,
          row,
          "facility_bookings",
          "booking_date",
          "User, time slot, and booking date must be unique.",
        );
      }
      uniqueBookings.add(key);
    }

    normalized.push({
      id,
      user_id: userId,
      facility_time_slot_id: timeSlotId,
      booking_date: bookingDate,
      admin_read: adminRead,
      admin_done: adminDone,
      admin_done_at: adminDoneAt,
      created_at: createdAt,
    });
  }

  return normalized;
}

function validateGuestServiceBookings(
  rows: ParsedSheetRow[],
  users: AdminRow[],
  guestProfiles: AdminRow[],
  errors: BackupImportError[],
): AdminRow[] {
  const normalized: AdminRow[] = [];
  const ids = new Set<number>();
  const usersById = indexRowsById(users);
  const guestProfilesById = indexRowsById(guestProfiles);
  const uniqueActiveBookings = new Set<string>();

  for (const row of rows) {
    const id = readPositiveIntegerValue(
      row,
      "guest_service_bookings",
      "id",
      "ID",
      errors,
    );
    const userId = readPositiveIntegerValue(
      row,
      "guest_service_bookings",
      "user_id",
      "User",
      errors,
    );
    const guestProfileId = readPositiveIntegerValue(
      row,
      "guest_service_bookings",
      "guest_profile_id",
      "Guest profile",
      errors,
    );
    const serviceKey = readRequiredTextValue(
      row,
      "guest_service_bookings",
      "service_key",
      "Service key",
      errors,
    );
    const serviceName = readRequiredTextValue(
      row,
      "guest_service_bookings",
      "service_name",
      "Service name",
      errors,
    );
    const bookingDate = readBookingDateValue(
      row,
      "guest_service_bookings",
      "booking_date",
      "Booking date",
      errors,
    );
    const bookingTime = readRequiredTextValue(
      row,
      "guest_service_bookings",
      "booking_time",
      "Booking time",
      errors,
    );
    const status = readRequiredTextValue(
      row,
      "guest_service_bookings",
      "status",
      "Status",
      errors,
    );
    const adminRead = readBooleanIntegerValue(
      row,
      "guest_service_bookings",
      "admin_read",
      "Admin read",
      errors,
    );
    const adminDone = readBooleanIntegerValue(
      row,
      "guest_service_bookings",
      "admin_done",
      "Admin done",
      errors,
    );
    const adminDoneAt = readOptionalDateTimeValue(
      row,
      "guest_service_bookings",
      "admin_done_at",
      "Admin done at",
      errors,
    );
    const cancelledAt = readOptionalDateTimeValue(
      row,
      "guest_service_bookings",
      "cancelled_at",
      "Cancelled at",
      errors,
    );
    const createdAt = readDateTimeValue(
      row,
      "guest_service_bookings",
      "created_at",
      "Created",
      errors,
    );

    if (id !== null) {
      if (ids.has(id)) {
        addRowError(
          errors,
          row,
          "guest_service_bookings",
          "id",
          `Duplicate service booking ID ${id}.`,
        );
      }
      ids.add(id);
    }

    const user = userId !== null ? (usersById.get(userId) ?? null) : null;
    const guestProfile =
      guestProfileId !== null ? guestProfilesById.get(guestProfileId) : null;
    if (userId !== null && !user) {
      addRowError(
        errors,
        row,
        "guest_service_bookings",
        "user_id",
        `User ID ${userId} is not present in the workbook.`,
      );
    }
    if (guestProfileId !== null && !guestProfile) {
      addRowError(
        errors,
        row,
        "guest_service_bookings",
        "guest_profile_id",
        `Guest profile ID ${guestProfileId} is not present in the workbook.`,
      );
    }
    if (
      userId !== null &&
      guestProfile &&
      Number(guestProfile.user_id) !== userId
    ) {
      addRowError(
        errors,
        row,
        "guest_service_bookings",
        "guest_profile_id",
        "Service booking must use the linked guest profile for its user.",
      );
    }
    if (user && user.active !== 1) {
      addRowError(
        errors,
        row,
        "guest_service_bookings",
        "user_id",
        "Service bookings must use active users.",
      );
    }
    if (user && user.role !== "guest") {
      addRowError(
        errors,
        row,
        "guest_service_bookings",
        "user_id",
        "Service bookings must use guest users.",
      );
    }

    if (serviceKey !== RELAXING_HAIR_WASH_SERVICE_KEY) {
      addRowError(
        errors,
        row,
        "guest_service_bookings",
        "service_key",
        "Choose a valid service key.",
      );
    }
    if (serviceName !== RELAXING_HAIR_WASH_SERVICE_NAME) {
      addRowError(
        errors,
        row,
        "guest_service_bookings",
        "service_name",
        "Choose a valid service name.",
      );
    }
    if (bookingTime !== null && !isTimeValue(bookingTime)) {
      addRowError(
        errors,
        row,
        "guest_service_bookings",
        "booking_time",
        "Enter a valid booking time.",
      );
    }
    if (status !== "booked" && status !== "cancelled") {
      addRowError(
        errors,
        row,
        "guest_service_bookings",
        "status",
        "Status must be booked or cancelled.",
      );
    }

    validateBookingWithinGuestStay(
      row,
      "guest_service_bookings",
      "booking_date",
      bookingDate,
      user,
      errors,
    );

    if (
      status === "booked" &&
      userId !== null &&
      serviceKey !== null &&
      bookingDate !== null &&
      bookingTime !== null
    ) {
      const key = `${userId}:${serviceKey}:${bookingDate}:${bookingTime}`;
      if (uniqueActiveBookings.has(key)) {
        addRowError(
          errors,
          row,
          "guest_service_bookings",
          "booking_time",
          "Active service bookings must be unique by user, service, date, and time.",
        );
      }
      uniqueActiveBookings.add(key);
    }

    normalized.push({
      id,
      user_id: userId,
      guest_profile_id: guestProfileId,
      service_key: serviceKey,
      service_name: serviceName,
      booking_date: bookingDate,
      booking_time: bookingTime,
      status,
      admin_read: adminRead,
      admin_done: adminDone,
      admin_done_at: adminDoneAt,
      cancelled_at: cancelledAt,
      created_at: createdAt,
    });
  }

  return normalized;
}

function readOptionalPositiveIntegerValue(
  row: ParsedSheetRow,
  tableName: Parameters<typeof readPositiveIntegerValue>[1],
  columnName: string,
  label: string,
  errors: BackupImportError[],
): number | null {
  const value = row.values[columnName];
  if (value === null || value === "") return null;
  return readPositiveIntegerValue(row, tableName, columnName, label, errors);
}

function readOptionalBookingDateValue(
  row: ParsedSheetRow,
  tableName: Parameters<typeof readBookingDateValue>[1],
  columnName: string,
  label: string,
  errors: BackupImportError[],
): string | null {
  const value = readOptionalTextValue(row, tableName, columnName, label, errors);
  if (value && !isBookingDate(value)) {
    addRowError(errors, row, tableName, columnName, `${label} must be YYYY-MM-DD.`);
  }
  return value;
}

function readBooleanIntegerValue(
  row: ParsedSheetRow,
  tableName: Parameters<typeof readIntegerValue>[1],
  columnName: string,
  label: string,
  errors: BackupImportError[],
): number | null {
  const value = readIntegerValue(row, tableName, columnName, label, errors);
  if (value !== null && value !== 0 && value !== 1) {
    addRowError(errors, row, tableName, columnName, `${label} must be 0 or 1.`);
  }
  return value;
}

function validateBookingWithinGuestStay(
  row: ParsedSheetRow,
  tableName: "facility_bookings" | "guest_service_bookings",
  columnName: string,
  bookingDate: string | null,
  user: AdminRow | null,
  errors: BackupImportError[],
): void {
  if (!user || !bookingDate || user.role !== "guest") return;

  const checkInDate = textOrNull(user.check_in_date);
  const checkOutDate = textOrNull(user.check_out_date);
  if (
    !checkInDate ||
    !checkOutDate ||
    !isBookingDate(checkInDate) ||
    !isBookingDate(checkOutDate) ||
    checkOutDate < checkInDate ||
    !isWithinBookingDateRange(bookingDate, checkInDate, checkOutDate)
  ) {
    addRowError(
      errors,
      row,
      tableName,
      columnName,
      "Booking date must be within the guest stay dates.",
    );
  }
}

function isTimeValue(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isRequiredFacilitySlug(value: string): boolean {
  return (REQUIRED_FACILITY_SLUGS as readonly string[]).includes(value);
}
