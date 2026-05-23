import Link from "next/link";
import { notFound } from "next/navigation";
import { getGuestProfile, type GuestProfile } from "@/src/lib/guest-profiles";
import { GUEST_PROFILE_SECTIONS, type GuestProfileField } from "../fields";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function GuestProfileDetailPage({ params }: PageProps) {
  const { id } = await params;
  const profile = getGuestProfile(Number(id));
  if (!profile) notFound();

  return (
    <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/admin/guest-profile"
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
        <span className="w-fit rounded-md bg-surface px-3 py-2 text-sm font-medium text-ink/65">
          EDD {formatValue(profile.expectedDeliveryDate)}
        </span>
      </div>

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
      </div>
    </main>
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
