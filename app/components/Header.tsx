"use client";

import { usePathname } from "next/navigation";

type IconProps = { className?: string };

const BellIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9ZM10 21a2 2 0 0 0 4 0" />
  </svg>
);

const BREADCRUMB_LABELS: Record<string, string> = {
  karaoke: "KARAOKE ROOM",
  gym: "STRENGTH STUDIO",
  yoga: "YOGA STUDIO",
  lounge: "TRANQUIL LOUNGE",
};

export default function Header() {
  const pathname = usePathname();
  const facilityMatch = pathname.match(/^\/booking\/([^/]+)/);
  const sublabel = facilityMatch ? BREADCRUMB_LABELS[facilityMatch[1]] : undefined;

  return (
    <header className="h-16 shrink-0 flex items-center justify-between px-10 border-b border-black/5">
      <div className="text-[11px] tracking-[0.18em] text-black/50">
        FACILITIES
        {sublabel && (
          <>
            <span className="mx-2 text-black/30">/</span>
            {sublabel}
          </>
        )}
      </div>
      <div className="flex items-center gap-8">
        <nav className="flex items-center gap-7 text-sm">
          <button className="text-ink/60 hover:text-ink" type="button">Overview</button>
          <button
            className="relative text-brand font-medium pb-1.5 -mb-1.5 border-b-2 border-brand"
            type="button"
          >
            Facilities
          </button>
          <button className="text-ink/60 hover:text-ink" type="button">Staff</button>
        </nav>
        <button
          type="button"
          aria-label="Notifications"
          className="size-9 rounded-full grid place-items-center text-ink/70 hover:bg-surface"
        >
          <BellIcon className="size-4" />
        </button>
        <div
          aria-label="Profile"
          className="size-8 rounded-full bg-gradient-to-br from-[#c9a78b] to-[#7a5b4a] ring-2 ring-white shadow-sm"
        />
      </div>
    </header>
  );
}
