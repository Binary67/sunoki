import type { AdminRow } from "../definitions";
import type { BackupImportError, ParsedSheetRow } from "./types";
import {
  addRowError,
  readLimitedOptionalTextValue,
  readPositiveIntegerValue,
  readRequiredTextValue,
} from "./values";

export function validateFacilities(
  rows: ParsedSheetRow[],
  errors: BackupImportError[],
): AdminRow[] {
  const normalized: AdminRow[] = [];
  const ids = new Set<number>();
  const slugs = new Set<string>();
  const names = new Set<string>();

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
      slugs.add(slug);
    }

    if (name !== null) {
      const normalizedName = name.normalize("NFKC").toLowerCase();
      if (names.has(normalizedName)) {
        addRowError(
          errors,
          row,
          "facilities",
          "name",
          `Duplicate facility name "${name}".`,
        );
      }
      names.add(normalizedName);
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

  return normalized;
}
