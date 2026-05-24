import Link from "next/link";
import {
  addBookingDays,
  formatBookingDate,
  isBookingDate,
} from "@/src/lib/booking-dates";
import { requireAdminUser } from "@/src/lib/admin-auth";
import {
  getGuestProfileStatus,
  getGuestProfileStatusLabel,
  getGuestProfileCheckoutDate,
  listGuestProfiles,
  listGuestProfileAddons,
  type GuestProfile,
  type GuestProfileFilterStatus,
} from "@/src/lib/guest-profiles";
import { listPackageEntitlementOptions } from "@/src/lib/package-entitlement-options";
import { createGuestProfileAction } from "./actions";
import GuestProfileForm from "./GuestProfileForm";
import GuestProfileSearchList from "./GuestProfileSearchList";

type PageProps = {
  searchParams: Promise<{
    error?: string | string[];
    new?: string | string[];
    status?: string | string[];
    success?: string | string[];
  }>;
};

const STATUS_FILTERS: GuestProfileFilterStatus[] = [
  "incoming",
  "checked_in",
  "checked_out",
];

export default async function GuestProfilePage({ searchParams }: PageProps) {
  const query = await searchParams;
  const showForm = getSingleValue(query.new) === "1";
  const error = getSingleValue(query.error);
  const success = getSingleValue(query.success);
  const user = await requireAdminUser();
  const activeStatus = getGuestProfileStatus(getSingleValue(query.status));
  const today = formatBookingDate(new Date());
  const profiles = sortGuestProfilesByEdd(
    listGuestProfiles(activeStatus, today).map((profile) => ({ ...profile })),
    today,
  );
  const canDeleteGuestProfiles = user.role === "superadmin";
  const followUpThroughDate = addBookingDays(today, 30);
  const checkedInProfiles =
    activeStatus === "checked_in"
      ? profiles
      : listGuestProfiles("checked_in", today).map((profile) => ({
          ...profile,
        }));
  const checkedInProfilesWithCheckout = checkedInProfiles.map((profile) => ({
    ...profile,
    checkoutDate: getGuestProfileCheckoutDate(
      profile,
      listGuestProfileAddons(profile.id),
    ),
  }));
  const packageOptions = showForm ? listPackageEntitlementOptions() : [];

  return (
    <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink sm:text-2xl">
            Guest Profile
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-ink/60">
            Register and review guest booking confirmation details.
          </p>
        </div>
        <Link
          href={
            showForm
              ? getGuestProfileListHref(activeStatus)
              : getNewGuestHref(activeStatus)
          }
          className="inline-flex h-9 items-center justify-center rounded-md bg-brand px-3 text-sm font-medium text-white hover:bg-brand/90"
        >
          {showForm ? "Close Form" : "New Guest"}
        </Link>
      </div>

      {!showForm && <StatusMessage error={error} success={success} />}

      {showForm && (
        <GuestProfileModal
          activeStatus={activeStatus}
          error={error}
          packageOptions={packageOptions}
        />
      )}

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Registered Guests
            </h2>
            <span className="text-xs text-ink/50">
              {profiles.length} {profiles.length === 1 ? "guest" : "guests"}
            </span>
          </div>
          <GuestProfileStatusSegmentedControl activeStatus={activeStatus} />
        </div>

        {profiles.length === 0 ? (
          <div className="rounded-lg border border-black/5 bg-surface px-6 py-10 text-center text-sm text-ink/60">
            {getEmptyStatusMessage(activeStatus)}
          </div>
        ) : (
          <GuestProfileSearchList
            activeStatus={activeStatus}
            canDeleteGuestProfiles={canDeleteGuestProfiles}
            checkedInProfiles={checkedInProfilesWithCheckout}
            followUpThroughDate={followUpThroughDate}
            profiles={profiles}
            today={today}
          />
        )}
      </section>
    </main>
  );
}

