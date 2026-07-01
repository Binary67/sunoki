import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminUser } from "@/src/lib/admin-auth";
import {
  listGuestBookingChecklist,
  type GuestBookingChecklistItem,
} from "@/src/lib/guest-bookings";
import {
  formatGuestProfileAddonPrice,
  getGuestProfileAddonLineTotalCents,
  getGuestProfileAddonTotalCents,
  getGuestProfile,
  getGuestProfileCheckoutDate,
  getGuestProfileComputedStatus,
  getGuestProfileStatusLabel,
  listGuestProfileAddons,
  type GuestProfile,
  type GuestProfileAddon,
  type GuestProfileFilterStatus,
} from "@/src/lib/guest-profiles";
import { ADDITIONAL_DAYS_ADDON_NAME } from "@/src/lib/guest-profile-addons";
import { waitForSkeletonLoadingDelay } from "@/src/lib/loading-delay";
import {
  listPackageEntitlementOptions,
  parsePackageEntitlementSnapshot,
} from "@/src/lib/package-entitlement-options";
import {
  setGuestProfileStatusAction,
  toggleGuestProfileUserAccessAction,
  updateGuestProfileAction,
} from "../actions";
import { GUEST_PROFILE_SECTIONS, type GuestProfileField } from "../fields";
import GuestBookingStatusCheckbox from "../GuestBookingStatusCheckbox";
import GuestProfileDeleteForm from "../GuestProfileDeleteForm";
import GuestProfileForm from "../GuestProfileForm";
import GuestProfileToast from "../GuestProfileToast";
import GuestPackageServicesList from "../GuestPackageServicesList";
import PrintGuestProfileButton from "./PrintGuestProfileButton";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    edit?: string | string[];
    error?: string | string[];
    success?: string | string[];
  }>;
};

