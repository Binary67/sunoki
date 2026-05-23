import { formatBookingDate, isBookingDate } from "./booking-dates";
import { db } from "./db";
import { ADDITIONAL_DAYS_ADDON_NAME } from "./guest-profile-addons";

export type GuestProfileStatus = "not_checked_in" | "checked_in";

export const GUEST_ROOM_LEVELS = ["12", "13", "14"];
export const GUEST_ROOM_NUMBERS = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
];

export type GuestProfile = {
  id: number;
  name: string;
  status: GuestProfileStatus;
  roomNumber: string | null;
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
  kitchenNotes: string | null;
  createdAt: string;
};

export type GuestKitchenNote = {
  id: number;
  name: string;
  roomNumber: string | null;
  kitchenNotes: string;
};

export type GuestProfileAddon = {
  id: number;
  guestProfileId: number;
  serviceName: string;
  days: number | null;
  priceCents: number;
  createdAt: string;
};

type InsertResult = {
  lastInsertRowid: number | bigint;
};

type MutationResult = {
  changes: number | bigint;
};

type GuestProfileCreateResult =
  | { ok: true; id: number }
  | { ok: false; message: string };

type GuestProfileMutationResult =
  | { ok: true }
  | { ok: false; message: string };

type GuestProfileAddonInput = {
  serviceName: string;
  days: number | null;
  priceCents: number;
};

type ParsedGuestProfileForm =
  | {
      ok: true;
      addons: GuestProfileAddonInput[];
      data: Record<GuestProfileColumn, string | null>;
    }
  | { ok: false; message: string };

const GUEST_PROFILE_COLUMNS = [
  "name",
  "room_number",
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
  "kitchen_notes",
] as const;

export type GuestProfileColumn = (typeof GUEST_PROFILE_COLUMNS)[number];

