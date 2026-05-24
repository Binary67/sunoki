"use client";

import { usePathname } from "next/navigation";
import UserMenu from "./UserMenu";

const BREADCRUMB_LABELS: Record<string, string> = {
  karaoke: "KARAOKE ROOM",
  gym: "STRENGTH STUDIO",
  yoga: "YOGA STUDIO",
  lounge: "TRANQUIL LOUNGE",
};

function getSectionLabel(pathname: string): string {
  if (pathname === "/") return "DASHBOARD";
  if (pathname === "/admin/data" || pathname === "/admin/data/users") {
    return "ADMIN / DATA EDITOR / USERS";
  }
  if (pathname === "/admin/data/facilities") {
    return "ADMIN / DATA EDITOR / FACILITIES";
  }
  if (pathname === "/admin/data/packages") {
    return "ADMIN / DATA EDITOR / PACKAGES";
  }
  if (pathname === "/admin/data/backup") {
    return "ADMIN / DATA EDITOR / BACKUP & RESTORE";
  }
  if (pathname === "/admin/kitchen") return "ADMIN / KITCHEN";
  if (pathname === "/admin/audit-log") return "ADMIN / AUDIT LOG";
  if (pathname === "/admin/personalization") return "ADMIN / PERSONALIZATION";

  const facilityMatch = pathname.match(/^\/booking\/([^/]+)/);
  if (facilityMatch) {
    const facilityLabel = BREADCRUMB_LABELS[facilityMatch[1]];
    return facilityLabel ? `FACILITIES / ${facilityLabel}` : "FACILITIES";
  }

  return "FACILITIES";
}

export default function Header({
  user,
  onMenuClick,
}: {
  user: { username: string };
  onMenuClick: () => void;
}) {
  const pathname = usePathname();
  const sectionLabel = getSectionLabel(pathname);

  return (
    <header className="h-16 shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-10 border-b border-black/5">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="lg:hidden size-9 -ml-1 grid place-items-center rounded-md text-ink/70 hover:bg-surface"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-5"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="text-[11px] tracking-[0.18em] text-black/50 truncate min-w-0">
          {sectionLabel}
        </div>
      </div>
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm font-medium text-ink/70 capitalize truncate max-w-[120px] sm:max-w-none">
          {user.username}
        </span>
        <UserMenu username={user.username} />
      </div>
    </header>
  );
}
