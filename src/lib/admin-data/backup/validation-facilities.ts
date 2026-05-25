import type { AdminRow } from "../definitions";
import type { BackupImportError, ParsedSheetRow } from "./types";
import { isTimeValue } from "./validation-helpers";
import {
  addRowError,
  readIntegerValue,
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

export function validateTimeSlots(
  rows: ParsedSheetRow[],
  facilities: AdminRow[],
  errors: BackupImportError[],
): AdminRow[] {
  const normalized: AdminRow[] = [];
  const ids = new Set<number>();
  const facilityIds = new Set(facilities.map((row) => Number(row.id)));
  const uniqueSlots = new Set<string>();

  for (const row of rows) {
    const id = readPositiveIntegerValue(
      row,
      "facility_time_slots",
      "id",
      "ID",
      errors,
    );
    const facilityId = readPositiveIntegerValue(
      row,
      "facility_time_slots",
      "facility_id",
      "Facility",
      errors,
    );
    const startTime = readRequiredTextValue(
      row,
      "facility_time_slots",
      "start_time",
      "Start time",
      errors,
    );
    const duration = readPositiveIntegerValue(
      row,
      "facility_time_slots",
      "duration_minutes",
      "Duration minutes",
      errors,
    );
    const capacity = readPositiveIntegerValue(
      row,
      "facility_time_slots",
      "capacity_pax",
      "Capacity pax",
      errors,
    );
    const active = readIntegerValue(
      row,
      "facility_time_slots",
      "active",
      "Active",
      errors,
    );

    if (id !== null) {
      if (ids.has(id)) {
        addRowError(
          errors,
          row,
          "facility_time_slots",
          "id",
          `Duplicate time slot ID ${id}.`,
        );
      }
      ids.add(id);
    }

    if (facilityId !== null && !facilityIds.has(facilityId)) {
      addRowError(
        errors,
        row,
        "facility_time_slots",
        "facility_id",
        `Facility ID ${facilityId} is not present in the workbook.`,
      );
    }

    if (startTime !== null && !isTimeValue(startTime)) {
      addRowError(
        errors,
        row,
        "facility_time_slots",
        "start_time",
        "Enter a valid start time.",
      );
    }

    if (active !== null && active !== 0 && active !== 1) {
      addRowError(
        errors,
        row,
        "facility_time_slots",
        "active",
        "Active must be 0 or 1.",
      );
    }

    if (facilityId !== null && startTime !== null) {
      const key = `${facilityId}:${startTime}`;
      if (uniqueSlots.has(key)) {
        addRowError(
          errors,
          row,
          "facility_time_slots",
          "start_time",
          "Facility and start time must be unique.",
        );
      }
      uniqueSlots.add(key);
    }

    normalized.push({
      id,
      facility_id: facilityId,
      start_time: startTime,
      duration_minutes: duration,
      capacity_pax: capacity,
      active,
    });
  }

  return normalized;
}

function isRequiredFacilitySlug(value: string): boolean {
  return (REQUIRED_FACILITY_SLUGS as readonly string[]).includes(value);
}
