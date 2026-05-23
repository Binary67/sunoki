import { isBookingDate } from "./booking-dates";
import { db } from "./db";

export type GuestProfile = {
  id: number;
  name: string;
  icNo: string | null;
  handphoneNo: string | null;
  email: string | null;
  expectedDeliveryDate: string | null;
  hospitalOfDelivery: string | null;
  modeOfDelivery: string | null;
  childCount: string | null;
  specialNote: string | null;
  husbandName: string | null;
  husbandIcNo: string | null;
  husbandHandphoneNo: string | null;
  husbandEmail: string | null;
  address: string | null;
  occupation: string | null;
  occupation2: string | null;
  packageType: string | null;
  packagePayableAmount: string | null;
  depositToPay: string | null;
  balanceToPay: string | null;
  packageSpecialNote: string | null;
  consultantName: string | null;
  medicalFoodNotes: string | null;
  createdAt: string;
};

type InsertResult = {
  lastInsertRowid: number | bigint;
};

type GuestProfileCreateResult =
  | { ok: true; id: number }
  | { ok: false; message: string };

const GUEST_PROFILE_COLUMNS = [
  "name",
  "ic_no",
  "handphone_no",
  "email",
  "expected_delivery_date",
  "hospital_of_delivery",
  "mode_of_delivery",
  "child_count",
  "special_note",
  "husband_name",
  "husband_ic_no",
  "husband_handphone_no",
  "husband_email",
  "address",
  "occupation",
  "occupation_2",
  "package_type",
  "package_payable_amount",
  "deposit_to_pay",
  "balance_to_pay",
  "package_special_note",
  "consultant_name",
  "medical_food_notes",
] as const;

export type GuestProfileColumn = (typeof GUEST_PROFILE_COLUMNS)[number];

export function listGuestProfiles(): GuestProfile[] {
  return db
    .prepare(
      `
        SELECT ${getGuestProfileSelectList()}
        FROM guest_profiles
        ORDER BY datetime(created_at) DESC, id DESC
      `,
    )
    .all() as GuestProfile[];
}

export function getGuestProfile(id: number): GuestProfile | null {
  if (!Number.isInteger(id) || id <= 0) return null;

  const row = db
    .prepare(
      `
        SELECT ${getGuestProfileSelectList()}
        FROM guest_profiles
        WHERE id = ?
      `,
    )
    .get(id) as GuestProfile | undefined;

  return row ?? null;
}

export function createGuestProfile(
  formData: FormData,
): GuestProfileCreateResult {
  const values = parseGuestProfileForm(formData);
  if (!values.ok) return values;

  try {
    const result = db
      .prepare(
        `
          INSERT INTO guest_profiles (${GUEST_PROFILE_COLUMNS.join(", ")})
          VALUES (${GUEST_PROFILE_COLUMNS.map(() => "?").join(", ")})
        `,
      )
      .run(...GUEST_PROFILE_COLUMNS.map((column) => values.data[column])) as
      InsertResult;

    return { ok: true, id: Number(result.lastInsertRowid) };
  } catch {
    return { ok: false, message: "Unable to save guest profile." };
  }
}

function parseGuestProfileForm(
  formData: FormData,
):
  | { ok: true; data: Record<GuestProfileColumn, string | null> }
  | { ok: false; message: string } {
  const name = readText(formData, "name");
  if (!name) return { ok: false, message: "Name is required." };

  const expectedDeliveryDate = readText(formData, "expected_delivery_date");
  if (expectedDeliveryDate && !isBookingDate(expectedDeliveryDate)) {
    return { ok: false, message: "Enter a valid EDD." };
  }

  return {
    ok: true,
    data: {
      name,
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
      package_special_note: readText(formData, "package_special_note"),
      consultant_name: readText(formData, "consultant_name"),
      medical_food_notes: readText(formData, "medical_food_notes"),
    },
  };
}

function readText(formData: FormData, key: GuestProfileColumn): string | null {
  const raw = formData.get(key);
  const value = typeof raw === "string" ? raw.trim() : "";
  return value || null;
}

function getGuestProfileSelectList(): string {
  return `
    id,
    name,
    ic_no AS icNo,
    handphone_no AS handphoneNo,
    email,
    expected_delivery_date AS expectedDeliveryDate,
    hospital_of_delivery AS hospitalOfDelivery,
    mode_of_delivery AS modeOfDelivery,
    child_count AS childCount,
    special_note AS specialNote,
    husband_name AS husbandName,
    husband_ic_no AS husbandIcNo,
    husband_handphone_no AS husbandHandphoneNo,
    husband_email AS husbandEmail,
    address,
    occupation,
    occupation_2 AS occupation2,
    package_type AS packageType,
    package_payable_amount AS packagePayableAmount,
    deposit_to_pay AS depositToPay,
    balance_to_pay AS balanceToPay,
    package_special_note AS packageSpecialNote,
    consultant_name AS consultantName,
    medical_food_notes AS medicalFoodNotes,
    created_at AS createdAt
  `;
}
