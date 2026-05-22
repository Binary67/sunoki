import { Buffer } from "node:buffer";
import { db } from "./db";
import { DEFAULT_BRANDING_SETTINGS } from "./branding-defaults";

export type BrandingSettings = {
  brandName: string;
  brandDescription: string;
  iconDataUrl: string | null;
};

export type BrandingMutationResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export const BRAND_NAME_MAX_LENGTH = 80;
export const BRAND_DESCRIPTION_MAX_LENGTH = 240;
export const BRAND_ICON_MAX_SIZE_BYTES = 256 * 1024;

const ACCEPTED_ICON_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

type BrandingSettingsRow = {
  brandName: string;
  brandDescription: string;
  iconDataUrl: string | null;
};

export function getBrandingSettings(): BrandingSettings {
  const row = db
    .prepare(
      `
        SELECT
          brand_name AS brandName,
          brand_description AS brandDescription,
          icon_data_url AS iconDataUrl
        FROM branding_settings
        WHERE id = 1
      `,
    )
    .get() as BrandingSettingsRow | undefined;

  return row ? { ...row } : { ...DEFAULT_BRANDING_SETTINGS };
}

export async function updateBrandingSettings({
  brandDescription,
  brandName,
  iconFile,
  removeIcon,
}: {
  brandName: string;
  brandDescription: string;
  iconFile: File | null;
  removeIcon: boolean;
}): Promise<BrandingMutationResult> {
  const current = getBrandingSettings();
  const normalizedName = brandName.trim();
  const normalizedDescription = brandDescription.replace(/\r\n/g, "\n").trim();

  if (!normalizedName) {
    return { ok: false, message: "Brand name is required." };
  }
  if (normalizedName.length > BRAND_NAME_MAX_LENGTH) {
    return {
      ok: false,
      message: `Brand name must be ${BRAND_NAME_MAX_LENGTH} characters or fewer.`,
    };
  }
  if (!normalizedDescription) {
    return { ok: false, message: "Brand description is required." };
  }
  if (normalizedDescription.length > BRAND_DESCRIPTION_MAX_LENGTH) {
    return {
      ok: false,
      message: `Brand description must be ${BRAND_DESCRIPTION_MAX_LENGTH} characters or fewer.`,
    };
  }

  let iconDataUrl = removeIcon ? null : current.iconDataUrl;
  if (iconFile && iconFile.size > 0) {
    if (!ACCEPTED_ICON_TYPES.has(iconFile.type)) {
      return {
        ok: false,
        message: "Icon must be a PNG, JPEG, or WebP image.",
      };
    }
    if (iconFile.size > BRAND_ICON_MAX_SIZE_BYTES) {
      return {
        ok: false,
        message: "Icon must be 256 KB or smaller.",
      };
    }

    const bytes = Buffer.from(await iconFile.arrayBuffer());
    iconDataUrl = `data:${iconFile.type};base64,${bytes.toString("base64")}`;
  }

  try {
    db.prepare(
      `
        UPDATE branding_settings
        SET brand_name = ?,
            brand_description = ?,
            icon_data_url = ?
        WHERE id = 1
      `,
    ).run(normalizedName, normalizedDescription, iconDataUrl);

    return { ok: true, message: "Personalization updated." };
  } catch {
    return { ok: false, message: "Unable to update personalization." };
  }
}

