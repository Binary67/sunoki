export const UNLIMITED_PACKAGE_SERVICE_QUANTITY = -1;

export const PACKAGE_SERVICE_COLUMNS = [
  {
    name: "lactation_consultation_breast_massage",
    label: "Lactation Consultation & Breast Massage",
  },
  { name: "tcm_visit", label: "TCM Visit" },
  { name: "relaxing_foot_bath", label: "Relaxing Foot Bath" },
  { name: "breast_pads", label: "Breast Pads" },
  { name: "maternity_pads", label: "Maternity Pads" },
  { name: "confinement_stocking", label: "Confinement Stocking" },
  {
    name: "double_boiled_chicken_essence",
    label: "Double Boiled Chicken Essence",
  },
  {
    name: "double_boiled_bird_nest",
    label: "Double Boiled Bird Nest",
  },
  {
    name: "traditional_full_body_massage",
    label: "Traditional Full Body Massage",
  },
  { name: "relaxing_hair_wash", label: "Relaxing Hair Wash" },
  { name: "daddy_meal", label: "Daddy Meal" },
  { name: "facial_massage", label: "Facial Massage" },
  { name: "probiotics", label: "Probiotics" },
  { name: "candlelight_dinner", label: "Candlelight Dinner" },
  { name: "full_moon_ceremony", label: "Full Moon Ceremony" },
  {
    name: "infant_photography_or_footprint",
    label: "Infant Photography / Footprint",
  },
  {
    name: "personalised_baby_care",
    label: "1:1 Personalised Baby Care",
  },
  {
    name: "exclusive_private_baby_room",
    label: "Exclusive Private Room For Baby",
  },
] as const;

export type PackageServiceColumnName =
  (typeof PACKAGE_SERVICE_COLUMNS)[number]["name"];

export type CelebrationChoiceRule = "none" | "choose_one";

export type PackageServiceSnapshotItem = {
  name: PackageServiceColumnName;
  label: string;
  quantity: number;
};

export type PackageEntitlementSnapshot = {
  packageName: string;
  celebrationChoiceRule: CelebrationChoiceRule;
  services: PackageServiceSnapshotItem[];
};

export type PackageEntitlementDefault = {
  celebrationChoiceRule: CelebrationChoiceRule;
  id: number;
  packageName: string;
  services: Record<PackageServiceColumnName, number>;
};

export const PACKAGE_ENTITLEMENT_DEFAULTS: PackageEntitlementDefault[] = [
  {
    id: 1,
    packageName: "SUPREME CARE",
    celebrationChoiceRule: "none",
    services: packageServices([
      0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]),
  },
  {
    id: 2,
    packageName: "PREMIUM CARE",
    celebrationChoiceRule: "none",
    services: packageServices([
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0,
    ]),
  },
  {
    id: 3,
    packageName: "DELUXE CARE",
    celebrationChoiceRule: "choose_one",
    services: packageServices([
      2,
      2,
      4,
      2,
      3,
      2,
      3,
      3,
      2,
      4,
      2,
      1,
      UNLIMITED_PACKAGE_SERVICE_QUANTITY,
      1,
      1,
      1,
      0,
      0,
    ]),
  },
  {
    id: 4,
    packageName: "LUXURY CARE",
    celebrationChoiceRule: "none",
    services: packageServices([
      3,
      2,
      4,
      4,
      4,
      2,
      4,
      4,
      3,
      8,
      4,
      1,
      UNLIMITED_PACKAGE_SERVICE_QUANTITY,
      UNLIMITED_PACKAGE_SERVICE_QUANTITY,
      UNLIMITED_PACKAGE_SERVICE_QUANTITY,
      UNLIMITED_PACKAGE_SERVICE_QUANTITY,
      UNLIMITED_PACKAGE_SERVICE_QUANTITY,
      UNLIMITED_PACKAGE_SERVICE_QUANTITY,
    ]),
  },
];

export function formatPackageServiceQuantity(quantity: number): string {
  if (quantity === UNLIMITED_PACKAGE_SERVICE_QUANTITY) return "Unlimited";
  return String(quantity);
}

export function getPackageServiceEnabledFieldName(
  serviceName: PackageServiceColumnName,
): string {
  return `package_service_enabled_${serviceName}`;
}

export function getPackageServiceQuantityFieldName(
  serviceName: PackageServiceColumnName,
): string {
  return `package_service_quantity_${serviceName}`;
}

export function isAvailablePackageServiceQuantity(quantity: number): boolean {
  return quantity > 0 || quantity === UNLIMITED_PACKAGE_SERVICE_QUANTITY;
}

function packageServices(
  values: readonly number[],
): Record<PackageServiceColumnName, number> {
  if (values.length !== PACKAGE_SERVICE_COLUMNS.length) {
    throw new Error("Package service default count does not match columns.");
  }

  return PACKAGE_SERVICE_COLUMNS.reduce(
    (result, column, index) => ({
      ...result,
      [column.name]: values[index],
    }),
    {} as Record<PackageServiceColumnName, number>,
  );
}
