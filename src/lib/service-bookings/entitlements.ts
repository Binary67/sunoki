import { parsePackageEntitlementSnapshot } from "../package-entitlement-options";
import { UNLIMITED_PACKAGE_SERVICE_QUANTITY } from "../package-entitlements";
import type { BookablePackageService } from "./catalog";
import {
  getBookedServiceBookingCount,
  getPurchasedPerkQuantity,
  type GuestProfileServiceRow,
} from "./repository";

export type ServiceEntitlement = {
  packageQuantity: number;
  purchasedPerkQuantity: number;
  totalQuantity: number;
  bookedQuantity: number;
  remainingQuantity: number | null;
};

export function getServiceEntitlement(
  userId: number,
  guestProfileId: number,
  profile: GuestProfileServiceRow,
  service: BookablePackageService,
  excludeBookingId?: number,
): ServiceEntitlement {
  const snapshot = parsePackageEntitlementSnapshot(
    profile.packageEntitlementSnapshotJson,
  );
  const packageQuantity =
    snapshot?.services.find(
      (snapshotService) => snapshotService.name === service.key,
    )?.quantity ?? 0;
  const purchasedPerkQuantity = getPurchasedPerkQuantity(
    guestProfileId,
    service.name,
  );
  const totalQuantity =
    packageQuantity === UNLIMITED_PACKAGE_SERVICE_QUANTITY
      ? UNLIMITED_PACKAGE_SERVICE_QUANTITY
      : packageQuantity + purchasedPerkQuantity;
  const bookedQuantity = getBookedServiceBookingCount(
    userId,
    service.key,
    excludeBookingId,
  );
  const remainingQuantity =
    totalQuantity === UNLIMITED_PACKAGE_SERVICE_QUANTITY
      ? null
      : Math.max(0, totalQuantity - bookedQuantity);

  return {
    packageQuantity,
    purchasedPerkQuantity,
    totalQuantity,
    bookedQuantity,
    remainingQuantity,
  };
}
