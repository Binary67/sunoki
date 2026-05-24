import { isBookingDate } from "./booking-dates";
import {
  parseGuestProfileAddons,
  type GuestProfileAddonInput,
} from "./guest-profile-addons";
import {
  getPackageEntitlementSnapshotByName,
  serializePackageEntitlementSnapshot,
} from "./package-entitlement-options";
import {
  GUEST_ROOM_LEVELS,
  GUEST_ROOM_NUMBERS,
  type GuestProfile,
  type GuestProfileColumn,
} from "./guest-profile-types";

export type ParsedGuestProfileForm =
  | {
      ok: true;
      addons: GuestProfileAddonInput[];
      data: Record<GuestProfileColumn, string | null>;
    }
  | { ok: false; message: string };

export function parseGuestProfileForm(
  formData: FormData,
): ParsedGuestProfileForm {
  const name = readText(formData, "name");
  if (!name) return { ok: false, message: "Name is required." };

  const expectedDeliveryDate = readText(formData, "expected_delivery_date");
  if (expectedDeliveryDate && !isBookingDate(expectedDeliveryDate)) {
    return { ok: false, message: "Enter a valid EDD." };
  }

  const roomNumber = readText(formData, "room_number");
  if (roomNumber && !isGuestRoomNumber(roomNumber)) {
    return { ok: false, message: "Choose a valid room number." };
  }

  const addons = parseGuestProfileAddons(formData);
  if (!addons.ok) return addons;

  return {
    ok: true,
    addons: addons.data,
    data: {
      name,
      room_number: roomNumber,
      ic_no: readText(formData, "ic_no"),
      handphone_no: readText(formData, "handphone_no"),
      email: readText(formData, "email"),
      expected_delivery_date: expectedDeliveryDate,
      hospital_of_delivery: readText(formData, "hospital_of_delivery"),
      mode_of_delivery: readText(formData, "mode_of_delivery"),
      child_count: readText(formData, "child_count"),
      special_note: readText(formData, "special_note"),
      husband_name: readText(formData, "husband_name"),
      husband_ic_no: readText(formData, "husband_ic_no"),
      husband_handphone_no: readText(formData, "husband_handphone_no"),
      husband_email: readText(formData, "husband_email"),
      address: readText(formData, "address"),
      occupation: readText(formData, "occupation"),
      occupation_2: readText(formData, "occupation_2"),
      package_type: readText(formData, "package_type"),
      package_payable_amount: readText(formData, "package_payable_amount"),
      deposit_to_pay: readText(formData, "deposit_to_pay"),
      balance_to_pay: readText(formData, "balance_to_pay"),
      package_entitlement_snapshot_json: null,
      package_special_note: readText(formData, "package_special_note"),
      consultant_name: readText(formData, "consultant_name"),
      medical_food_notes: readText(formData, "medical_food_notes"),
      kitchen_notes: readText(formData, "kitchen_notes"),
    },
  };
}

export function getPackageSnapshotJsonForSave(
  packageType: string | null,
  profile: Pick<
    GuestProfile,
    "packageType" | "packageEntitlementSnapshotJson"
  > | null,
):
  | { ok: true; value: string | null }
  | { ok: false; message: string } {
  if (!packageType) return { ok: true, value: null };

  const snapshot = getPackageEntitlementSnapshotByName(packageType);
  if (!snapshot) {
    return { ok: false, message: "Choose a valid package." };
  }

  if (
    profile &&
    profile.packageType === packageType &&
    profile.packageEntitlementSnapshotJson
  ) {
    return { ok: true, value: profile.packageEntitlementSnapshotJson };
  }

  return {
    ok: true,
    value: serializePackageEntitlementSnapshot(snapshot),
  };
}

function readText(formData: FormData, key: GuestProfileColumn): string | null {
  return readFormValue(formData.get(key));
}

function readFormValue(value: FormDataEntryValue | null): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function isGuestRoomNumber(value: string): boolean {
  const [level, roomNumber, extra] = value.split("-");
  return (
    extra === undefined &&
    GUEST_ROOM_LEVELS.includes(level) &&
    GUEST_ROOM_NUMBERS.includes(roomNumber)
  );
}