export default async function GuestProfileDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const user = await requireAdminUser();
  const showEdit = getSingleValue(query.edit) === "1";
  const profile = getGuestProfile(Number(id));
  if (!profile) notFound();
  await waitForSkeletonLoadingDelay();

  const addons = listGuestProfileAddons(profile.id);
  const bookings = showEdit ? [] : listGuestBookingChecklist(profile.id);
  const displayStatus = getGuestProfileComputedStatus(profile);
  const checkoutDate = getGuestProfileCheckoutDate(profile);
  const error = getSingleValue(query.error);
  const success = getSingleValue(query.success);
  const canDeleteGuestProfiles = user.role === "superadmin";
  const packageOptions = showEdit ? listPackageEntitlementOptions() : [];
  const packageSnapshot = parsePackageEntitlementSnapshot(
    profile.packageEntitlementSnapshotJson,
  );
  const isCheckInAction = profile.status !== "checked_in";
  const checkInDisabled = isCheckInAction && !profile.roomNumber?.trim();
  const generatedAt = formatPrintDateTime(new Date());

  return (
    <main className="guest-profile-print-page flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <style>{`
        .guest-profile-print-only {
          display: none;
        }

        @media print {
          @page {
            margin: 10mm;
          }

          body:has(.guest-profile-print-page) {
            background: #fff;
          }

          body:has(.guest-profile-print-page) aside,
          body:has(.guest-profile-print-page) header,
          body:has(.guest-profile-print-page) .guest-profile-screen-only,
          body:has(.guest-profile-print-page) .guest-profile-print-hidden {
            display: none !important;
          }

          body:has(.guest-profile-print-page) .h-screen {
            height: auto !important;
          }

          body:has(.guest-profile-print-page) .overflow-hidden,
          body:has(.guest-profile-print-page) .overflow-x-auto,
          body:has(.guest-profile-print-page) .overflow-y-auto {
            overflow: visible !important;
          }

          body:has(.guest-profile-print-page) .guest-profile-print-page {
            color: #000;
            padding: 0 !important;
          }

          body:has(.guest-profile-print-page) .guest-profile-print-only {
            display: block !important;
          }

          body:has(.guest-profile-print-page) .guest-profile-print-header {
            border-bottom: 1px solid #1d1d1f;
            margin-bottom: 8mm;
            padding-bottom: 7mm;
          }

          body:has(.guest-profile-print-page) .guest-profile-print-header-top {
            align-items: flex-start;
            display: flex;
            gap: 8mm;
            justify-content: space-between;
          }

          body:has(.guest-profile-print-page) .guest-profile-print-kicker {
            color: #666;
            font-size: 8pt;
            font-weight: 700;
            letter-spacing: 0.16em;
            margin: 0 0 2mm;
            text-transform: uppercase;
          }

          body:has(.guest-profile-print-page) .guest-profile-print-title {
            color: #111;
            font-size: 20pt;
            font-weight: 700;
            line-height: 1.1;
            margin: 0;
          }

          body:has(.guest-profile-print-page) .guest-profile-print-generated {
            color: #444;
            font-size: 9pt;
            font-weight: 600;
            line-height: 1.45;
            margin: 0;
            text-align: right;
          }

          body:has(.guest-profile-print-page) .guest-profile-print-generated span {
            color: #777;
            display: block;
            font-size: 7.5pt;
            font-weight: 700;
            letter-spacing: 0.14em;
            text-transform: uppercase;
          }

          body:has(.guest-profile-print-page) .guest-profile-print-summary {
            border: 1px solid #bbb;
            display: grid;
            gap: 0;
            grid-template-columns: 1fr 1fr;
            margin: 6mm 0 0;
          }

          body:has(.guest-profile-print-page) .guest-profile-print-summary-group {
            padding: 4mm;
          }

          body:has(.guest-profile-print-page) .guest-profile-print-summary-group + .guest-profile-print-summary-group {
            border-left: 1px solid #bbb;
          }

          body:has(.guest-profile-print-page) .guest-profile-print-summary-heading {
            color: #111;
            font-size: 8.5pt;
            font-weight: 700;
            letter-spacing: 0.12em;
            margin: 0 0 3mm;
            text-transform: uppercase;
          }

          body:has(.guest-profile-print-page) .guest-profile-print-meta {
            display: grid;
            gap: 3mm 6mm;
            grid-template-columns: 1fr 1fr;
          }

          body:has(.guest-profile-print-page) .guest-profile-print-meta div {
            min-width: 0;
          }

          body:has(.guest-profile-print-page) .guest-profile-print-meta dt {
            color: #777;
            font-size: 7.5pt;
            font-weight: 700;
            letter-spacing: 0.14em;
            margin: 0 0 1.5mm;
            text-transform: uppercase;
          }

          body:has(.guest-profile-print-page) .guest-profile-print-meta dd {
            color: #111;
            font-size: 10pt;
            font-weight: 600;
            margin: 0;
          }

          body:has(.guest-profile-print-page) .guest-profile-print-section {
            break-inside: avoid;
            border-color: #bbb !important;
            box-shadow: none !important;
          }

          body:has(.guest-profile-print-page) .guest-profile-print-table {
            min-width: 0 !important;
          }
        }
      `}</style>
      <GuestProfileToast error={error} success={success} />
      <section className="guest-profile-print-only guest-profile-print-header">
        <div className="guest-profile-print-header-top">
          <div>
            <p className="guest-profile-print-kicker">Guest Profile Reference</p>
            <h1 className="guest-profile-print-title">{profile.name}</h1>
          </div>
          <p className="guest-profile-print-generated">
            <span>Generated</span>
            {generatedAt}
          </p>
        </div>
        <div className="guest-profile-print-summary">
          <section className="guest-profile-print-summary-group">
            <h2 className="guest-profile-print-summary-heading">Profile</h2>
            <dl className="guest-profile-print-meta">
              <div>
                <dt>Room</dt>
                <dd>{formatValue(profile.roomNumber)}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{getGuestProfileStatusLabel(displayStatus)}</dd>
              </div>
              <div>
                <dt>Registered</dt>
                <dd>{profile.createdAt}</dd>
              </div>
            </dl>
          </section>
          <section className="guest-profile-print-summary-group">
            <h2 className="guest-profile-print-summary-heading">Stay Dates</h2>
            <dl className="guest-profile-print-meta">
              <div>
                <dt>EDD</dt>
                <dd>{formatValue(profile.expectedDeliveryDate)}</dd>
              </div>
              <div>
                <dt>Check In</dt>
                <dd>{formatValue(profile.checkInDate)}</dd>
              </div>
              <div>
                <dt>Checkout</dt>
                <dd>{formatValue(checkoutDate)}</dd>
              </div>
            </dl>
          </section>
        </div>
      </section>
      <div className="guest-profile-print-hidden mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href={getGuestProfileListHref(displayStatus)}
            className="guest-profile-screen-only text-sm font-medium text-brand hover:underline"
          >
            Back to Guest Profile
          </Link>
          <h1 className="mt-3 text-xl font-semibold text-ink sm:text-2xl">
            {profile.name}
          </h1>
          <p className="mt-1 text-sm leading-6 text-ink/60">
            Registered {profile.createdAt}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <span className="w-fit rounded-md bg-surface px-3 py-2 text-sm font-medium text-ink/65">
              EDD {formatValue(profile.expectedDeliveryDate)}
            </span>
            {profile.checkInDate && (
              <span className="w-fit rounded-md bg-surface px-3 py-2 text-sm font-medium text-ink/65">
                Check In {profile.checkInDate}
              </span>
            )}
            {checkoutDate && (
              <span className="w-fit rounded-md bg-surface px-3 py-2 text-sm font-medium text-ink/65">
                Checkout {checkoutDate}
              </span>
            )}
            <span
              className={`w-fit rounded-md px-3 py-2 text-sm font-medium ${
                displayStatus === "checked_in"
                  ? "bg-emerald-50 text-emerald-700"
                  : displayStatus === "checked_out"
                    ? "bg-amber-50 text-amber-800"
                    : "bg-surface text-ink/65"
              }`}
            >
              {getGuestProfileStatusLabel(displayStatus)}
            </span>
          </div>
          <div className="guest-profile-screen-only flex flex-wrap items-center gap-2 sm:justify-end">
            {!showEdit && <PrintGuestProfileButton />}
            <form action={setGuestProfileStatusAction}>
              <input type="hidden" name="profileId" value={profile.id} />
              <input
                type="hidden"
                name="targetStatus"
                value={
                  profile.status === "checked_in" ? "incoming" : "checked_in"
                }
              />
              <button
                disabled={checkInDisabled}
                type="submit"
                title={
                  checkInDisabled
                    ? "Room Number is required before check-in."
                    : undefined
                }
                className={
                  profile.status === "checked_in"
                    ? "h-9 rounded-md border border-red-200 px-3 text-sm font-medium text-red-700 hover:bg-red-50"
                    : checkInDisabled
                      ? "h-9 cursor-not-allowed rounded-md bg-brand/45 px-3 text-sm font-medium text-white"
                    : "h-9 rounded-md bg-brand px-3 text-sm font-medium text-white hover:bg-brand/90"
                }
              >
                {profile.status === "checked_in" ? "Undo Check-In" : "Check In"}
              </button>
            </form>
            <Link
              href={
                showEdit
                  ? `/admin/guest-profile/${profile.id}`
                  : `/admin/guest-profile/${profile.id}?edit=1`
              }
              className="inline-flex h-9 items-center rounded-md border border-black/10 px-3 text-sm font-medium text-ink/70 hover:bg-surface"
            >
              {showEdit ? "Close Edit" : "Edit"}
            </Link>
            {canDeleteGuestProfiles && (
              <GuestProfileDeleteForm
                label={profile.name}
                profileId={profile.id}
                status={displayStatus}
              />
            )}
          </div>
        </div>
      </div>

      <div className="guest-profile-screen-only">
        <StatusMessage error={error} success={success} />
      </div>

      {showEdit ? (
        <section className="overflow-hidden rounded-lg border border-brand/20 bg-white">
          <GuestProfileForm
            action={updateGuestProfileAction}
            addons={addons}
            cancelHref={`/admin/guest-profile/${profile.id}`}
            packageOptions={packageOptions}
            profile={profile}
            submitLabel="Save Changes"
          />
        </section>
      ) : (
        <div className="grid gap-5">
          {GUEST_PROFILE_SECTIONS.map((section) => (
            <section
              key={section.title}
              className="guest-profile-print-section rounded-lg border border-black/5 bg-white px-4 py-5 sm:px-5"
            >
              <h2 className="text-base font-semibold text-ink">
                {section.title}
              </h2>
              <dl className="mt-4 grid gap-4 md:grid-cols-2">
                {section.fields.map((field) => (
                  <ProfileDetailItem
                    key={field.name}
                    field={field}
                    profile={profile}
                  />
                ))}
              </dl>
              {section.title === "Package" && (
                <GuestPackageServicesList
                  className="mt-5"
                  emptyMessage="No package service snapshot saved."
                  snapshot={packageSnapshot}
                />
              )}
            </section>
          ))}
          <GuestProfileAccountSection profile={profile} />
          <GuestProfileBookingsSection
            bookings={bookings}
            profileId={profile.id}
          />
          <GuestProfileAddonSection addons={addons} />
        </div>
      )}
    </main>
  );
}

function GuestProfileAccountSection({ profile }: { profile: GuestProfile }) {
  const hasLinkedAccount = Boolean(profile.userId);
  const accountStatus =
    profile.accountActive === 1
      ? "Active"
      : hasLinkedAccount
        ? "Inactive"
        : "Not created";

  return (
    <section className="guest-profile-print-hidden rounded-lg border border-black/5 bg-white px-4 py-5 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">Account Access</h2>
          <dl className="mt-4 grid gap-4 md:grid-cols-2">
            <ProfileValue label="Username" value={profile.accountUsername} />
            <ProfileValue label="Access Status" value={accountStatus} />
          </dl>
        </div>
        {profile.userId && (
          <form action={toggleGuestProfileUserAccessAction}>
            <input type="hidden" name="profileId" value={profile.id} />
            <button
              type="submit"
              className={
                profile.accountActive === 1
                  ? "h-10 rounded-md border border-red-200 px-4 text-sm font-medium text-red-700 hover:bg-red-50"
                  : "h-10 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand/90"
              }
            >
              {profile.accountActive === 1
                ? "Deactivate Account"
                : "Reactivate Account"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

function GuestProfileBookingsSection({
  bookings,
  profileId,
}: {
  bookings: GuestBookingChecklistItem[];
  profileId: number;
}) {
  return (
    <section className="guest-profile-print-section rounded-lg border border-black/5 bg-white px-4 py-5 sm:px-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-base font-semibold text-ink">Bookings</h2>
        <span className="text-xs text-ink/50">
          {bookings.length} {bookings.length === 1 ? "booking" : "bookings"}
        </span>
      </div>
      {bookings.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-ink/60">-</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-black/5">
          <table className="guest-profile-print-table w-full min-w-[760px] text-sm">
            <thead className="bg-surface text-[11px] uppercase tracking-[0.14em] text-ink/45">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Booking</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Time</th>
                <th className="px-4 py-3 text-center font-medium">Read</th>
                <th className="px-4 py-3 text-center font-medium">Done</th>
                <th className="px-4 py-3 text-left font-medium">Done At</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr
                  className="border-t border-black/5 text-ink/75"
                  key={`${booking.type}-${booking.id}`}
                >
                  <td className="px-4 py-3 capitalize">{booking.type}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{booking.name}</div>
                    {booking.detail && (
                      <div className="mt-0.5 text-xs text-ink/50">
                        {booking.detail}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">{booking.bookingDate}</td>
                  <td className="px-4 py-3">{booking.bookingTime}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <GuestBookingStatusCheckbox
                        bookingId={booking.id}
                        bookingType={booking.type}
                        checked={booking.isRead}
                        disabled={booking.isDone}
                        field="read"
                        label={`Mark ${booking.name} as read`}
                        profileId={profileId}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <GuestBookingStatusCheckbox
                        bookingId={booking.id}
                        bookingType={booking.type}
                        checked={booking.isDone}
                        disabled={!booking.isRead}
                        field="done"
                        label={`Mark ${booking.name} as done`}
                        profileId={profileId}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink/60">
                    {formatValue(booking.doneAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ProfileValue({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink/45">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink/80">
        {formatValue(value)}
      </dd>
    </div>
  );
}

function GuestProfileAddonSection({
  addons,
}: {
  addons: GuestProfileAddon[];
}) {
  const totalCents = getGuestProfileAddonTotalCents(addons);

  return (
    <section className="guest-profile-print-section rounded-lg border border-black/5 bg-white px-4 py-5 sm:px-5">
      <h2 className="text-base font-semibold text-ink">Addon</h2>
      {addons.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-ink/60">-</p>
      ) : (
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-ink/80">
          {addons.map((addon) => {
            const isAdditionalDays =
              addon.serviceName === ADDITIONAL_DAYS_ADDON_NAME;

            return (
              <li key={addon.id}>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div className="grid gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>
                        {addon.serviceName}
                        {isAdditionalDays &&
                          addon.days &&
                          `: ${addon.days} DAYS`}
                      </span>
                      {!isAdditionalDays && (
                        <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-ink/50">
                          {addon.category === "sunoki"
                            ? "Purchased Perk"
                            : "Sunoki"}
                        </span>
                      )}
                    </div>
                    {!isAdditionalDays && (
                      <span className="text-xs leading-5 text-ink/55">
                        Qty {addon.quantity} x{" "}
                        {formatGuestProfileAddonPrice(addon.priceCents)}
                      </span>
                    )}
                  </div>
                  <span className="font-medium text-ink">
                    {formatGuestProfileAddonPrice(
                      getGuestProfileAddonLineTotalCents(addon),
                    )}
                  </span>
                </div>
                {addon.remarks && (
                  <p className="mt-1 whitespace-pre-line text-xs leading-5 text-ink/60">
                    {addon.remarks}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-4 flex items-center justify-between gap-4 border-t border-black/10 pt-4 text-sm">
        <span className="font-medium text-ink/65">Total Addon</span>
        <span className="font-semibold text-ink">
          {formatGuestProfileAddonPrice(totalCents)}
        </span>
      </div>
    </section>
  );
}

function ProfileDetailItem({
  field,
  profile,
}: {
  field: GuestProfileField;
  profile: GuestProfile;
}) {
  return (
    <div className={field.multiline ? "md:col-span-2" : ""}>
      <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink/45">
        {field.label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink/80">
        {formatValue(field.value(profile))}
      </dd>
    </div>
  );
}

function formatValue(value: string | null | undefined): string {
  return value || "-";
}

function formatPrintDateTime(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hour = date.getHours();
  const minute = String(date.getMinutes()).padStart(2, "0");
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${day}/${month}/${year}, ${displayHour}:${minute} ${period}`;
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
