import { db } from "./db";
import {
  PACKAGE_SERVICE_COLUMNS,
  type CelebrationChoiceRule,
  type PackageEntitlementSnapshot,
  type PackageServiceColumnName,
} from "./package-entitlements";

type PackageEntitlementRow = {
  package_name: string;
  celebration_choice_rule: CelebrationChoiceRule;
} & Record<PackageServiceColumnName, number>;

export function listPackageEntitlementOptions(): PackageEntitlementSnapshot[] {
  const rows = db
    .prepare(
      `
        SELECT
          package_name,
          ${PACKAGE_SERVICE_COLUMNS.map((column) => column.name).join(",\n          ")},
          celebration_choice_rule
        FROM package_service_entitlements
        ORDER BY id ASC
      `,
    )
    .all() as PackageEntitlementRow[];

  return rows.map(getPackageEntitlementSnapshot);
}

export function getPackageEntitlementSnapshotByName(
  packageName: string | null,
): PackageEntitlementSnapshot | null {
  if (!packageName) return null;

  const row = db
    .prepare(
      `
        SELECT
          package_name,
          ${PACKAGE_SERVICE_COLUMNS.map((column) => column.name).join(",\n          ")},
          celebration_choice_rule
        FROM package_service_entitlements
        WHERE package_name = ?
      `,
    )
    .get(packageName) as PackageEntitlementRow | undefined;

  return row ? getPackageEntitlementSnapshot(row) : null;
}

export function parsePackageEntitlementSnapshot(
  value: string | null,
): PackageEntitlementSnapshot | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as PackageEntitlementSnapshot;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.packageName !== "string" ||
      !isCelebrationChoiceRule(parsed.celebrationChoiceRule) ||
      !Array.isArray(parsed.services)
    ) {
      return null;
    }

    return {
      packageName: parsed.packageName,
      celebrationChoiceRule: parsed.celebrationChoiceRule,
      services: parsed.services
        .map((service) => {
          const column = PACKAGE_SERVICE_COLUMNS.find(
            (candidate) => candidate.name === service.name,
          );
          const quantity = Number(service.quantity);
          if (!column || !Number.isInteger(quantity)) return null;
          return {
            name: column.name,
            label: column.label,
            quantity,
          };
        })
        .filter((service) => service !== null),
    };
  } catch {
    return null;
  }
}

export function serializePackageEntitlementSnapshot(
  snapshot: PackageEntitlementSnapshot | null,
): string | null {
  return snapshot ? JSON.stringify(snapshot) : null;
}

function getPackageEntitlementSnapshot(
  row: PackageEntitlementRow,
): PackageEntitlementSnapshot {
  return {
    packageName: row.package_name,
    celebrationChoiceRule: row.celebration_choice_rule,
    services: PACKAGE_SERVICE_COLUMNS.map((column) => ({
      name: column.name,
      label: column.label,
      quantity: row[column.name],
    })),
  };
}

function isCelebrationChoiceRule(value: string): value is CelebrationChoiceRule {
  return value === "none" || value === "choose_one";
}
