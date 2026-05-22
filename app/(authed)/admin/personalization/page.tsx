import {
  BRAND_DESCRIPTION_MAX_LENGTH,
  BRAND_ICON_MAX_SIZE_BYTES,
  BRAND_NAME_MAX_LENGTH,
  getBrandingSettings,
} from "@/src/lib/branding";
import BrandBlock from "@/app/components/BrandBlock";
import { updateBrandingSettingsAction } from "./actions";

type PageProps = {
  searchParams: Promise<{
    error?: string | string[];
    success?: string | string[];
  }>;
};

export default async function PersonalizationPage({
  searchParams,
}: PageProps) {
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

      <form
        action={updateBrandingSettingsAction}
        encType="multipart/form-data"
        className="max-w-3xl rounded-lg border border-black/5 bg-surface px-4 py-5 sm:px-5"
      >
        <div className="grid gap-5 md:grid-cols-[1fr_220px]">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-ink/75">
              Brand Name <span className="text-red-600">*</span>
              <input
                name="brand_name"
                type="text"
                required
                maxLength={BRAND_NAME_MAX_LENGTH}
                defaultValue={branding.brandName}
                className="mt-1 h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
              />
            </label>

            <label className="block text-sm font-medium text-ink/75">
              Brand Description <span className="text-red-600">*</span>
              <textarea
                name="brand_description"
                required
                maxLength={BRAND_DESCRIPTION_MAX_LENGTH}
                defaultValue={branding.brandDescription}
                rows={4}
                className="mt-1 w-full resize-y rounded-md border border-black/10 bg-white px-3 py-2 text-sm leading-5 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
              />
            </label>

            <label className="block text-sm font-medium text-ink/75">
              Icon
              <input
                name="icon"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="mt-1 block w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink/75 hover:file:bg-black/5"
              />
            </label>

            {branding.iconDataUrl && (
              <label className="flex items-center gap-2 text-sm font-medium text-ink/75">
                <input
                  name="remove_icon"
                  type="checkbox"
                  className="size-4 rounded border-black/20 text-brand focus:ring-brand/20"
                />
                Remove current icon
              </label>
            )}
          </div>

          <div>
            <div className="text-sm font-medium text-ink/75">Preview</div>
            <div className="mt-2 rounded-lg border border-black/5 bg-white p-4">
              <BrandBlock branding={branding} />
            </div>
            <p className="mt-3 text-xs leading-5 text-ink/55">
              PNG, JPEG, or WebP. Maximum size{" "}
              {Math.floor(BRAND_ICON_MAX_SIZE_BYTES / 1024)} KB.
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90"
          >
            Save Personalization
          </button>
        </div>
      </form>
    </main>
  );
}

function getSingleValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
