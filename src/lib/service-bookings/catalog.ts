import {
  PACKAGE_SERVICE_COLUMNS,
  type PackageServiceColumnName,
} from "../package-entitlements";

export type ServiceBookingKey = PackageServiceColumnName;

export type BookablePackageService = {
  key: ServiceBookingKey;
  name: string;
};

export const BOOKABLE_PACKAGE_SERVICES: BookablePackageService[] =
  PACKAGE_SERVICE_COLUMNS.map((column) => ({
    key: column.name,
    name: column.label,
  }));

export const KITCHEN_PREP_SERVICE_KEYS = [
  "double_boiled_chicken_essence",
  "double_boiled_bird_nest",
  "daddy_meal",
] as const satisfies readonly ServiceBookingKey[];

export type KitchenPrepServiceKey = (typeof KITCHEN_PREP_SERVICE_KEYS)[number];

export type KitchenPrepService = {
  key: KitchenPrepServiceKey;
  name: string;
};

export const KITCHEN_PREP_SERVICES: KitchenPrepService[] =
  KITCHEN_PREP_SERVICE_KEYS.map((serviceKey) => ({
    key: serviceKey,
    name: requireBookablePackageService(serviceKey).name,
  }));

export const RELAXING_HAIR_WASH_SERVICE = requireBookablePackageService(
  "relaxing_hair_wash",
);

export function getBookablePackageService(
  serviceKey: string,
): BookablePackageService | null {
  return (
    BOOKABLE_PACKAGE_SERVICES.find((service) => service.key === serviceKey) ??
    null
  );
}

function requireBookablePackageService(
  serviceKey: string,
): BookablePackageService {
  const service = getBookablePackageService(serviceKey);
  if (!service) {
    throw new Error("Package service is not configured.");
  }
  return service;
}
