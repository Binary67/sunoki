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
  listGuestProfiles,
  type GuestProfile,
  type GuestProfileStatus,
} from "@/src/lib/guest-profiles";
import { createGuestProfileAction } from "./actions";
import GuestProfileDeleteForm from "./GuestProfileDeleteForm";
import GuestProfileForm from "./GuestProfileForm";

type PageProps = {
  searchParams: Promise<{
    error?: string | string[];
    new?: string | string[];
    status?: string | string[];
    success?: string | string[];
  }>;
};

const STATUS_FILTERS: GuestProfileStatus[] = ["not_checked_in", "checked_in"];

type RoomOverlapWarning = {
  guestId: number;
  guestName: string;
  throughDate: string;
};

export default async function GuestProfilePage({ searchParams }: PageProps) {
  const query = await searchParams;
  const showForm = getSingleValue(query.new) === "1";
  const error = getSingleValue(query.error);
  const success = getSingleValue(query.success);
  const user = await requireAdminUser();
  const activeStatus = getGuestProfileStatus(getSingleValue(query.status));
  const profiles = listGuestProfiles(activeStatus);
  const canDeleteGuestProfiles = user.role === "superadmin";
  const today = formatBookingDate(new Date());
  const followUpThroughDate = addBookingDays(today, 30);
  const checkedInProfiles =
    activeStatus === "checked_in" ? profiles : listGuestProfiles("checked_in");

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
        <GuestProfileModal activeStatus={activeStatus} error={error} />
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
            {activeStatus === "checked_in"
              ? "No checked-in guest profiles."
              : "No guests waiting for check-in."}
          </div>
        ) : (
          <div className="grid items-start gap-3 xl:grid-cols-2">
            {[0, 1].map((columnIndex) => (
              <div key={columnIndex} className="contents xl:grid xl:gap-3">
                {profiles.map((profile, profileIndex) =>
                  profileIndex % 2 === columnIndex ? (
                    <GuestProfileBlock
                      key={profile.id}
                      activeStatus={activeStatus}
                      canDeleteGuestProfiles={canDeleteGuestProfiles}
                      checkedInProfiles={checkedInProfiles}
                      followUpThroughDate={followUpThroughDate}
                      listOrder={profileIndex}
                      profile={profile}
                      today={today}
                    />
                  ) : null,
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function GuestProfileModal({
  activeStatus,
  error,
}: {
  activeStatus: GuestProfileStatus;
  error?: string;
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
          cancelHref={closeHref}
          notice={<StatusMessage error={error} />}
          submitLabel="Save Guest"
        />
      </section>
    </div>
  );
}

function GuestProfileBlock({
  activeStatus,
  canDeleteGuestProfiles,
  checkedInProfiles,
  followUpThroughDate,
  listOrder,
  profile,
  today,
}: {
  activeStatus: GuestProfileStatus;
  canDeleteGuestProfiles: boolean;
  checkedInProfiles: GuestProfile[];
  followUpThroughDate: string;
  listOrder: number;
  profile: GuestProfile;
  today: string;
}) {
  const profileHref = `/admin/guest-profile/${profile.id}`;
  const followUpDue = isFollowUpDue(profile, today, followUpThroughDate);
  const overlapWarnings = getRoomOverlapWarnings(profile, checkedInProfiles);

  return (
    <article
      className={`group relative rounded-lg border bg-white px-4 py-4 transition-colors hover:bg-surface ${
        overlapWarnings.length > 0
          ? "border-amber-300 hover:border-amber-400"
          : followUpDue
          ? "border-red-300 hover:border-red-400"
          : "border-black/5 hover:border-brand/30"
      }`}
      style={{ order: listOrder }}
    >
      <Link
        aria-label={`View ${profile.name}`}
        className="absolute inset-0 z-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20"
        href={profileHref}
      />
      <div className="pointer-events-none relative z-10 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-ink group-hover:text-brand group-focus-within:text-brand">
            {profile.name}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <span className="w-fit rounded-md border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-xs font-medium text-violet-700">
            EDD {formatValue(profile.expectedDeliveryDate)}
          </span>
          <span className="w-fit rounded-md border border-brand/15 bg-brand/10 px-2.5 py-1.5 text-xs font-medium text-brand">
            Room {formatValue(profile.roomNumber)}
          </span>
          <span
            className={`w-fit rounded-md px-2.5 py-1.5 text-xs font-medium ${
              profile.status === "checked_in"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-surface text-ink/60"
            }`}
          >
            {getGuestProfileStatusLabel(profile.status)}
          </span>
          {canDeleteGuestProfiles && (
            <div className="pointer-events-auto">
              <GuestProfileDeleteForm
                iconOnly
                label={profile.name}
                profileId={profile.id}
                status={activeStatus}
              />
            </div>
          )}
        </div>
      </div>
      <div className="pointer-events-none relative z-10 grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,margin,opacity] duration-200 group-hover:mt-4 group-hover:grid-rows-[1fr] group-hover:opacity-100 group-focus-within:mt-4 group-focus-within:grid-rows-[1fr] group-focus-within:opacity-100">
        <div className="min-h-0 overflow-hidden">
          <dl className="grid gap-3 sm:grid-cols-2">
            <SummaryItem label="IC Number" value={profile.icNo} />
            <SummaryItem
              label="Mother Phone Number"
              value={profile.handphoneNo}
            />
            <SummaryItem
              label="Mode of Delivery"
              value={profile.modeOfDelivery}
            />
            <SummaryItem label="Type of Package" value={profile.packageType} />
          </dl>
          {overlapWarnings.length > 0 && (
            <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-800">
              Room may overlap with{" "}
              {overlapWarnings.map((warning, index) => (
                <span key={warning.guestId}>
                  {index === 0
                    ? ""
                    : index === overlapWarnings.length - 1
                      ? " and "
                      : ", "}
                  <Link
                    className="pointer-events-auto relative z-20 font-semibold underline decoration-amber-500/60 underline-offset-2 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    href={`/admin/guest-profile/${warning.guestId}`}
                  >
                    {warning.guestName}
                  </Link>{" "}
                  until {warning.throughDate}
                </span>
              ))}
              .
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function GuestProfileStatusSegmentedControl({
  activeStatus,
}: {
  activeStatus: GuestProfileStatus;
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

function SummaryItem({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string | null;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink/45">
        {label}
      </dt>
      <dd className="mt-1 text-sm leading-6 text-ink/75">
        {formatValue(value)}
      </dd>
    </div>
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

function getGuestProfileListHref(status: GuestProfileStatus): string {
  return status === "checked_in"
    ? "/admin/guest-profile?status=checked_in"
    : "/admin/guest-profile";
}

function getNewGuestHref(status: GuestProfileStatus): string {
  return status === "checked_in"
    ? "/admin/guest-profile?new=1&status=checked_in"
    : "/admin/guest-profile?new=1";
}

function isFollowUpDue(
  profile: GuestProfile,
  today: string,
  followUpThroughDate: string,
): boolean {
  const edd = profile.expectedDeliveryDate;
  return (
    profile.status === "not_checked_in" &&
    Boolean(
      edd &&
        isBookingDate(edd) &&
        edd >= today &&
        edd <= followUpThroughDate,
    )
  );
}

function getRoomOverlapWarnings(
  profile: GuestProfile,
  checkedInProfiles: GuestProfile[],
): RoomOverlapWarning[] {
  const edd = profile.expectedDeliveryDate;
  if (!profile.roomNumber || !edd || !isBookingDate(edd)) return [];

  return checkedInProfiles.flatMap((checkedInProfile) => {
    const checkInDate = checkedInProfile.expectedDeliveryDate;
    if (
      checkedInProfile.status !== "checked_in" ||
      checkedInProfile.roomNumber !== profile.roomNumber ||
      !checkInDate ||
      !isBookingDate(checkInDate) ||
      isSameGuest(profile, checkedInProfile)
    ) {
      return [];
    }

    const throughDate = addBookingDays(checkInDate, 30);
    if (edd < checkInDate || edd > throughDate) return [];

    return [
      {
        guestId: checkedInProfile.id,
        guestName: checkedInProfile.name,
        throughDate,
      },
    ];
  });
}

function isSameGuest(a: GuestProfile, b: GuestProfile): boolean {
  return a.id === b.id || Boolean(a.icNo && b.icNo && a.icNo === b.icNo);
}

function formatValue(value: string | null | undefined): string {
  return value || "-";
}
