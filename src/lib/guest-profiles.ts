import { randomInt } from "node:crypto";
import {
  addBookingDays,
  formatBookingDate,
  isBookingDate,
} from "./booking-dates";
import { db } from "./db";
import { ADDITIONAL_DAYS_ADDON_NAME } from "./guest-profile-addons";
import {
  getPackageEntitlementSnapshotByName,
  serializePackageEntitlementSnapshot,
} from "./package-entitlement-options";
import { PACKAGE_SERVICE_COLUMNS } from "./package-entitlements";

export type GuestProfileStatus = "incoming" | "checked_in";
export type GuestProfileFilterStatus = GuestProfileStatus | "checked_out";

export const GUEST_ROOM_LEVELS = ["12", "13", "14"];
export const GUEST_BASE_STAY_DAYS = 27;
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
const GUEST_USERNAME_LENGTH = 6;
const GUEST_USERNAME_ATTEMPTS = 100;

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
  packageEntitlementSnapshotJson: string | null;
  packageSpecialNote: string | null;
  consultantName: string | null;
  medicalFoodNotes: string | null;
  kitchenNotes: string | null;
  userId: number | null;
  accountUsername: string | null;
  accountActive: number | null;
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
  category: GuestProfileAddonCategory;
  quantity: number;
  days: number | null;
  priceCents: number;
  remarks: string | null;
  createdAt: string;
};

export type GuestProfileAddonCategory = "sunoki" | "custom";

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

export type GuestProfileAccountMutationResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

type GuestProfileAddonInput = {
  category: GuestProfileAddonCategory;
  serviceName: string;
  quantity: number;
  days: number | null;
  priceCents: number;
  remarks: string | null;
};

type GuestStayAddon = {
  serviceName: string;
  days: number | null;
};

type GuestUsernameResult =
  | { ok: true; value: string }
  | { ok: false; message: string };

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
  "package_entitlement_snapshot_json",
  "package_special_note",
  "consultant_name",
  "medical_food_notes",
  "kitchen_notes",
] as const;

export type GuestProfileColumn = (typeof GUEST_PROFILE_COLUMNS)[number];

export function listGuestProfiles(
  status: GuestProfileFilterStatus = "incoming",
  today = formatBookingDate(new Date()),
): GuestProfile[] {
  const profiles = selectGuestProfiles(
    status === "incoming" ? "incoming" : "checked_in",
  );
  if (status === "incoming") return profiles;

  return profiles.filter(
    (profile) =>
      getGuestProfileComputedStatus(
        profile,
        listGuestProfileAddons(profile.id),
        today,
      ) === status,
  );
}

function selectGuestProfiles(status: GuestProfileStatus): GuestProfile[] {
  return db
    .prepare(
      `
        SELECT ${getGuestProfileSelectList()}
        FROM guest_profiles gp
        LEFT JOIN users u ON u.id = gp.user_id
        WHERE gp.status = ?
        ORDER BY datetime(gp.created_at) DESC, gp.id DESC
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
        FROM guest_profiles gp
        LEFT JOIN users u ON u.id = gp.user_id
        WHERE gp.id = ?
      `,
    )
    .get(id) as GuestProfile | undefined;

  return row ?? null;
}

export function listCheckedInGuestKitchenNotes(): GuestKitchenNote[] {
  return listGuestProfiles("checked_in")
    .filter((profile) => profile.kitchenNotes?.trim())
    .sort((a, b) => {
      const aMissingRoom = !a.roomNumber;
      const bMissingRoom = !b.roomNumber;
      if (aMissingRoom !== bMissingRoom) return aMissingRoom ? 1 : -1;
      if (a.roomNumber !== b.roomNumber) {
        return (a.roomNumber ?? "").localeCompare(b.roomNumber ?? "");
      }

      const nameOrder = a.name.localeCompare(b.name, undefined, {
        sensitivity: "base",
      });
      return nameOrder || a.id - b.id;
    })
    .map((profile) => ({
      id: profile.id,
      name: profile.name,
      roomNumber: profile.roomNumber,
      kitchenNotes: profile.kitchenNotes ?? "",
    }));
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
          category,
          quantity,
          days,
          price_cents AS priceCents,
          remarks,
          created_at AS createdAt
        FROM guest_profile_addons
        WHERE guest_profile_id = ?
        ORDER BY
          CASE
            WHEN service_name = ? THEN 0
            WHEN category = 'sunoki' THEN 1
            ELSE 2
          END,
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
  return addons.reduce(
    (total, addon) => total + addon.priceCents * getAddonQuantity(addon),
    0,
  );
}