function GuestProfileModal({
  activeStatus,
  error,
  packageOptions,
}: {
  activeStatus: GuestProfileFilterStatus;
  error?: string;
  packageOptions: ReturnType<typeof listPackageEntitlementOptions>;
}) {
  const closeHref = getGuestProfileListHref(activeStatus);

  return (
    <div
      aria-labelledby="new-guest-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/35 p-3 sm:p-6"
      role="dialog"
    >
      <Link
        aria-label="Close new guest form"
        className="absolute inset-0"
        href={closeHref}
        tabIndex={-1}
      />
      <section className="relative z-10 flex min-h-0 w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-black/10 px-4 py-4 sm:px-5">
          <div>
            <h2
              className="text-base font-semibold text-ink sm:text-lg"
              id="new-guest-title"
            >
              New Guest
            </h2>
            <p className="mt-1 text-sm leading-6 text-ink/60">
              Complete one guest profile, then save to return to the registered
              guest list.
            </p>
          </div>
          <Link
            aria-label="Close form"
            className="grid size-8 shrink-0 place-items-center rounded-md text-ink/55 hover:bg-surface hover:text-ink"
            href={closeHref}
          >
            <span aria-hidden="true" className="text-xl leading-none">
              x
            </span>
          </Link>
        </div>
        <GuestProfileForm
          action={createGuestProfileAction}
          allowImport
          cancelHref={closeHref}
          notice={<StatusMessage error={error} />}
          packageOptions={packageOptions}
          submitLabel="Save Guest"
        />
      </section>
    </div>
  );
}

function GuestProfileStatusSegmentedControl({
  activeStatus,
}: {
  activeStatus: GuestProfileFilterStatus;
}) {
  return (
    <nav
      aria-label="Guest check-in status"
      className="inline-flex w-fit rounded-lg bg-surface p-1"
    >
      {STATUS_FILTERS.map((status) => (
        <Link
          key={status}
          href={getGuestProfileListHref(status)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            status === activeStatus
              ? "border border-black/5 bg-white text-ink shadow-sm"
              : "text-ink/60 hover:text-ink"
          }`}
        >
          {getGuestProfileStatusLabel(status)}
        </Link>
      ))}
    </nav>
  );
}

function StatusMessage({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  if (!error && !success) return null;

  return (
    <div
      role={error ? "alert" : "status"}
      className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
        error
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      {error ?? success}
    </div>
  );
}

function getSingleValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getGuestProfileListHref(status: GuestProfileFilterStatus): string {
  return status === "incoming"
    ? "/admin/guest-profile"
    : `/admin/guest-profile?status=${status}`;
}

function getNewGuestHref(status: GuestProfileFilterStatus): string {
  return status === "incoming"
    ? "/admin/guest-profile?new=1"
    : `/admin/guest-profile?new=1&status=${status}`;
}

function getEmptyStatusMessage(status: GuestProfileFilterStatus): string {
  if (status === "checked_out") return "No checked-out guest profiles.";
  return status === "checked_in"
    ? "No checked-in guest profiles."
    : "No incoming guests.";
}

function sortGuestProfilesByEdd(
  profiles: GuestProfile[],
  today: string,
): GuestProfile[] {
  return [...profiles].sort((a, b) => {
    const aEdd = a.expectedDeliveryDate;
    const bEdd = b.expectedDeliveryDate;
    const aValid = Boolean(aEdd && isBookingDate(aEdd));
    const bValid = Boolean(bEdd && isBookingDate(bEdd));

    if (aValid !== bValid) return aValid ? 1 : -1;

    if (aValid && bValid && aEdd && bEdd) {
      const aUpcoming = aEdd >= today;
      const bUpcoming = bEdd >= today;

      if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
      if (aEdd !== bEdd) {
        return aUpcoming ? aEdd.localeCompare(bEdd) : bEdd.localeCompare(aEdd);
      }
    }

    return b.id - a.id;
  });
}
