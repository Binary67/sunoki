import { addBookingDays } from "@/src/lib/booking-dates";
import { db } from "@/src/lib/db";
import {
  listGuestProfileAddonsByProfileIds,
  type GuestProfileAddon,
} from "@/src/lib/guest-profile-addons";
import {
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
  bookedQuantity: number;
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

type ServiceBookingCountRow = {
  bookedCount: number;
  profileId: number;
  serviceKey: ServiceBookingKey;
  usedCount: number;
};

type ServiceBookingCount = {
  bookedQuantity: number;
  usedQuantity: number;
};

export function getPendingBookingGuests(today: string): PendingBookingGuest[] {
  const profiles = listGuestProfiles("checked_in", today);
  const profileIds = profiles.map((profile) => profile.id);
  const addonsByProfileId = listGuestProfileAddonsByProfileIds(profileIds);
  const countsByProfileService = listServiceBookingCountsByProfileIds(profileIds);
  const urgentThroughDate = addBookingDays(today, 7);

  return profiles
    .map((profile) => {
      const addons = addonsByProfileId.get(profile.id) ?? [];
      const checkoutDate = profile.checkoutDate;
      const snapshot = parsePackageEntitlementSnapshot(
        profile.packageEntitlementSnapshotJson,
      );
      const services = getPendingServiceQuotas(
        profile,
        snapshot,
        addons,
        countsByProfileService,
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
  countsByProfileService: Map<string, ServiceBookingCount>,
): PendingBookingServiceQuota[] {
  return BOOKABLE_PACKAGE_SERVICES.flatMap((service) => {
    const packageQuantity = getPackageServiceQuantity(snapshot, service.key);
    if (packageQuantity === UNLIMITED_PACKAGE_SERVICE_QUANTITY) return [];

    const purchasedPerkQuantity = getPurchasedPerkQuantity(addons, service.name);
    const totalQuantity = packageQuantity + purchasedPerkQuantity;
    if (totalQuantity <= 0) return [];

    const counts = countsByProfileService.get(
      getCountKey(profile.id, service.key),
    ) ?? { bookedQuantity: 0, usedQuantity: 0 };
    const usedQuantity = counts.usedQuantity;
    const remainingQuantity = Math.max(0, totalQuantity - usedQuantity);
    if (remainingQuantity <= 0) return [];

    return [
      {
        bookedQuantity: counts.bookedQuantity,
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

function listServiceBookingCountsByProfileIds(
  profileIds: number[],
): Map<string, ServiceBookingCount> {
  const validProfileIds = getValidProfileIds(profileIds);
  const counts = new Map<string, ServiceBookingCount>();
  if (validProfileIds.length === 0) return counts;

  const placeholders = validProfileIds.map(() => "?").join(", ");
  const rows = db
    .prepare(
      `
        SELECT
          guest_profile_id AS profileId,
          service_key AS serviceKey,
          COUNT(*) AS bookedCount,
          SUM(CASE WHEN admin_done = 1 THEN 1 ELSE 0 END) AS usedCount
        FROM guest_service_bookings
        WHERE guest_profile_id IN (${placeholders})
          AND status = 'booked'
        GROUP BY guest_profile_id, service_key
      `,
    )
    .all(...validProfileIds) as ServiceBookingCountRow[];

  for (const row of rows) {
    counts.set(getCountKey(row.profileId, row.serviceKey), {
      bookedQuantity: Number(row.bookedCount),
      usedQuantity: Number(row.usedCount),
    });
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
