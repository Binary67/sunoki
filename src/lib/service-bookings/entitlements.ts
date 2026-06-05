import { parsePackageEntitlementSnapshot } from "../package-entitlement-options";
import { UNLIMITED_PACKAGE_SERVICE_QUANTITY } from "../package-entitlements";
import type { BookablePackageService } from "./catalog";
import {
  getDoneServiceBookingCount,
  getPurchasedPerkQuantity,
  type GuestProfileServiceRow,
} from "./repository";

export type ServiceEntitlement = {
  packageQuantity: number;
  purchasedPerkQuantity: number;
  totalQuantity: number;
  usedQuantity: number;
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
  const usedQuantity = getDoneServiceBookingCount(
    userId,
    service.key,
    excludeBookingId,
  );
  const remainingQuantity =
    totalQuantity === UNLIMITED_PACKAGE_SERVICE_QUANTITY
      ? null
      : Math.max(0, totalQuantity - usedQuantity);

  return {
    packageQuantity,
    purchasedPerkQuantity,
    totalQuantity,
    usedQuantity,
    remainingQuantity,
  };
}
