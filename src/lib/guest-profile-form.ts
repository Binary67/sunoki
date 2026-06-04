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
  getPackageServiceEnabledFieldName,
  getPackageServiceQuantityFieldName,
  UNLIMITED_PACKAGE_SERVICE_QUANTITY,
  type PackageServiceColumnName,
  type PackageServiceSnapshotItem,
} from "./package-entitlements";
import {
  GUEST_ROOM_LEVELS,
  GUEST_ROOM_NUMBERS,
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

  const icNo = readText(formData, "ic_no");
  if (!icNo) return { ok: false, message: "IC No. is required." };

  const handphoneNo = readText(formData, "handphone_no");
  if (!handphoneNo) {
    return { ok: false, message: "Handphone No. is required." };
  }

  const expectedDeliveryDate = readText(formData, "expected_delivery_date");
  if (expectedDeliveryDate && !isBookingDate(expectedDeliveryDate)) {
    return { ok: false, message: "Enter a valid EDD." };
  }
  const checkInDate = readText(formData, "check_in_date");
  if (checkInDate && !isBookingDate(checkInDate)) {
    return { ok: false, message: "Enter a valid Check In Date." };
  }

  const roomNumber = readText(formData, "room_number");
  if (roomNumber && !isGuestRoomNumber(roomNumber)) {
    return { ok: false, message: "Choose a valid room number." };
  }

  const packageType = readText(formData, "package_type");
  if (!packageType) {
    return { ok: false, message: "Type of Package is required." };
  }

  const packagePayableAmount = readText(formData, "package_payable_amount");
  if (!packagePayableAmount) {
    return {
      ok: false,
      message: "Payable amount for package is required.",
    };
  }

  const depositToPay = readText(formData, "deposit_to_pay");
  if (!depositToPay) {
    return { ok: false, message: "Deposit to pay is required." };
  }

  const balanceToPay = readText(formData, "balance_to_pay");
  if (!balanceToPay) {
    return {
      ok: false,
      message: "Balance to pay during check in is required.",
    };
  }

  const addons = parseGuestProfileAddons(formData);
  if (!addons.ok) return addons;

  return {
    ok: true,
    addons: addons.data,
    data: {
      name,
      room_number: roomNumber,
      ic_no: icNo,
      handphone_no: handphoneNo,
      email: readText(formData, "email"),
      expected_delivery_date: expectedDeliveryDate,
      check_in_date: checkInDate,
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
      package_type: packageType,
      package_payable_amount: packagePayableAmount,
      deposit_to_pay: depositToPay,
      balance_to_pay: balanceToPay,
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
  formData: FormData,
):
  | { ok: true; value: string | null }
  | { ok: false; message: string } {
  if (!packageType) return { ok: true, value: null };

  const snapshot = getPackageEntitlementSnapshotByName(packageType);
  if (!snapshot) {
    return { ok: false, message: "Choose a valid package." };
  }

  const services: PackageServiceSnapshotItem[] = [];
  for (const service of snapshot.services) {
    const enabled =
      formData.get(getPackageServiceEnabledFieldName(service.name)) === "1";
    if (!enabled) {
      services.push({ ...service, quantity: 0 });
      continue;
    }

    const quantity = readPackageServiceQuantity(
      formData,
      service.name,
      service.label,
    );
    if (!quantity.ok) return quantity;

    services.push({ ...service, quantity: quantity.value });
  }

  return {
    ok: true,
    value: serializePackageEntitlementSnapshot({
      ...snapshot,
      services,
    }),
  };
}

function readText(formData: FormData, key: GuestProfileColumn): string | null {
  return readFormValue(formData.get(key));
}

function readFormValue(value: FormDataEntryValue | null): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function readPackageServiceQuantity(
  formData: FormData,
  serviceName: PackageServiceColumnName,
  label: string,
):
  | { ok: true; value: number }
  | { ok: false; message: string } {
  const raw = formData.get(getPackageServiceQuantityFieldName(serviceName));
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) {
    return { ok: false, message: `${label} quantity is required.` };
  }

  const quantity = Number(text);
  if (!Number.isInteger(quantity)) {
    return { ok: false, message: `${label} quantity must be a whole number.` };
  }

  if (quantity === UNLIMITED_PACKAGE_SERVICE_QUANTITY || quantity > 0) {
    return { ok: true, value: quantity };
  }

  return {
    ok: false,
    message: `${label} quantity must be at least 1, or unlimited.`,
  };
}

function isGuestRoomNumber(value: string): boolean {
  const [level, roomNumber, extra] = value.split("-");
  return (
    extra === undefined &&
    GUEST_ROOM_LEVELS.includes(level) &&
    GUEST_ROOM_NUMBERS.includes(roomNumber)
  );
}
