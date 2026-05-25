import type { AdminRow } from "../definitions";
import { indexRowsById } from "./diff";
import type { BackupImportError, ParsedSheetRow } from "./types";
import {
  readOptionalBookingDateValue,
  readOptionalPositiveIntegerValue,
} from "./validation-helpers";
import {
  addRowError,
  readDateTimeValue,
  readIntegerValue,
  readOptionalTextValue,
  readPositiveIntegerValue,
  readRequiredTextValue,
} from "./values";

export function validateGuestProfiles(
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

export function validateGuestProfileAddons(
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
