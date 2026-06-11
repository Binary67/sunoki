import { formatBookingDate } from "./booking-dates";
import { db, type User } from "./db";
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
import { getGuestStayDates } from "./guest-profile-stay";
import {
  GUEST_PROFILE_COLUMNS,
  type GuestKitchenNote,
  type GuestProfile,
  type GuestProfileFilterStatus,
  type GuestProfileListItem,
  type GuestProfileStatus,
} from "./guest-profile-types";
import {
  reconcileFutureGuestBookings,
  type GuestBookingReconciliationResult,
} from "./guest-booking-reconciliation";

export {
  formatGuestProfileAddonPrice,
  getGuestProfileAddonLineTotalCents,
  getGuestProfileAddonTotalCents,
  listGuestProfileAddons,
  listGuestProfileAddonsByProfileIds,
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
  GuestProfileListItem,
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
  | { ok: true; message?: string }
  | { ok: false; message: string };

export function listGuestProfiles(
  status: GuestProfileFilterStatus = "incoming",
  today = formatBookingDate(new Date()),
): GuestProfile[] {
  return selectGuestProfiles(status, today);
}

export function listGuestProfileListItems(
  status: GuestProfileFilterStatus = "incoming",
  today = formatBookingDate(new Date()),
): GuestProfileListItem[] {
  return selectGuestProfileListItems(status, today);
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
    formData,
  );
  if (!packageSnapshot.ok) return packageSnapshot;
  values.data.package_entitlement_snapshot_json = packageSnapshot.value;

  try {
    db.exec("BEGIN");
    const stayDates = getGuestStayDates(
      values.data.check_in_date,
      values.addons,
    );
    const userId = insertGuestUser(
      account.username,
      account.password,
      stayDates,
    );
    const result = db
      .prepare(
        `
          INSERT INTO guest_profiles (${GUEST_PROFILE_COLUMNS.join(", ")}, checkout_date, user_id)
          VALUES (${GUEST_PROFILE_COLUMNS.map(() => "?").join(", ")}, ?, ?)
        `,
      )
      .run(
        ...GUEST_PROFILE_COLUMNS.map((column) => values.data[column]),
        stayDates.checkOutDate,
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
  actor: User,
): GuestProfileMutationResult {
  if (!isValidGuestProfileId(id)) {
    return { ok: false, message: "Choose a valid guest profile." };
  }

  const values = parseGuestProfileForm(formData);
  if (!values.ok) return values;

  const profile = getGuestProfile(id);
  if (!profile) return { ok: false, message: "Guest profile not found." };
  const previousAddons = listGuestProfileAddons(id);
  const previousStayDates = getGuestStayDates(
    profile.checkInDate,
    previousAddons,
  );
  if (profile.status === "checked_in" && !values.data.check_in_date) {
    return { ok: false, message: "Check In Date is required." };
  }

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
    formData,
  );
  if (!packageSnapshot.ok) return packageSnapshot;
  values.data.package_entitlement_snapshot_json = packageSnapshot.value;

  try {
    db.exec("BEGIN");
    let userId = profile.userId;
    const stayDates = getGuestStayDates(
      values.data.check_in_date,
      values.addons,
    );
    const stayDatesChanged = hasStayDatesChanged(previousStayDates, stayDates);

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
              checkout_date = ?,
              user_id = ?
          WHERE id = ?
        `,
      )
      .run(
        ...GUEST_PROFILE_COLUMNS.map((column) => values.data[column]),
        stayDates.checkOutDate,
        userId,
        id,
      ) as MutationResult;

    if (Number(result.changes) === 0) {
      rollbackGuestProfileTransaction();
      return { ok: false, message: "Guest profile not found." };
    }

    replaceGuestProfileAddons(id, values.addons);
    const reconciliation = profile.userId && stayDatesChanged
      ? reconcileFutureGuestBookings({
          active: profile.accountActive === 1 ? 1 : 0,
          actor,
          stayDates,
          userId: profile.userId,
        })
      : null;
    if (
      userId &&
      profile.status === "checked_in" &&
      profile.accountActive === 1 &&
      stayDates.checkOutDate &&
      stayDates.checkOutDate < formatBookingDate(new Date())
    ) {
      setGuestUserAccess(userId, 0);
    }
    db.exec("COMMIT");

    return {
      ok: true,
      message: getGuestProfileMutationMessage(
        "Guest profile updated",
        reconciliation,
        stayDatesChanged,
      ),
    };
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
  actor: User,
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
  const stayDates = getGuestStayDates(
    profile.checkInDate,
    listGuestProfileAddons(id),
  );

  try {
    db.exec("BEGIN");
    setGuestUserAccess(profile.userId, active);
    const reconciliation = reconcileFutureGuestBookings({
      active,
      actor,
      stayDates,
      userId: profile.userId,
    });
    db.exec("COMMIT");
    return {
      ok: true,
      message: getGuestProfileMutationMessage(
        active === 1
          ? "Guest account reactivated"
          : "Guest account deactivated",
        reconciliation,
        active === 1,
      ),
    };
  } catch {
    rollbackGuestProfileTransaction();
    return { ok: false, message: "Unable to update guest account access." };
  }
}

export function setGuestProfileStatus(
  id: number,
  status: GuestProfileStatus,
  actor: User,
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
        ? checkInGuestProfile(id, actor)
        : undoGuestProfileCheckIn(id, actor);

    if (Number(result.changes) === 0) {
      return { ok: false, message: "Guest profile not found." };
    }

    return {
      ok: true,
      message: getGuestProfileMutationMessage(
        status === "checked_in" ? "Guest checked in" : "Guest check-in undone",
        result.reconciliation,
        status === "checked_in",
      ),
    };
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

function selectGuestProfiles(
  status: GuestProfileFilterStatus,
  today: string,
): GuestProfile[] {
  const filter = getGuestProfileStatusFilter(status, today);

  return db
    .prepare(
      `
        SELECT ${getGuestProfileSelectList()}
        FROM guest_profiles gp
        LEFT JOIN users u ON u.id = gp.user_id
        WHERE ${filter.whereSql}
        ORDER BY datetime(gp.created_at) DESC, gp.id DESC
      `,
    )
    .all(...filter.params) as GuestProfile[];
}

function selectGuestProfileListItems(
  status: GuestProfileFilterStatus,
  today: string,
): GuestProfileListItem[] {
  const filter = getGuestProfileStatusFilter(status, today);

  return db
    .prepare(
      `
        SELECT ${getGuestProfileListItemSelectList()}
        FROM guest_profiles gp
        LEFT JOIN users u ON u.id = gp.user_id
        WHERE ${filter.whereSql}
        ORDER BY datetime(gp.created_at) DESC, gp.id DESC
      `,
    )
    .all(...filter.params) as GuestProfileListItem[];
}

function checkInGuestProfile(
  id: number,
  actor: User,
): MutationResult & { reconciliation: GuestBookingReconciliationResult | null } {
  const profile = getGuestProfile(id);
  if (!profile) return { changes: 0, reconciliation: null };

  const checkInDate = formatBookingDate(new Date());
  const addons = listGuestProfileAddons(id);
  const stayDates = getGuestStayDates(checkInDate, addons);
  let reconciliation: GuestBookingReconciliationResult | null = null;

  db.exec("BEGIN");
  try {
    const result = db
      .prepare(
        `
          UPDATE guest_profiles
          SET status = 'checked_in',
              check_in_date = ?,
              checkout_date = ?
          WHERE id = ?
        `,
      )
      .run(checkInDate, stayDates.checkOutDate, id) as MutationResult;

    if (profile.userId) {
      updateGuestUserStayDates(profile.userId, stayDates);
      setGuestUserAccess(profile.userId, 1);
      reconciliation = reconcileFutureGuestBookings({
        active: 1,
        actor,
        stayDates,
        userId: profile.userId,
      });
    }

    db.exec("COMMIT");
    return { ...result, reconciliation };
  } catch (error) {
    rollbackGuestProfileTransaction();
    throw error;
  }
}

function undoGuestProfileCheckIn(
  id: number,
  actor: User,
): MutationResult & { reconciliation: GuestBookingReconciliationResult | null } {
  const profile = getGuestProfile(id);
  if (!profile) return { changes: 0, reconciliation: null };
  const stayDates = getGuestStayDates(
    profile.checkInDate,
    listGuestProfileAddons(id),
  );
  let reconciliation: GuestBookingReconciliationResult | null = null;

  db.exec("BEGIN");
  try {
    const result = db
      .prepare(
        `
          UPDATE guest_profiles
          SET status = 'incoming'
          WHERE id = ?
        `,
      )
      .run(id) as MutationResult;

    if (profile.userId) {
      setGuestUserAccess(profile.userId, 0);
      reconciliation = reconcileFutureGuestBookings({
        active: 0,
        actor,
        stayDates,
        userId: profile.userId,
      });
    }

    db.exec("COMMIT");
    return { ...result, reconciliation };
  } catch (error) {
    rollbackGuestProfileTransaction();
    throw error;
  }
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

function getGuestProfileMutationMessage(
  baseMessage: string,
  reconciliation: GuestBookingReconciliationResult | null,
  includeRestoreNotice: boolean,
): string {
  const details: string[] = [];
  const cancelledCount =
    (reconciliation?.facilityBookingsCancelled ?? 0) +
    (reconciliation?.serviceBookingsCancelled ?? 0);

  if (cancelledCount > 0) {
    const bookingNoun = cancelledCount === 1 ? "booking was" : "bookings were";
    const pronoun = cancelledCount === 1 ? "it is" : "they are";
    details.push(
      `${cancelledCount} future ${bookingNoun} cancelled because ${pronoun} no longer valid.`,
    );
  }

  if (
    includeRestoreNotice &&
    reconciliation &&
    reconciliation.futureCancelledBookingsRetained > 0
  ) {
    details.push(
      "Cancelled bookings are not restored automatically. Rebook them if needed.",
    );
  }

  return details.length > 0
    ? `${baseMessage}. ${details.join(" ")}`
    : `${baseMessage}.`;
}

function hasStayDatesChanged(
  previousStayDates: { checkInDate: string | null; checkOutDate: string | null },
  stayDates: { checkInDate: string | null; checkOutDate: string | null },
): boolean {
  return (
    previousStayDates.checkInDate !== stayDates.checkInDate ||
    previousStayDates.checkOutDate !== stayDates.checkOutDate
  );
}

function getGuestProfileStatusFilter(
  status: GuestProfileFilterStatus,
  today: string,
): { whereSql: string; params: string[] } {
  if (status === "checked_out") {
    return {
      whereSql: "gp.status = 'checked_in' AND gp.checkout_date < ?",
      params: [today],
    };
  }

  if (status === "checked_in") {
    return {
      whereSql:
        "gp.status = 'checked_in' AND (gp.checkout_date IS NULL OR gp.checkout_date >= ?)",
      params: [today],
    };
  }

  return { whereSql: "gp.status = 'incoming'", params: [] };
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
    gp.check_in_date AS checkInDate,
    gp.checkout_date AS checkoutDate,
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

function getGuestProfileListItemSelectList(): string {
  return `
    gp.id,
    gp.name,
    gp.status,
    gp.room_number AS roomNumber,
    gp.ic_no AS icNo,
    gp.handphone_no AS handphoneNo,
    gp.expected_delivery_date AS expectedDeliveryDate,
    gp.check_in_date AS checkInDate,
    gp.checkout_date AS checkoutDate,
    gp.mode_of_delivery AS modeOfDelivery,
    gp.package_type AS packageType,
    u.username AS accountUsername
  `;
}
