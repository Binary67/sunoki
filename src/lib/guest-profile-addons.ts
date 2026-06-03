import { db } from "./db";
import { ADDITIONAL_DAYS_ADDON_NAME } from "./guest-profile-addon-constants";
import { PACKAGE_SERVICE_COLUMNS } from "./package-entitlements";

export { ADDITIONAL_DAYS_ADDON_NAME } from "./guest-profile-addon-constants";

export type GuestProfileAddonCategory = "sunoki" | "custom";

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

export type GuestProfileAddonInput = {
  category: GuestProfileAddonCategory;
  serviceName: string;
  quantity: number;
  days: number | null;
  priceCents: number;
  remarks: string | null;
};

export type GuestStayAddon = {
  serviceName: string;
  days: number | null;
};

export function listGuestProfileAddons(
  profileId: number,
): GuestProfileAddon[] {
  if (!Number.isInteger(profileId) || profileId <= 0) return [];

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

export function listGuestProfileAddonsByProfileIds(
  profileIds: number[],
): Map<number, GuestProfileAddon[]> {
  const validProfileIds = getValidProfileIds(profileIds);
  const addonsByProfileId = new Map<number, GuestProfileAddon[]>();
  if (validProfileIds.length === 0) return addonsByProfileId;

  const placeholders = validProfileIds.map(() => "?").join(", ");
  const rows = db
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
        WHERE guest_profile_id IN (${placeholders})
        ORDER BY
          guest_profile_id ASC,
          CASE
            WHEN service_name = ? THEN 0
            WHEN category = 'sunoki' THEN 1
            ELSE 2
          END,
          id ASC
      `,
    )
    .all(...validProfileIds, ADDITIONAL_DAYS_ADDON_NAME) as GuestProfileAddon[];

  for (const row of rows) {
    const addons = addonsByProfileId.get(row.guestProfileId);
    if (addons) {
      addons.push(row);
    } else {
      addonsByProfileId.set(row.guestProfileId, [row]);
    }
  }

  return addonsByProfileId;
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

export function parseGuestProfileAddons(
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

export function insertGuestProfileAddons(
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

export function replaceGuestProfileAddons(
  profileId: number,
  addons: GuestProfileAddonInput[],
): void {
  db.prepare("DELETE FROM guest_profile_addons WHERE guest_profile_id = ?").run(
    profileId,
  );
  insertGuestProfileAddons(profileId, addons);
}

function getAddonQuantity(
  addon: Pick<GuestProfileAddon, "serviceName" | "quantity">,
): number {
  return addon.serviceName === ADDITIONAL_DAYS_ADDON_NAME ? 1 : addon.quantity;
}

function getValidProfileIds(profileIds: number[]): number[] {
  return [
    ...new Set(
      profileIds.filter((profileId) => Number.isInteger(profileId) && profileId > 0),
    ),
  ];
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
