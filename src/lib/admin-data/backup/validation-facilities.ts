import type { AdminRow } from "../definitions";
import type { BackupImportError, ParsedSheetRow } from "./types";
import {
  addRowError,
  readLimitedOptionalTextValue,
  readPositiveIntegerValue,
  readRequiredTextValue,
} from "./values";

const REQUIRED_FACILITY_SLUGS = ["karaoke", "gym", "yoga", "lounge"] as const;

export function validateFacilities(
  rows: ParsedSheetRow[],
  errors: BackupImportError[],
): AdminRow[] {
  const normalized: AdminRow[] = [];
  const ids = new Set<number>();
  const slugs = new Set<string>();

  for (const row of rows) {
    const id = readPositiveIntegerValue(row, "facilities", "id", "ID", errors);
    const slug = readRequiredTextValue(
      row,
      "facilities",
      "slug",
      "Slug",
      errors,
    );
    const name = readRequiredTextValue(
      row,
      "facilities",
      "name",
      "Name",
      errors,
    );
    const tagline1 = readLimitedOptionalTextValue(
      row,
      "facilities",
      "tagline_1",
      "Tagline 1",
      errors,
    );
    const tagline2 = readLimitedOptionalTextValue(
      row,
      "facilities",
      "tagline_2",
      "Tagline 2",
      errors,
    );
    const tagline3 = readLimitedOptionalTextValue(
      row,
      "facilities",
      "tagline_3",
      "Tagline 3",
      errors,
    );

    if (id !== null) {
      if (ids.has(id)) {
        addRowError(
          errors,
          row,
          "facilities",
          "id",
          `Duplicate facility ID ${id}.`,
        );
      }
      ids.add(id);
    }

    if (slug !== null) {
      if (slugs.has(slug)) {
        addRowError(
          errors,
          row,
          "facilities",
          "slug",
          `Duplicate facility slug "${slug}".`,
        );
      }
      if (!isRequiredFacilitySlug(slug)) {
        addRowError(
          errors,
          row,
          "facilities",
          "slug",
          "Choose a valid facility slug.",
        );
      }
      slugs.add(slug);
    }

    normalized.push({
      id,
      slug,
      name,
      tagline_1: tagline1,
      tagline_2: tagline2,
      tagline_3: tagline3,
    });
  }

  for (const slug of REQUIRED_FACILITY_SLUGS) {
    if (!slugs.has(slug)) {
      errors.push({
        tableName: "facilities",
        message: `Facility "${slug}" is missing from the workbook.`,
      });
    }
  }

  return normalized;
}

function isRequiredFacilitySlug(value: string): boolean {
  return (REQUIRED_FACILITY_SLUGS as readonly string[]).includes(value);
}
