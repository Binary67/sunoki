import {
  BRAND_DESCRIPTION_MAX_LENGTH,
  BRAND_ICON_MAX_SIZE_BYTES,
  BRAND_NAME_MAX_LENGTH,
  getBrandingSettings,
} from "@/src/lib/branding";
import { waitForSkeletonLoadingDelay } from "@/src/lib/loading-delay";
import { updateBrandingSettingsAction } from "./actions";
import PersonalizationForm from "./PersonalizationForm";

type PageProps = {
  searchParams: Promise<{
    error?: string | string[];
    success?: string | string[];
  }>;
};

export default async function PersonalizationPage({
  searchParams,
}: PageProps) {
  await waitForSkeletonLoadingDelay();

  const branding = getBrandingSettings();
  const query = await searchParams;
  const error = getSingleValue(query.error);
  const success = getSingleValue(query.success);

  return (
    <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <div className="mb-7">
        <h1 className="text-xl font-semibold text-ink sm:text-2xl">
          Personalization
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-ink/60">
          Configure the brand shown in the top-left app header and sign-in
          screen.
        </p>
      </div>

      {(error || success) && (
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
      )}

      <PersonalizationForm
        branding={branding}
        brandDescriptionMaxLength={BRAND_DESCRIPTION_MAX_LENGTH}
        brandIconMaxSizeKb={Math.floor(BRAND_ICON_MAX_SIZE_BYTES / 1024)}
        brandNameMaxLength={BRAND_NAME_MAX_LENGTH}
        saveAction={updateBrandingSettingsAction}
      />
    </main>
  );
}

function getSingleValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
