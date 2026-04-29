"use client";

import { usePathname } from "next/navigation";
import UserMenu from "./UserMenu";

const BREADCRUMB_LABELS: Record<string, string> = {
  karaoke: "KARAOKE ROOM",
  gym: "STRENGTH STUDIO",
  yoga: "YOGA STUDIO",
  lounge: "TRANQUIL LOUNGE",
};

export default function Header({ user }: { user: { username: string } }) {
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
      <UserMenu username={user.username} />
    </header>
  );
}
