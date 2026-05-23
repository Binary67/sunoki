import Link from "next/link";
import { listGuestProfiles, type GuestProfile } from "@/src/lib/guest-profiles";
import { createGuestProfileAction } from "./actions";
import { GUEST_PROFILE_SECTIONS, type GuestProfileField } from "./fields";

type PageProps = {
  searchParams: Promise<{
    error?: string | string[];
    new?: string | string[];
    success?: string | string[];
  }>;
};

export default async function GuestProfilePage({ searchParams }: PageProps) {
  const query = await searchParams;
  const showForm = getSingleValue(query.new) === "1";
  const error = getSingleValue(query.error);
  const success = getSingleValue(query.success);
  const profiles = listGuestProfiles();

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
          href={showForm ? "/admin/guest-profile" : "/admin/guest-profile?new=1"}
          className="inline-flex h-9 items-center justify-center rounded-md bg-brand px-3 text-sm font-medium text-white hover:bg-brand/90"
        >
          {showForm ? "Close Form" : "New Guest"}
        </Link>
      </div>

      {!showForm && <StatusMessage error={error} success={success} />}

      {showForm && <GuestProfileModal error={error} />}

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-ink">
            Registered Guests
          </h2>
          <span className="text-xs text-ink/50">
            {profiles.length} {profiles.length === 1 ? "guest" : "guests"}
          </span>
        </div>

        {profiles.length === 0 ? (
          <div className="rounded-lg border border-black/5 bg-surface px-6 py-10 text-center text-sm text-ink/60">
            No guest profiles registered.
          </div>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {profiles.map((profile) => (
              <GuestProfileBlock key={profile.id} profile={profile} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function GuestProfileModal({ error }: { error?: string }) {
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
        href="/admin/guest-profile"
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
            href="/admin/guest-profile"
          >
            <span aria-hidden="true" className="text-xl leading-none">
              x
            </span>
          </Link>
        </div>
        <form
          action={createGuestProfileAction}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="grid gap-5 overflow-y-auto bg-surface px-4 py-5 sm:px-5">
            <StatusMessage error={error} />
            {GUEST_PROFILE_SECTIONS.map((section) => (
              <fieldset
                key={section.title}
                className="rounded-lg border border-black/5 bg-white px-4 py-4"
              >
                <legend className="px-1 text-sm font-semibold text-ink">
                  {section.title}
                </legend>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  {section.fields.map((field) => (
                    <GuestProfileInput key={field.name} field={field} />
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
          <div className="flex justify-end gap-3 border-t border-black/10 bg-white px-4 py-4 sm:px-5">
            <Link
              href="/admin/guest-profile"
              className="inline-flex h-10 items-center justify-center rounded-md border border-black/10 px-4 text-sm font-medium text-ink/70 hover:bg-surface"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="h-10 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand/90"
            >
              Save Guest
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function GuestProfileInput({ field }: { field: GuestProfileField }) {
  const required = field.name === "name";
  const date = field.name === "expected_delivery_date";
  const className =
    "mt-1 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";

  return (
    <label
      className={`block text-sm font-medium text-ink/75 ${
        field.multiline ? "md:col-span-2" : ""
      }`}
      htmlFor={`guest-${field.name}`}
    >
      {field.label} {required && <span className="text-red-600">*</span>}
      {field.multiline ? (
        <textarea
          id={`guest-${field.name}`}
          name={field.name}
          rows={4}
          className={`${className} min-h-24 py-2`}
        />
      ) : (
        <input
          id={`guest-${field.name}`}
          name={field.name}
          type={date ? "date" : "text"}
          required={required}
          className={`${className} h-10`}
        />
      )}
    </label>
  );
}

function GuestProfileBlock({ profile }: { profile: GuestProfile }) {
  return (
    <Link
      href={`/admin/guest-profile/${profile.id}`}
      className="block rounded-lg border border-black/5 bg-white px-4 py-4 transition-colors hover:border-brand/30 hover:bg-surface"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-ink">{profile.name}</h3>
          <p className="mt-1 text-sm text-ink/60">
            {formatValue(profile.handphoneNo)}
          </p>
        </div>
        <span className="w-fit rounded-md bg-surface px-2.5 py-1.5 text-xs font-medium text-ink/60">
          EDD {formatValue(profile.expectedDeliveryDate)}
        </span>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <SummaryItem label="Package" value={profile.packageType} />
        <SummaryItem label="Consultant" value={profile.consultantName} />
        <SummaryItem
          label="Medical / Food Notes"
          value={truncateText(profile.medicalFoodNotes)}
          wide
        />
      </dl>
    </Link>
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

function truncateText(value: string | null): string | null {
  if (!value || value.length <= 140) return value;
  return `${value.slice(0, 137)}...`;
}

function formatValue(value: string | null | undefined): string {
  return value || "-";
}
