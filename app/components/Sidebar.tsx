"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isAdminRole, type UserRole } from "@/src/lib/roles";
import BrandBlock, { type BrandingSettings } from "./BrandBlock";

type IconProps = { className?: string };

const HomeIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
  </svg>
);

const DatabaseIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <ellipse cx="12" cy="5" rx="7" ry="3" />
    <path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
    <path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
  </svg>
);

const GuestProfileIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18.5z" />
    <circle cx="10" cy="9" r="2.2" />
    <path d="M7 15c.7-1.5 1.7-2.2 3-2.2s2.3.7 3 2.2M15 8h2M15 12h2M15 16h2" />
  </svg>
);

const KitchenIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 10h14l-1 8.5A2.7 2.7 0 0 1 15.3 21H8.7A2.7 2.7 0 0 1 6 18.5z" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3M4 10h16M9 3c-.6-.8-1.4-1.2-2.5-1.2M15 3c.6-.8 1.4-1.2 2.5-1.2" />
  </svg>
);

const LogIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 3h9l3 3v15H6z" />
    <path d="M14 3v4h4M9 11h6M9 15h6M9 19h3" />
  </svg>
);

const SettingsIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .4 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.4 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .4-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.4-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.4 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.4l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.4 1.9 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </svg>
);

const ChevronIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

const CloseIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 6l12 12M6 18 18 6" />
  </svg>
);

const dataChildren: {
  label: string;
  href: string;
  superadminOnly?: boolean;
}[] = [
  { label: "Users", href: "/admin/data/users" },
  { label: "Facilities", href: "/admin/data/facilities" },
  {
    label: "Services",
    href: "/admin/data/packages",
  },
  {
    label: "Booking Counts",
    href: "/admin/data/booking-counts",
  },
  {
    label: "Backup & Restore",
    href: "/admin/data/backup",
    superadminOnly: true,
  },
];

function getDisclosureResetKey(pathname: string): string {
  if (pathname.startsWith("/admin/data")) return "admin-data";
  return "default";
}

export default function Sidebar({
  branding,
  role,
  mobileOpen,
  onClose,
}: {
  branding: BrandingSettings;
  role: UserRole;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const disclosureResetKey = getDisclosureResetKey(pathname);
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      onClose();
    }
  }, [pathname, onClose]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen, onClose]);

  return (
    <>
      {mobileOpen && (
        <div
          aria-hidden="true"
          onClick={onClose}
          className="lg:hidden fixed inset-0 bg-black/40 z-30"
        />
      )}
      <aside
        className={`${
          mobileOpen ? "flex" : "hidden lg:flex"
        } fixed inset-y-0 left-0 z-40 w-56 shrink-0 border-r border-black/5 bg-white flex-col px-4 py-6 lg:static`}
      >
        <div className="flex items-start gap-2 px-2">
          <BrandBlock branding={branding} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="lg:hidden size-7 -mt-1 -mr-1 grid place-items-center rounded-md text-ink/60 hover:bg-surface"
          >
            <CloseIcon className="size-4" />
          </button>
        </div>

        <SidebarNav
          key={disclosureResetKey}
          pathname={pathname}
          role={role}
        />
      </aside>
    </>
  );
}

function SidebarNav({
  pathname,
  role,
}: {
  pathname: string;
  role: UserRole;
}) {
  const inData = pathname.startsWith("/admin/data");
  const [dataOpen, setDataOpen] = useState(inData);
  const dashboardActive = pathname === "/";
  const dataActive = inData;
  const guestProfileActive = pathname.startsWith("/admin/guest-profile");
  const kitchenActive = pathname === "/admin/kitchen";
  const auditActive = pathname === "/admin/audit-log";
  const personalizationActive = pathname === "/admin/personalization";
  const isAdmin = isAdminRole(role);

  return (
    <nav className="mt-6 flex min-h-0 flex-1 flex-col">
      {isAdmin && (
        <>
          <div className="flex flex-col">
            <Link
              href="/"
              prefetch={false}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors duration-200 ${
                dashboardActive
                  ? "text-brand font-medium bg-surface"
                  : "text-ink/70 hover:text-ink"
              }`}
            >
              <HomeIcon className="size-4" />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/admin/guest-profile"
              prefetch={false}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-200 ${
                guestProfileActive
                  ? "bg-surface font-medium text-brand"
                  : "text-ink/70 hover:text-ink"
              }`}
            >
              <GuestProfileIcon className="size-4" />
              <span>Guest Profile</span>
            </Link>
            <Link
              href="/admin/kitchen"
              prefetch={false}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-200 ${
                kitchenActive
                  ? "bg-surface font-medium text-brand"
                  : "text-ink/70 hover:text-ink"
              }`}
            >
              <KitchenIcon className="size-4" />
              <span>Kitchen</span>
            </Link>
            <button
              type="button"
              onClick={() => setDataOpen((open) => !open)}
              aria-expanded={dataOpen}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors duration-200 ${
                dataActive
                  ? "text-brand font-medium bg-surface"
                  : "text-ink/70 hover:text-ink"
              }`}
            >
              <DatabaseIcon className="size-4" />
              <span className="flex-1 text-left">Data Editor</span>
              <ChevronIcon
                className={`size-3.5 text-ink/40 transition-transform ${
                  dataOpen ? "rotate-90" : ""
                }`}
              />
            </button>
            {dataOpen && (
              <div className="mt-1 ml-5 pl-3 border-l border-black/10 flex flex-col">
                {dataChildren
                  .filter(
                    (item) => !item.superadminOnly || role === "superadmin",
                  )
                  .map(({ label, href }) => {
                    const active = pathname === href;
                    return (
                      <Link
                        key={href}
                        href={href}
                        prefetch={false}
                        className={`relative flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors duration-200 ${
                          active
                            ? "text-brand font-medium bg-surface"
                            : "text-ink/70 hover:text-ink"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`absolute -left-[13px] top-1.5 bottom-1.5 w-0.5 rounded-r bg-brand transition-opacity duration-200 ${
                            active ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        <span>{label}</span>
                      </Link>
                    );
                  })}
              </div>
            )}
            <Link
              href="/admin/audit-log"
              prefetch={false}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors duration-200 ${
                auditActive
                  ? "text-brand font-medium bg-surface"
                  : "text-ink/70 hover:text-ink"
              }`}
            >
              <LogIcon className="size-4" />
              <span>Audit Log</span>
            </Link>
          </div>
          <div className="mt-auto pt-6">
            <Link
              href="/admin/personalization"
              prefetch={false}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-200 ${
                personalizationActive
                  ? "bg-surface font-medium text-brand"
                  : "text-ink/70 hover:text-ink"
              }`}
            >
              <SettingsIcon className="size-4" />
              <span>Personalization</span>
            </Link>
          </div>
        </>
      )}

      {!isAdmin && (
        <Link
          href="/"
          prefetch={false}
          className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-200 ${
            dashboardActive
              ? "bg-surface font-medium text-brand"
              : "text-ink/70 hover:text-ink"
          }`}
        >
          <HomeIcon className="size-4" />
          <span>Home</span>
        </Link>
      )}
    </nav>
  );
}