export function getGuestProfileAddonLineTotalCents(
  addon: GuestProfileAddon,
): number {
  return addon.priceCents * getAddonQuantity(addon);
}

function getAddonQuantity(
  addon: Pick<GuestProfileAddon, "serviceName" | "quantity">,
): number {
  return addon.serviceName === ADDITIONAL_DAYS_ADDON_NAME ? 1 : addon.quantity;
}

export function getGuestProfileCheckoutDate(
  profile: Pick<GuestProfile, "expectedDeliveryDate">,
  addons: GuestStayAddon[],
): string | null {
  return getGuestCheckoutDateFromStartDate(profile.expectedDeliveryDate, addons);
}

export function getGuestProfileComputedStatus(
  profile: Pick<GuestProfile, "status" | "expectedDeliveryDate">,
  addons: GuestStayAddon[],
  today = formatBookingDate(new Date()),
): GuestProfileFilterStatus {
  if (profile.status === "incoming") return "incoming";

  const checkoutDate = getGuestProfileCheckoutDate(profile, addons);
  return checkoutDate && checkoutDate < today ? "checked_out" : "checked_in";
}

export function createGuestProfile(
  formData: FormData,
): GuestProfileCreateResult {
  const values = parseGuestProfileForm(formData);
  if (!values.ok) return values;

  const account = parseRequiredGuestAccount(formData);
  if (!account.ok) return account;

  if (hasDuplicateIncomingIc(values.data.ic_no)) {
    return {
      ok: false,
      message: "An incoming guest with this IC number already exists.",
    };
  }

  const packageSnapshot = getPackageSnapshotJsonForSave(
    values.data.package_type,
    null,
  );
  if (!packageSnapshot.ok) return packageSnapshot;
  values.data.package_entitlement_snapshot_json = packageSnapshot.value;

  try {
    db.exec("BEGIN");
    const userId = insertGuestUser(
      account.username,
      account.password,
      getGuestStayDates(values.data.expected_delivery_date, values.addons),
    );
    const result = db
      .prepare(
        `
          INSERT INTO guest_profiles (${GUEST_PROFILE_COLUMNS.join(", ")}, user_id)
          VALUES (${GUEST_PROFILE_COLUMNS.map(() => "?").join(", ")}, ?)
        `,
      )
      .run(
        ...GUEST_PROFILE_COLUMNS.map((column) => values.data[column]),
        userId,
      ) as InsertResult;
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

  const profile = getGuestProfile(id);
  if (!profile) return { ok: false, message: "Guest profile not found." };

  const account = parseOptionalGuestAccount(formData, profile.userId !== null);
  if (!account.ok) return account;

  if (hasDuplicateIncomingIc(values.data.ic_no, id)) {
    return {
      ok: false,
      message: "An incoming guest with this IC number already exists.",
    };
  }

  const packageSnapshot = getPackageSnapshotJsonForSave(
    values.data.package_type,
    profile,
  );
  if (!packageSnapshot.ok) return packageSnapshot;
  values.data.package_entitlement_snapshot_json = packageSnapshot.value;

  try {
    db.exec("BEGIN");
    let userId = profile.userId;
    const stayDates = getGuestStayDates(
      values.data.expected_delivery_date,
      values.addons,
    );

    if (userId) {
      updateGuestUser(userId, account.password, stayDates);
    } else if (!userId && account.username && account.password !== null) {
      userId = insertGuestUser(account.username, account.password, stayDates);
    }

    const result = db
      .prepare(
        `
          UPDATE guest_profiles
          SET ${GUEST_PROFILE_COLUMNS.map((column) => `${column} = ?`).join(
            ", ",
          )},
              user_id = ?
          WHERE id = ?
        `,
      )
      .run(
        ...GUEST_PROFILE_COLUMNS.map((column) => values.data[column]),
        userId,
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
    db.exec("BEGIN");
    const profile = db
      .prepare("SELECT user_id AS userId FROM guest_profiles WHERE id = ?")
      .get(id) as { userId: number | null } | undefined;

    if (!profile) {
      rollbackGuestProfileTransaction();
      return { ok: false, message: "Guest profile not found." };
    }

    const result = db
      .prepare("DELETE FROM guest_profiles WHERE id = ?")
      .run(id) as MutationResult;

    if (Number(result.changes) === 0) {
      rollbackGuestProfileTransaction();
      return { ok: false, message: "Guest profile not found." };
    }

    if (profile.userId !== null) {
      db.prepare("DELETE FROM users WHERE id = ? AND role = 'guest'").run(
        profile.userId,
      );
    }

    db.exec("COMMIT");
    return { ok: true };
  } catch {
    rollbackGuestProfileTransaction();
    return { ok: false, message: "Unable to delete guest profile." };
  }
}

export function toggleGuestProfileUserAccess(
  id: number,
): GuestProfileAccountMutationResult {
  if (!isValidGuestProfileId(id)) {
    return { ok: false, message: "Choose a valid guest profile." };
  }

  const profile = getGuestProfile(id);
  if (!profile) return { ok: false, message: "Guest profile not found." };
  if (!profile.userId) {
    return { ok: false, message: "This guest profile has no linked account." };
  }
  const active = profile.accountActive === 1 ? 0 : 1;

  try {
    db.exec("BEGIN");
    db.prepare("UPDATE users SET active = ? WHERE id = ?").run(
      active,
      profile.userId,
    );
    if (active === 0) {
      db.prepare(
        `
          UPDATE sessions
          SET revoked_at = ?
          WHERE user_id = ?
            AND revoked_at IS NULL
        `,
      ).run(formatDateTime(new Date()), profile.userId);
    }
    db.exec("COMMIT");
    return {
      ok: true,
      message:
        active === 1
          ? "Guest account reactivated."
          : "Guest account deactivated.",
    };
  } catch {
    rollbackGuestProfileTransaction();
    return { ok: false, message: "Unable to update guest account access." };
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
    if (status === "incoming") {
      const profile = getGuestProfile(id);
      if (!profile) return { ok: false, message: "Guest profile not found." };

      if (hasDuplicateIncomingIc(profile.icNo, id)) {
        return {
          ok: false,
          message: "An incoming guest with this IC number already exists.",
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
  const profile = getGuestProfile(id);
  if (!profile) return { changes: 0 };

  const checkInDate = formatBookingDate(new Date());
  const addons = listGuestProfileAddons(id);
  const stayDates = getGuestStayDates(checkInDate, addons);

  db.exec("BEGIN");
  try {
    const result = db
      .prepare(
        `
          UPDATE guest_profiles
          SET status = 'checked_in',
              expected_delivery_date = ?
          WHERE id = ?
        `,
      )
      .run(checkInDate, id) as MutationResult;

    if (profile.userId) {
      updateGuestUserStayDates(profile.userId, stayDates);
    }

    db.exec("COMMIT");
    return result;
  } catch (error) {
    rollbackGuestProfileTransaction();
    throw error;
  }
}

function undoGuestProfileCheckIn(id: number): MutationResult {
  return db
    .prepare(
      `
        UPDATE guest_profiles
        SET status = 'incoming'
        WHERE id = ?
      `,
    )
    .run(id) as MutationResult;
}

export function getGuestProfileStatus(
  value?: string,
): GuestProfileFilterStatus {
  if (value === "checked_out") return "checked_out";
  return value === "checked_in" ? "checked_in" : "incoming";
}

export function getGuestProfileStatusLabel(
  status: GuestProfileFilterStatus,
): string {
  if (status === "checked_out") return "Checked Out";
  return status === "checked_in" ? "Checked In" : "Incoming";
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
      package_entitlement_snapshot_json: null,
      package_special_note: readText(formData, "package_special_note"),
      consultant_name: readText(formData, "consultant_name"),
      medical_food_notes: readText(formData, "medical_food_notes"),
      kitchen_notes: readText(formData, "kitchen_notes"),
    },
  };
}

function getPackageSnapshotJsonForSave(
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

function parseRequiredGuestAccount(
  formData: FormData,
):
  | { ok: true; username: string; password: string }
  | { ok: false; message: string } {
  const password = readPassword(formData);
  if (!password) {
    return { ok: false, message: "Guest account password is required." };
  }

  const username = generateGuestUsername();
  if (!username.ok) return username;

  return { ok: true, username: username.value, password };
}

function parseOptionalGuestAccount(
  formData: FormData,
  hasLinkedUser: boolean,
):
  | { ok: true; username: string | null; password: string | null }
  | { ok: false; message: string } {
  const password = readPassword(formData);
  if (!hasLinkedUser && !password) {
    return { ok: true, username: null, password: null };
  }
  if (hasLinkedUser) {
    return { ok: true, username: null, password };
  }

  const username = generateGuestUsername();
  if (!username.ok) return username;

  return { ok: true, username: username.value, password };
}

function generateGuestUsername(): GuestUsernameResult {
  for (let attempt = 0; attempt < GUEST_USERNAME_ATTEMPTS; attempt += 1) {
    const digits = "0123456789".split("");
    const firstDigitIndex = randomInt(1, digits.length);
    let username = digits.splice(firstDigitIndex, 1)[0];

    while (username.length < GUEST_USERNAME_LENGTH) {
      const digitIndex = randomInt(0, digits.length);
      username += digits.splice(digitIndex, 1)[0];
    }

    if (!hasUsername(username)) {
      return { ok: true, value: username };
    }
  }

  return {
    ok: false,
    message: "Unable to generate a guest username. Try saving again.",
  };
}

function readPassword(formData: FormData): string | null {
  const value = formData.get("account_password");
  return typeof value === "string" && value ? value : null;
}

function parseGuestProfileAddons(
  formData: FormData,
):
  | { ok: true; data: GuestProfileAddonInput[] }
  | { ok: false; message: string } {
  const categories = formData.getAll("addon_category");
  const serviceNames = formData.getAll("addon_service_name");
  const quantities = formData.getAll("addon_quantity");
  const priceAmounts = formData.getAll("addon_price_amount");
  const remarksValues = formData.getAll("addon_remarks");
  const additionalDays = readFormValue(formData.get("additional_days"));
  const additionalDaysPriceAmount = readFormValue(
    formData.get("additional_days_price_amount"),
  );
  const additionalDaysRemarks = readFormValue(
    formData.get("additional_days_remarks"),
  );
  const addons: GuestProfileAddonInput[] = [];
  const addonRowCount = Math.max(
    categories.length,
    serviceNames.length,
    quantities.length,
    priceAmounts.length,
    remarksValues.length,
  );

  if (additionalDays || additionalDaysPriceAmount || additionalDaysRemarks) {
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
      category: "custom",
      serviceName: ADDITIONAL_DAYS_ADDON_NAME,
      quantity: 1,
      days,
      priceCents,
      remarks: additionalDaysRemarks,
    });
  }

  for (let index = 0; index < addonRowCount; index += 1) {
    const serviceName = readFormValue(serviceNames[index] ?? null);
    const quantityValue = readFormValue(quantities[index] ?? null);
    const priceAmount = readFormValue(priceAmounts[index] ?? null);
    const remarks = readFormValue(remarksValues[index] ?? null);
    if (!serviceName && !priceAmount && !remarks) continue;

    const category = parseAddonCategory(categories[index] ?? null);
    if (!category) {
      return { ok: false, message: "Choose a valid add-on category." };
    }
    if (!serviceName) {
      return { ok: false, message: "Add-on service name is required." };
    }
    if (!quantityValue) {
      return { ok: false, message: "Add-on quantity is required." };
    }
    if (!priceAmount) {
      return { ok: false, message: "Add-on price is required." };
    }

    const quantity = parseAddonQuantity(quantityValue);
    if (quantity === null) {
      return { ok: false, message: "Enter a valid add-on quantity." };
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

    const storedServiceName =
      category === "sunoki"
        ? getSunokiAddonServiceName(serviceName)
        : normalizedServiceName;
    if (!storedServiceName) {
      return { ok: false, message: "Choose a valid Sunoki service." };
    }

    addons.push({
      category,
      serviceName: storedServiceName,
      quantity,
      days: null,
      priceCents,
      remarks,
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

function parseAddonCategory(
  value: FormDataEntryValue | null,
): GuestProfileAddonCategory | null {
  if (value === "sunoki" || value === "custom") return value;
  return null;
}

function parseAddonQuantity(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;

  const quantity = Number(value);
  return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : null;
}

function getSunokiAddonServiceName(value: string): string | null {
  return (
    PACKAGE_SERVICE_COLUMNS.find((column) => column.label === value)?.label ??
    null
  );
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
        category,
        quantity,
        days,
        price_cents,
        remarks
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
  );

  for (const addon of addons) {
    insert.run(
      profileId,
      addon.serviceName,
      addon.category,
      addon.quantity,
      addon.days,
      addon.priceCents,
      addon.remarks,
    );
  }
}

function insertGuestUser(
  username: string,
  password: string,
  stayDates: GuestStayDates,
): number {
  const result = db
    .prepare(
      `
        INSERT INTO users (
          username,
          password,
          role,
          active,
          check_in_date,
          check_out_date
        )
        VALUES (?, ?, 'guest', 1, ?, ?)
      `,
    )
    .run(
      username,
      password,
      stayDates.checkInDate,
      stayDates.checkOutDate,
    ) as InsertResult;

  return Number(result.lastInsertRowid);
}

function updateGuestUser(
  userId: number,
  password: string | null,
  stayDates: GuestStayDates,
): void {
  if (password !== null) {
    db.prepare(
      `
        UPDATE users
        SET password = ?,
            check_in_date = ?,
            check_out_date = ?
        WHERE id = ?
      `,
    ).run(
      password,
      stayDates.checkInDate,
      stayDates.checkOutDate,
      userId,
    );
    return;
  }

  db.prepare(
    `
      UPDATE users
      SET check_in_date = ?,
          check_out_date = ?
      WHERE id = ?
    `,
  ).run(stayDates.checkInDate, stayDates.checkOutDate, userId);
}

function updateGuestUserStayDates(
  userId: number,
  stayDates: GuestStayDates,
): void {
  db.prepare(
    `
      UPDATE users
      SET check_in_date = ?,
          check_out_date = ?
      WHERE id = ?
    `,
  ).run(stayDates.checkInDate, stayDates.checkOutDate, userId);
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

function hasDuplicateIncomingIc(
  icNo: string | null,
  excludeId?: number,
): boolean {
  if (!icNo) return false;

  const row = db
    .prepare(
      `
        SELECT id
        FROM guest_profiles
        WHERE status = 'incoming'
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

type GuestStayDates = {
  checkInDate: string | null;
  checkOutDate: string | null;
};

function getGuestStayDates(
  checkInDate: string | null,
  addons: GuestProfileAddonInput[],
): GuestStayDates {
  const checkOutDate = getGuestCheckoutDateFromStartDate(checkInDate, addons);
  if (!checkInDate || !checkOutDate) {
    return { checkInDate: null, checkOutDate: null };
  }

  return { checkInDate, checkOutDate };
}

function getGuestCheckoutDateFromStartDate(
  checkInDate: string | null,
  addons: GuestStayAddon[],
): string | null {
  if (!checkInDate || !isBookingDate(checkInDate)) {
    return null;
  }

  const additionalDays =
    addons.find((addon) => addon.serviceName === ADDITIONAL_DAYS_ADDON_NAME)
      ?.days ?? 0;

  return addBookingDays(checkInDate, GUEST_BASE_STAY_DAYS + additionalDays);
}

function hasUsername(username: string): boolean {
  const row = db
    .prepare(
      `
        SELECT id
        FROM users
        WHERE username = ?
        LIMIT 1
      `,
    )
    .get(username) as { id: number } | undefined;

  return Boolean(row);
}

function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function getGuestProfileSelectList(): string {
  return `
    gp.id,
    gp.name,
    gp.status,
    gp.room_number AS roomNumber,
    gp.ic_no AS icNo,
    gp.handphone_no AS handphoneNo,
    gp.email,
    gp.expected_delivery_date AS expectedDeliveryDate,
    gp.hospital_of_delivery AS hospitalOfDelivery,
    gp.mode_of_delivery AS modeOfDelivery,
    gp.child_count AS childCount,
    gp.special_note AS specialNote,
    gp.husband_name AS husbandName,
    gp.husband_ic_no AS husbandIcNo,
    gp.husband_handphone_no AS husbandHandphoneNo,
    gp.husband_email AS husbandEmail,
    gp.address,
    gp.occupation,
    gp.occupation_2 AS occupation2,
    gp.package_type AS packageType,
    gp.package_payable_amount AS packagePayableAmount,
    gp.deposit_to_pay AS depositToPay,
    gp.balance_to_pay AS balanceToPay,
    gp.package_entitlement_snapshot_json AS packageEntitlementSnapshotJson,
    gp.package_special_note AS packageSpecialNote,
    gp.consultant_name AS consultantName,
    gp.medical_food_notes AS medicalFoodNotes,
    gp.kitchen_notes AS kitchenNotes,
    gp.user_id AS userId,
    u.username AS accountUsername,
    u.active AS accountActive,
    gp.created_at AS createdAt
  `;
}
