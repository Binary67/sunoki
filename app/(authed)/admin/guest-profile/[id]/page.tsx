import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminUser } from "@/src/lib/admin-auth";
import {
  formatGuestProfileAddonPrice,
  getGuestProfileAddonTotalCents,
  getGuestProfile,
  getGuestProfileStatusLabel,
  listGuestProfileAddons,
  type GuestProfile,
  type GuestProfileAddon,
  type GuestProfileStatus,
} from "@/src/lib/guest-profiles";
import { ADDITIONAL_DAYS_ADDON_NAME } from "@/src/lib/guest-profile-addons";
import {
  setGuestProfileStatusAction,
  toggleGuestProfileUserAccessAction,
  updateGuestProfileAction,
} from "../actions";
import { GUEST_PROFILE_SECTIONS, type GuestProfileField } from "../fields";
import GuestProfileDeleteForm from "../GuestProfileDeleteForm";
import GuestProfileForm from "../GuestProfileForm";

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
  const profile = getGuestProfile(Number(id));
  if (!profile) notFound();
  const addons = listGuestProfileAddons(profile.id);
  const showEdit = getSingleValue(query.edit) === "1";
  const error = getSingleValue(query.error);
  const success = getSingleValue(query.success);
  const canDeleteGuestProfiles = user.role === "superadmin";

  return (
    <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href={getGuestProfileListHref(profile.status)}
            className="text-sm font-medium text-brand hover:underline"
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
            <span
              className={`w-fit rounded-md px-3 py-2 text-sm font-medium ${
                profile.status === "checked_in"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-surface text-ink/65"
              }`}
            >
              {getGuestProfileStatusLabel(profile.status)}
            </span>
            <form action={setGuestProfileStatusAction}>
              <input type="hidden" name="profileId" value={profile.id} />
              <input
                type="hidden"
                name="targetStatus"
                value={
                  profile.status === "checked_in"
                    ? "not_checked_in"
                    : "checked_in"
                }
              />
              <button
                type="submit"
                className={
                  profile.status === "checked_in"
                    ? "h-10 rounded-md border border-red-200 px-4 text-sm font-medium text-red-700 hover:bg-red-50"
                    : "h-10 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand/90"
                }
              >
                {profile.status === "checked_in" ? "Undo Check-In" : "Check In"}
              </button>
            </form>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
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
                status={profile.status}
              />
            )}
          </div>
        </div>
      </div>

      <StatusMessage error={error} success={success} />

      {showEdit ? (
        <section className="overflow-hidden rounded-lg border border-brand/20 bg-white">
          <GuestProfileForm
            action={updateGuestProfileAction}
            addons={addons}
            cancelHref={`/admin/guest-profile/${profile.id}`}
            profile={profile}
            submitLabel="Save Changes"
          />
        </section>
      ) : (
        <div className="grid gap-5">
          {GUEST_PROFILE_SECTIONS.map((section) => (
            <section
              key={section.title}
              className="rounded-lg border border-black/5 bg-white px-4 py-5 sm:px-5"
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
            </section>
          ))}
          <GuestProfileAccountSection profile={profile} />
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
    <section className="rounded-lg border border-black/5 bg-white px-4 py-5 sm:px-5">
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
    <section className="rounded-lg border border-black/5 bg-white px-4 py-5 sm:px-5">
      <h2 className="text-base font-semibold text-ink">Addon</h2>
      {addons.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-ink/60">-</p>
      ) : (
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-ink/80">
          {addons.map((addon) => (
            <li key={addon.id}>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  {addon.serviceName}
                  {addon.serviceName === ADDITIONAL_DAYS_ADDON_NAME &&
                    addon.days && `: ${addon.days} DAYS`}
                </span>
                <span className="font-medium text-ink">
                  {formatGuestProfileAddonPrice(addon.priceCents)}
                </span>
              </div>
              {addon.remarks && (
                <p className="mt-1 whitespace-pre-line text-xs leading-5 text-ink/60">
                  {addon.remarks}
                </p>
              )}
            </li>
          ))}
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
