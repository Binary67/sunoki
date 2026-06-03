import { db } from "../src/lib/db";
import {
  PACKAGE_ENTITLEMENT_DEFAULTS,
  PACKAGE_SERVICE_COLUMNS,
} from "../src/lib/package-entitlements";

const upsert = db.prepare(
  `
    INSERT OR IGNORE INTO users (
      username,
      password,
      role,
      active
    )
    VALUES (?, ?, ?, 1)
  `,
);

const accounts = [
  {
    username: "superadmin",
    password: "superadmin123",
    role: "superadmin",
  },
  {
    username: "admin",
    password: "admin123",
    role: "admin",
  },
] as const;

for (const { username, password, role } of accounts) {
  const result = upsert.run(username, password, role);
  const action = Number(result.changes) === 1 ? "inserted" : "already exists";
  console.log(`${username} (${role}): ${action}`);
}

const facilities = [
  {
    slug: "karaoke",
    name: "Karaoke Lounge",
    taglines: ["HI-FI AUDIO", "ATMOSPHERE", "MAX 4 PEOPLE"],
  },
  {
    slug: "gym",
    name: "Strength Studio",
    taglines: ["FREE WEIGHTS", "CARDIO ZONE", "OPEN 24/7"],
  },
  {
    slug: "yoga",
    name: "Yoga Studio",
    taglines: ["HEATED FLOOR", "MAT INCLUDED", "MAX 12 GUESTS"],
  },
  {
    slug: "lounge",
    name: "Tranquil Lounge",
    taglines: ["HERBAL BAR", "QUIET HOURS", "MAX 8 GUESTS"],
  },
] as const;

const insertFacility = db.prepare(
  `
    INSERT OR IGNORE INTO facilities (
      slug,
      name,
      tagline_1,
      tagline_2,
      tagline_3
    )
    VALUES (?, ?, ?, ?, ?)
  `,
);

for (const facility of facilities) {
  const result = insertFacility.run(
    facility.slug,
    facility.name,
    ...facility.taglines,
  );
  const action = Number(result.changes) === 1 ? "inserted" : "already exists";
  console.log(`${facility.slug} facility: ${action}`);
}

const packageColumns = [
  "id",
  "package_name",
  ...PACKAGE_SERVICE_COLUMNS.map((column) => column.name),
  "celebration_choice_rule",
] as const;
const packageUpdateColumns = packageColumns.filter((column) => column !== "id");
const upsertPackageEntitlement = db.prepare(
  `
    INSERT INTO package_service_entitlements (
      ${packageColumns.join(", ")}
    )
    VALUES (${packageColumns.map(() => "?").join(", ")})
    ON CONFLICT(id) DO UPDATE SET
      ${packageUpdateColumns
        .map((column) => `${column} = excluded.${column}`)
        .join(", ")}
  `,
);

for (const entitlement of PACKAGE_ENTITLEMENT_DEFAULTS) {
  upsertPackageEntitlement.run(
    entitlement.id,
    entitlement.packageName,
    ...PACKAGE_SERVICE_COLUMNS.map(
      (column) => entitlement.services[column.name],
    ),
    entitlement.celebrationChoiceRule,
  );
  console.log(`${entitlement.packageName} package entitlement: reset`);
}