export function listGuestProfiles(
  status: GuestProfileStatus = "not_checked_in",
): GuestProfile[] {
  return db
    .prepare(
      `
        SELECT ${getGuestProfileSelectList()}
        FROM guest_profiles
        WHERE status = ?
        ORDER BY datetime(created_at) DESC, id DESC
      `,
    )
    .all(status) as GuestProfile[];
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

export function listCheckedInGuestKitchenNotes(): GuestKitchenNote[] {
  return db
    .prepare(
      `
        SELECT
          id,
          name,
          room_number AS roomNumber,
          kitchen_notes AS kitchenNotes
        FROM guest_profiles
        WHERE status = 'checked_in'
          AND kitchen_notes IS NOT NULL
          AND TRIM(kitchen_notes) != ''
        ORDER BY
          CASE WHEN room_number IS NULL OR room_number = '' THEN 1 ELSE 0 END,
          room_number ASC,
          name COLLATE NOCASE ASC,
          id ASC
      `,
    )
    .all() as GuestKitchenNote[];
}

export function listGuestProfileAddons(
  profileId: number,
): GuestProfileAddon[] {
  if (!isValidGuestProfileId(profileId)) return [];

  return db
    .prepare(
      `
        SELECT
          id,
          guest_profile_id AS guestProfileId,
          service_name AS serviceName,
          days,
          price_cents AS priceCents,
          created_at AS createdAt
        FROM guest_profile_addons
        WHERE guest_profile_id = ?
        ORDER BY
          CASE WHEN service_name = ? THEN 0 ELSE 1 END,
          id ASC
      `,
    )
    .all(profileId, ADDITIONAL_DAYS_ADDON_NAME) as GuestProfileAddon[];
}

export function formatGuestProfileAddonPrice(priceCents: number): string {
  const whole = Math.floor(priceCents / 100).toLocaleString("en-MY");
  const fraction = String(priceCents % 100).padStart(2, "0");
  return `RM ${whole}.${fraction}`;
}

export function getGuestProfileAddonTotalCents(
  addons: GuestProfileAddon[],
): number {
  return addons.reduce((total, addon) => total + addon.priceCents, 0);
}

export function createGuestProfile(
  formData: FormData,
): GuestProfileCreateResult {
  const values = parseGuestProfileForm(formData);
  if (!values.ok) return values;

  if (hasDuplicateActiveIc(values.data.ic_no)) {
    return {
      ok: false,
      message: "A not checked-in guest with this IC number already exists.",
    };
  }

  try {
    db.exec("BEGIN");
    const result = db
      .prepare(
        `
          INSERT INTO guest_profiles (${GUEST_PROFILE_COLUMNS.join(", ")})
          VALUES (${GUEST_PROFILE_COLUMNS.map(() => "?").join(", ")})
        `,
      )
      .run(...GUEST_PROFILE_COLUMNS.map((column) => values.data[column])) as
      InsertResult;
    const profileId = Number(result.lastInsertRowid);
    insertGuestProfileAddons(profileId, values.addons);
    db.exec("COMMIT");

    return { ok: true, id: profileId };
  } catch {
    rollbackGuestProfileTransaction();
    return { ok: false, message: "Unable to save guest profile." };
  }
}

export function updateGuestProfile(
  id: number,
  formData: FormData,
): GuestProfileMutationResult {
  if (!isValidGuestProfileId(id)) {
    return { ok: false, message: "Choose a valid guest profile." };
  }

  const values = parseGuestProfileForm(formData);
  if (!values.ok) return values;

  if (hasDuplicateActiveIc(values.data.ic_no, id)) {
    return {
      ok: false,
      message: "A not checked-in guest with this IC number already exists.",
    };
  }

  try {
    db.exec("BEGIN");
    const result = db
      .prepare(
        `
          UPDATE guest_profiles
          SET ${GUEST_PROFILE_COLUMNS.map((column) => `${column} = ?`).join(
            ", ",
          )}
          WHERE id = ?
        `,
      )
      .run(
        ...GUEST_PROFILE_COLUMNS.map((column) => values.data[column]),
        id,
      ) as MutationResult;

    if (Number(result.changes) === 0) {
      rollbackGuestProfileTransaction();
      return { ok: false, message: "Guest profile not found." };
    }

    replaceGuestProfileAddons(id, values.addons);
    db.exec("COMMIT");

    return { ok: true };
  } catch {
    rollbackGuestProfileTransaction();
    return { ok: false, message: "Unable to update guest profile." };
  }
}

export function deleteGuestProfile(id: number): GuestProfileMutationResult {
  if (!isValidGuestProfileId(id)) {
    return { ok: false, message: "Choose a valid guest profile." };
  }

  try {
    const result = db
      .prepare("DELETE FROM guest_profiles WHERE id = ?")
      .run(id) as MutationResult;

    if (Number(result.changes) === 0) {
      return { ok: false, message: "Guest profile not found." };
    }

    return { ok: true };
  } catch {
    return { ok: false, message: "Unable to delete guest profile." };
  }
}

export function setGuestProfileStatus(
  id: number,
  status: GuestProfileStatus,
): GuestProfileMutationResult {
  if (!isValidGuestProfileId(id)) {
    return { ok: false, message: "Choose a valid guest profile." };
  }

  try {
    if (status === "not_checked_in") {
      const profile = getGuestProfile(id);
      if (!profile) return { ok: false, message: "Guest profile not found." };

      if (hasDuplicateActiveIc(profile.icNo, id)) {
        return {
          ok: false,
          message: "A not checked-in guest with this IC number already exists.",
        };
      }
    }

    const result =
      status === "checked_in"
        ? checkInGuestProfile(id)
        : undoGuestProfileCheckIn(id);

    if (Number(result.changes) === 0) {
      return { ok: false, message: "Guest profile not found." };
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      message:
        status === "checked_in"
          ? "Unable to check in guest profile."
          : "Unable to undo guest check-in.",
    };
  }
}

function checkInGuestProfile(id: number): MutationResult {
  return db
    .prepare(
      `
        UPDATE guest_profiles
        SET status = 'checked_in',
            expected_delivery_date = ?
        WHERE id = ?
      `,
    )
    .run(formatBookingDate(new Date()), id) as MutationResult;
}

function undoGuestProfileCheckIn(id: number): MutationResult {
  return db
    .prepare(
      `
        UPDATE guest_profiles
        SET status = 'not_checked_in'
        WHERE id = ?
      `,
    )
    .run(id) as MutationResult;
}

export function getGuestProfileStatus(value?: string): GuestProfileStatus {
  return value === "checked_in" ? "checked_in" : "not_checked_in";
}

export function getGuestProfileStatusLabel(
  status: GuestProfileStatus,
): string {
  return status === "checked_in" ? "Checked In" : "Not Checked In";
}

function parseGuestProfileForm(
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
      package_special_note: readText(formData, "package_special_note"),
      consultant_name: readText(formData, "consultant_name"),
      medical_food_notes: readText(formData, "medical_food_notes"),
      kitchen_notes: readText(formData, "kitchen_notes"),
    },
  };
}

