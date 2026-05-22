"use client";

import { useRef, useState } from "react";
import BrandBlock, { type BrandingSettings } from "@/app/components/BrandBlock";

type PersonalizationFormProps = {
  branding: BrandingSettings;
  brandDescriptionMaxLength: number;
  brandIconMaxSizeKb: number;
  brandNameMaxLength: number;
  saveAction: (formData: FormData) => void | Promise<void>;
};

type PreviewState = {
  branding: BrandingSettings;
  source: BrandingSettings;
};

export default function PersonalizationForm({
  branding,
  brandDescriptionMaxLength,
  brandIconMaxSizeKb,
  brandNameMaxLength,
  saveAction,
}: PersonalizationFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [previewState, setPreviewState] = useState<PreviewState | null>(null);
  const previewBranding =
    previewState?.source === branding ? previewState.branding : branding;

  function handlePreviewClick() {
    const form = formRef.current;
    if (!form || !form.reportValidity()) return;

    const formData = new FormData(form);
    const iconInput = form.elements.namedItem("icon");
    const iconFile =
      iconInput instanceof HTMLInputElement ? iconInput.files?.[0] : null;
    const nextBranding: BrandingSettings = {
      brandName: String(formData.get("brand_name") ?? ""),
      brandDescription: String(formData.get("brand_description") ?? ""),
      iconDataUrl:
        formData.get("remove_icon") === "on" ? null : branding.iconDataUrl,
    };

    if (iconFile && iconFile.size > 0) {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setPreviewState({
          branding: {
            ...nextBranding,
            iconDataUrl:
              typeof reader.result === "string"
                ? reader.result
                : nextBranding.iconDataUrl,
          },
          source: branding,
        });
      });
      reader.addEventListener("error", () => {
        setPreviewState({ branding: nextBranding, source: branding });
      });
      reader.readAsDataURL(iconFile);
      return;
    }

    setPreviewState({ branding: nextBranding, source: branding });
  }

  return (
    <form
      ref={formRef}
      action={saveAction}
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
              maxLength={brandNameMaxLength}
              defaultValue={branding.brandName}
              className="mt-1 h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </label>

          <label className="block text-sm font-medium text-ink/75">
            Brand Description <span className="text-red-600">*</span>
            <textarea
              name="brand_description"
              required
              maxLength={brandDescriptionMaxLength}
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
            <BrandBlock branding={previewBranding} />
          </div>
          <p className="mt-3 text-xs leading-5 text-ink/55">
            PNG, JPEG, or WebP. Maximum size {brandIconMaxSizeKb} KB.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={handlePreviewClick}
          className="rounded-md border border-black/10 bg-white px-4 py-2 text-sm font-medium text-ink/75 hover:bg-black/5"
        >
          View Preview
        </button>
        <button
          type="submit"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90"
        >
          Save Personalization
        </button>
      </div>
    </form>
  );
}
