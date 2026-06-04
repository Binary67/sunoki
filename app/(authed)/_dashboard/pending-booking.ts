import { addBookingDays } from "@/src/lib/booking-dates";
import { db } from "@/src/lib/db";
import {
  listGuestProfileAddonsByProfileIds,
  type GuestProfileAddon,
} from "@/src/lib/guest-profile-addons";
import {
  getGuestProfileCheckoutDate,
  listGuestProfiles,
  type GuestProfile,
} from "@/src/lib/guest-profiles";
import { parsePackageEntitlementSnapshot } from "@/src/lib/package-entitlement-options";
import {
  UNLIMITED_PACKAGE_SERVICE_QUANTITY,
  type PackageEntitlementSnapshot,
} from "@/src/lib/package-entitlements";
import {
  BOOKABLE_PACKAGE_SERVICES,
  type ServiceBookingKey,
} from "@/src/lib/service-bookings/catalog";

export type PendingBookingServiceQuota = {
  packageQuantity: number;
  purchasedPerkQuantity: number;
  remainingQuantity: number;
  serviceKey: ServiceBookingKey;
  serviceName: string;
  totalQuantity: number;
  usedQuantity: number;
};

export type PendingBookingGuest = {
  checkoutDate: string | null;
  isUrgent: boolean;
  profile: GuestProfile;
  services: PendingBookingServiceQuota[];
  totalRemainingQuantity: number;
};

type ActiveServiceBookingCountRow = {
  count: number;
  profileId: number;
  serviceKey: ServiceBookingKey;
};

export function getPendingBookingGuests(today: string): PendingBookingGuest[] {
  const profiles = listGuestProfiles("checked_in", today);
  const profileIds = profiles.map((profile) => profile.id);
  const addonsByProfileId = listGuestProfileAddonsByProfileIds(profileIds);
  const usedCountsByProfileService =
    listActiveServiceBookingCountsByProfileIds(profileIds);
  const urgentThroughDate = addBookingDays(today, 7);

  return profiles
    .map((profile) => {
      const addons = addonsByProfileId.get(profile.id) ?? [];
      const checkoutDate = getGuestProfileCheckoutDate(profile, addons);
      const snapshot = parsePackageEntitlementSnapshot(
        profile.packageEntitlementSnapshotJson,
      );
      const services = getPendingServiceQuotas(
        profile,
        snapshot,
        addons,
        usedCountsByProfileService,
      );

      if (services.length === 0) return null;

      return {
        checkoutDate,
        isUrgent: Boolean(
          checkoutDate &&
            checkoutDate >= today &&
            checkoutDate <= urgentThroughDate,
        ),
        profile,
        services,
        totalRemainingQuantity: services.reduce(
          (total, service) => total + service.remainingQuantity,
          0,
        ),
      };
    })
    .filter((guest): guest is PendingBookingGuest => guest !== null)
    .sort(comparePendingBookingGuests);
}

function getPendingServiceQuotas(
  profile: GuestProfile,
  snapshot: PackageEntitlementSnapshot | null,
  addons: GuestProfileAddon[],
  usedCountsByProfileService: Map<string, number>,
): PendingBookingServiceQuota[] {
  return BOOKABLE_PACKAGE_SERVICES.flatMap((service) => {
    const packageQuantity = getPackageServiceQuantity(snapshot, service.key);
    if (packageQuantity === UNLIMITED_PACKAGE_SERVICE_QUANTITY) return [];

    const purchasedPerkQuantity = getPurchasedPerkQuantity(addons, service.name);
    const totalQuantity = packageQuantity + purchasedPerkQuantity;
    if (totalQuantity <= 0) return [];

    const usedQuantity =
      usedCountsByProfileService.get(getCountKey(profile.id, service.key)) ?? 0;
    const remainingQuantity = Math.max(0, totalQuantity - usedQuantity);
    if (remainingQuantity <= 0) return [];

    return [
      {
        packageQuantity,
        purchasedPerkQuantity,
        remainingQuantity,
        serviceKey: service.key,
        serviceName: service.name,
        totalQuantity,
        usedQuantity,
      },
    ];
  });
}

function getPackageServiceQuantity(
  snapshot: PackageEntitlementSnapshot | null,
  serviceKey: ServiceBookingKey,
): number {
  return (
    snapshot?.services.find((service) => service.name === serviceKey)?.quantity ??
    0
  );
}

function getPurchasedPerkQuantity(
  addons: GuestProfileAddon[],
  serviceName: string,
): number {
  return addons.reduce(
    (total, addon) =>
      addon.category === "sunoki" && addon.serviceName === serviceName
        ? total + addon.quantity
        : total,
    0,
  );
}

function listActiveServiceBookingCountsByProfileIds(
  profileIds: number[],
): Map<string, number> {
  const validProfileIds = getValidProfileIds(profileIds);
  const counts = new Map<string, number>();
  if (validProfileIds.length === 0) return counts;

  const placeholders = validProfileIds.map(() => "?").join(", ");
  const rows = db
    .prepare(
      `
        SELECT
          guest_profile_id AS profileId,
          service_key AS serviceKey,
          COUNT(*) AS count
        FROM guest_service_bookings
        WHERE guest_profile_id IN (${placeholders})
          AND status = 'booked'
        GROUP BY guest_profile_id, service_key
      `,
    )
    .all(...validProfileIds) as ActiveServiceBookingCountRow[];

  for (const row of rows) {
    counts.set(getCountKey(row.profileId, row.serviceKey), Number(row.count));
  }

  return counts;
}

function comparePendingBookingGuests(
  a: PendingBookingGuest,
  b: PendingBookingGuest,
): number {
  if (a.isUrgent !== b.isUrgent) return a.isUrgent ? -1 : 1;

  const checkoutOrder = compareNullableText(a.checkoutDate, b.checkoutDate);
  if (checkoutOrder !== 0) return checkoutOrder;

  const roomOrder = compareNullableText(
    a.profile.roomNumber,
    b.profile.roomNumber,
  );
  if (roomOrder !== 0) return roomOrder;

  const nameOrder = a.profile.name.localeCompare(b.profile.name, undefined, {
    sensitivity: "base",
  });
  return nameOrder || a.profile.id - b.profile.id;
}

function compareNullableText(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  if (a && b) return a.localeCompare(b);
  if (a) return -1;
  if (b) return 1;
  return 0;
}

function getCountKey(profileId: number, serviceKey: ServiceBookingKey): string {
  return `${profileId}:${serviceKey}`;
}

function getValidProfileIds(profileIds: number[]): number[] {
  return [
    ...new Set(
      profileIds.filter((profileId) => Number.isInteger(profileId) && profileId > 0),
    ),
  ];
}