function parseGuestProfileAddons(
  formData: FormData,
):
  | { ok: true; data: GuestProfileAddonInput[] }
  | { ok: false; message: string } {
  const serviceNames = formData.getAll("addon_service_name");
  const priceAmounts = formData.getAll("addon_price_amount");
  const additionalDays = readFormValue(formData.get("additional_days"));
  const additionalDaysPriceAmount = readFormValue(
    formData.get("additional_days_price_amount"),
  );
  const addons: GuestProfileAddonInput[] = [];

  if (additionalDays || additionalDaysPriceAmount) {
    if (!additionalDays) {
      return {
        ok: false,
        message: "Additional days of stay is required.",
      };
    }
    if (!additionalDaysPriceAmount) {
      return {
        ok: false,
        message: "Additional days of stay price is required.",
      };
    }

    const days = parseAdditionalDays(additionalDays);
    if (days === null) {
      return { ok: false, message: "Enter a valid number of additional days." };
    }

    const priceCents = parseAddonPriceCents(additionalDaysPriceAmount);
    if (priceCents === null) {
      return { ok: false, message: "Enter a valid add-on price." };
    }

    addons.push({
      serviceName: ADDITIONAL_DAYS_ADDON_NAME,
      days,
      priceCents,
    });
  }

  for (
    let index = 0;
    index < Math.max(serviceNames.length, priceAmounts.length);
    index += 1
  ) {
    const serviceName = readFormValue(serviceNames[index] ?? null);
    const priceAmount = readFormValue(priceAmounts[index] ?? null);
    if (!serviceName && !priceAmount) continue;
    if (!serviceName) {
      return { ok: false, message: "Add-on service name is required." };
    }
    if (!priceAmount) {
      return { ok: false, message: "Add-on price is required." };
    }

    const priceCents = parseAddonPriceCents(priceAmount);
    if (priceCents === null) {
      return { ok: false, message: "Enter a valid add-on price." };
    }

    const normalizedServiceName = serviceName.toUpperCase();
    if (normalizedServiceName === ADDITIONAL_DAYS_ADDON_NAME) {
      return {
        ok: false,
        message: "Use the fixed additional days row for additional days of stay.",
      };
    }

    addons.push({
      serviceName: normalizedServiceName,
      days: null,
      priceCents,
    });
  }

  return { ok: true, data: addons };
}

function readText(formData: FormData, key: GuestProfileColumn): string | null {
  return readFormValue(formData.get(key));
}

function readFormValue(value: FormDataEntryValue | null): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function parseAddonPriceCents(value: string): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;

  const [ringgit, sen = ""] = value.split(".");
  const ringgitAmount = Number(ringgit);
  const senAmount = Number(sen.padEnd(2, "0"));
  const totalCents = ringgitAmount * 100 + senAmount;

  return Number.isSafeInteger(totalCents) ? totalCents : null;
}

function parseAdditionalDays(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;

  const days = Number(value);
  return Number.isSafeInteger(days) && days > 0 ? days : null;
}

function insertGuestProfileAddons(
  profileId: number,
  addons: GuestProfileAddonInput[],
): void {
  if (addons.length === 0) return;

  const insert = db.prepare(
    `
      INSERT INTO guest_profile_addons (
        guest_profile_id,
        service_name,
        days,
        price_cents
      )
      VALUES (?, ?, ?, ?)
    `,
  );

  for (const addon of addons) {
    insert.run(profileId, addon.serviceName, addon.days, addon.priceCents);
  }
}

function replaceGuestProfileAddons(
  profileId: number,
  addons: GuestProfileAddonInput[],
): void {
  db.prepare("DELETE FROM guest_profile_addons WHERE guest_profile_id = ?").run(
    profileId,
  );
  insertGuestProfileAddons(profileId, addons);
}

function rollbackGuestProfileTransaction(): void {
  try {
    db.exec("ROLLBACK");
  } catch {
    // The transaction may already be closed if SQLite rejected BEGIN.
  }
}

function isValidGuestProfileId(id: number): boolean {
  return Number.isInteger(id) && id > 0;
}

function isGuestRoomNumber(value: string): boolean {
  const [level, roomNumber, extra] = value.split("-");
  return (
    extra === undefined &&
    GUEST_ROOM_LEVELS.includes(level) &&
    GUEST_ROOM_NUMBERS.includes(roomNumber)
  );
}

function hasDuplicateActiveIc(icNo: string | null, excludeId?: number): boolean {
  if (!icNo) return false;

  const row = db
    .prepare(
      `
        SELECT id
        FROM guest_profiles
        WHERE status = 'not_checked_in'
          AND ic_no = ?
          AND (? IS NULL OR id != ?)
        LIMIT 1
      `,
    )
    .get(icNo, excludeId ?? null, excludeId ?? null) as
    | { id: number }
    | undefined;

  return Boolean(row);
}

function getGuestProfileSelectList(): string {
  return `
    id,
    name,
    status,
    room_number AS roomNumber,
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
    kitchen_notes AS kitchenNotes,
    created_at AS createdAt
  `;
}
