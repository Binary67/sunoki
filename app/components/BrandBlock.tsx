import Image from "next/image";

export type BrandingSettings = {
  brandName: string;
  brandDescription: string;
  iconDataUrl: string | null;
};

export default function BrandBlock({
  branding,
}: {
  branding: BrandingSettings;
}) {
  const initial = branding.brandName.trim().charAt(0).toUpperCase() || "B";

  return (
    <div className="min-w-0 flex-1">
      {branding.iconDataUrl ? (
        <div className="relative mb-2 h-12 w-full overflow-hidden rounded-md bg-surface">
          <Image
            src={branding.iconDataUrl}
            alt=""
            fill
            sizes="320px"
            unoptimized
            className="object-contain object-left"
          />
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="mb-2 grid size-9 place-items-center rounded-lg bg-brand text-sm font-semibold text-white"
        >
          {initial}
        </div>
      )}
      <div className="min-w-0 leading-tight">
        <div className="break-words text-[13px] font-semibold text-brand">
          {branding.brandName}
        </div>
        <div className="mt-0.5 whitespace-pre-line break-words text-[10px] text-black/50">
          {branding.brandDescription}
        </div>
      </div>
    </div>
  );
}
