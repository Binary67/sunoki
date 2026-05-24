import { formatBookingDate } from "./booking-dates";
import { db } from "./db";
import {
  insertGuestProfileAddons,
  listGuestProfileAddons,
  replaceGuestProfileAddons,
} from "./guest-profile-addons";
import {
  insertGuestUser,
  parseOptionalGuestAccount,
  parseRequiredGuestAccount,
  setGuestUserAccess,
  updateGuestUser,
  updateGuestUserStayDates,
  type GuestProfileAccountMutationResult,
} from "./guest-profile-accounts";
import {
  getPackageSnapshotJsonForSave,
  parseGuestProfileForm,
} from "./guest-profile-form";
import {
  getGuestProfileComputedStatus,
  getGuestStayDates,
} from "./guest-profile-stay";
import {
  GUEST_PROFILE_COLUMNS,
  type GuestKitchenNote,
  type GuestProfile,
  type GuestProfileFilterStatus,
  type GuestProfileStatus,
} from "./guest-profile-types";

export {
  formatGuestProfileAddonPrice,
  getGuestProfileAddonLineTotalCents,
  getGuestProfileAddonTotalCents,
  listGuestProfileAddons,
} from "./guest-profile-addons";
export type {
  GuestProfileAddon,
  GuestProfileAddonCategory,
} from "./guest-profile-addons";
export type { GuestProfileAccountMutationResult } from "./guest-profile-accounts";
export {
  getGuestProfileCheckoutDate,
  getGuestProfileComputedStatus,
} from "./guest-profile-stay";
export {
  GUEST_BASE_STAY_DAYS,
  GUEST_ROOM_LEVELS,
  GUEST_ROOM_NUMBERS,
} from "./guest-profile-types";
export type {
  GuestKitchenNote,
  GuestProfile,
  GuestProfileColumn,
  GuestProfileFilterStatus,
  GuestProfileStatus,
} from "./guest-profile-types";

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
    setGuestUserAccess(profile.userId, active);
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
