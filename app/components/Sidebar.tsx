"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type IconProps = { className?: string };

const HomeIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
  </svg>
);

const BookingIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

const GymIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" />
  </svg>
);

const KaraokeIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
  </svg>
);

const YogaIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="4.5" r="1.8" />
    <path d="M5 12c2 0 4-1 7-1s5 1 7 1M12 11v6M9 21l3-4 3 4" />
  </svg>
);

const LoungeIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 12V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" />
    <path d="M2 12h20v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5ZM6 19v2M18 19v2" />
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

const bookingChildren = [
  { label: "Gym", href: "/booking/gym", Icon: GymIcon },
  { label: "Karaoke", href: "/booking/karaoke", Icon: KaraokeIcon },
  { label: "Yoga Studio", href: "/booking/yoga", Icon: YogaIcon },
  { label: "Lounge", href: "/booking/lounge", Icon: LoungeIcon },
];

export default function Sidebar({ role }: { role: "admin" | "guest" }) {
  const pathname = usePathname();
  const inBooking = pathname.startsWith("/booking/");
  const [bookingOpen, setBookingOpen] = useState(inBooking);
  const [prevInBooking, setPrevInBooking] = useState(inBooking);

  if (inBooking && !prevInBooking) {
    setBookingOpen(true);
  }
  if (inBooking !== prevInBooking) {
    setPrevInBooking(inBooking);
  }

  const dashboardActive = pathname === "/";
  const isAdmin = role === "admin";

  return (
    <aside className="w-56 shrink-0 border-r border-black/5 bg-white flex flex-col px-4 py-6">
      <div className="flex items-start gap-2 px-2">
        <div className="size-9 shrink-0 rounded-lg bg-brand text-white grid place-items-center font-semibold">
          N
        </div>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold text-brand">Natured Tranquility</div>
          <div className="text-[10px] text-black/50">
            Wellness Dashboard
            <br />
            Facility Management
          </div>
        </div>
      </div>

      <nav className="mt-6 flex flex-col">
        {isAdmin && (
          <Link
            href="/"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors duration-200 ${
              dashboardActive
                ? "text-brand font-medium bg-surface"
                : "text-ink/70 hover:text-ink"
            }`}
          >
            <HomeIcon className="size-4" />
            <span>Dashboard</span>
          </Link>
        )}

        <button
          type="button"
          onClick={() => setBookingOpen((v) => !v)}
          aria-expanded={bookingOpen}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-ink/70 hover:text-ink"
        >
          <BookingIcon className="size-4" />
          <span className="flex-1 text-left">Booking</span>
          <ChevronIcon
            className={`size-3.5 text-ink/40 transition-transform ${
              bookingOpen ? "rotate-90" : ""
            }`}
          />
        </button>

        {bookingOpen && (
          <div className="mt-1 ml-5 pl-3 border-l border-black/10 flex flex-col">
            {bookingChildren.map(({ label, href, Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
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
                  <Icon className="size-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      <button
        type="button"
        className="mt-auto flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-ink/70 hover:text-ink"
      >
        <SettingsIcon className="size-4" />
        <span>Settings</span>
      </button>
    </aside>
  );
}
