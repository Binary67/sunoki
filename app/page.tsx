"use client";

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

const BellIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9ZM10 21a2 2 0 0 0 4 0" />
  </svg>
);

const CalendarIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

const navItems = [
  { id: "booking", label: "Booking", Icon: BookingIcon },
  { id: "gym", label: "Gym", Icon: GymIcon },
  { id: "karaoke", label: "Karaoke", Icon: KaraokeIcon },
  { id: "yoga", label: "Yoga Studio", Icon: YogaIcon },
  { id: "lounge", label: "Lounge", Icon: LoungeIcon },
];

const timeSlots = [
  { time: "18:00", reserved: false },
  { time: "19:30", reserved: false },
  { time: "21:00", reserved: true },
  { time: "22:30", reserved: false },
];

const calendarRows: { d: number; muted?: boolean; selected?: boolean }[][] = [
  [{ d: 28, muted: true }, { d: 29, muted: true }, { d: 30, muted: true }, { d: 31, muted: true }, { d: 1 }, { d: 2 }, { d: 3 }],
  [{ d: 4 }, { d: 5 }, { d: 6 }, { d: 7 }, { d: 8, selected: true }, { d: 9 }, { d: 10 }],
  [{ d: 11 }, { d: 12 }, { d: 13 }, { d: 14 }, { d: 15 }, { d: 16 }, { d: 17 }],
  [{ d: 18 }, { d: 19 }, { d: 20 }, { d: 21 }, { d: 22 }, { d: 23 }, { d: 24 }],
  [{ d: 25 }, { d: 26 }, { d: 27 }, { d: 28 }, { d: 29 }, { d: 30 }, { d: 1, muted: true }],
];

const weekdays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export default function Home() {
  const [reserved, setReserved] = useState(false);

  return (
    <div className="flex flex-1 w-full bg-white text-ink">
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

        <button
          type="button"
          aria-label="Home"
          className="mt-6 size-9 rounded-lg bg-surface grid place-items-center text-ink/70 hover:text-ink"
        >
          <HomeIcon className="size-4" />
        </button>

        <nav className="mt-4 flex flex-col">
          {navItems.map(({ id, label, Icon }) => {
            const active = id === "karaoke";
            return (
              <button
                key={id}
                type="button"
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  active ? "text-brand font-medium" : "text-ink/70 hover:text-ink"
                }`}
              >
                {active && (
                  <span className="absolute -left-4 top-1.5 bottom-1.5 w-0.5 rounded-r bg-brand" />
                )}
                <Icon className="size-4" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          className="mt-auto flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-ink/70 hover:text-ink"
        >
          <SettingsIcon className="size-4" />
          <span>Settings</span>
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 flex items-center justify-between px-10 border-b border-black/5">
          <div className="text-[11px] tracking-[0.18em] text-black/50">
            FACILITIES <span className="mx-2 text-black/30">/</span> KARAOKE ROOM
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

        <div className="flex-1 flex min-h-0">
          <main className="flex-1 px-10 py-8 min-w-0">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-semibold tracking-tight">Echoes of Serenity</h1>
              <p className="mt-3 text-sm leading-6 text-ink/60">
                A private sanctuary designed for musical expression and emotional release,
                featuring studio-grade acoustics and intimate ambient lighting.
              </p>

              <div className="relative mt-6 rounded-2xl overflow-hidden bg-gradient-to-br from-[#3b2a20] via-[#2a1f18] to-[#0e0a08] aspect-[16/9]">
                <div className="absolute inset-0 grid place-items-center">
                  <div className="text-center">
                    <div className="font-serif italic text-[#d4a574] text-3xl tracking-wide drop-shadow">
                      Dynasty
                    </div>
                    <div className="mt-1 text-[10px] tracking-[0.3em] text-[#d4a574]/70">
                      KARAOKE LOUNGE
                    </div>
                  </div>
                </div>
                <div className="absolute left-4 bottom-4 flex flex-wrap gap-2">
                  {["HI-FI AUDIO", "ATMOSPHERE", "MAX 4 PEOPLE"].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-white/95 backdrop-blur px-3 py-1 text-[10px] font-medium tracking-wider text-ink"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </main>

          <aside className="w-[440px] shrink-0 border-l border-black/5 px-6 py-8 space-y-6">
            <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CalendarIcon className="size-4 text-ink/70" />
                <span>Select Your Date</span>
              </div>
              <div className="mt-4 grid grid-cols-7 gap-y-2 text-center">
                {weekdays.map((d) => (
                  <div key={d} className="text-[10px] tracking-wider text-ink/40 pb-2">
                    {d}
                  </div>
                ))}
                {calendarRows.flat().map((cell, i) => (
                  <div key={i} className="grid place-items-center">
                    <div
                      className={`size-9 grid place-items-center text-sm rounded-full ${
                        cell.selected
                          ? "bg-brand text-white font-medium"
                          : cell.muted
                          ? "text-ink/25"
                          : "text-ink/80 hover:bg-surface"
                      }`}
                    >
                      {cell.d}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <h2 className="text-base font-semibold">Evening Availability</h2>
              <div className="mt-1 text-xs text-ink/55">
                Selected Date: <span className="text-ink/80">Friday, November 8th</span>
              </div>

              <ul className="mt-5 flex flex-col gap-3">
                {timeSlots.map((slot) => (
                  <li
                    key={slot.time}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                      slot.reserved ? "bg-brand/10" : "bg-surface"
                    }`}
                  >
                    <div>
                      <div className="text-base font-semibold">{slot.time}</div>
                      <div className="text-[11px] text-ink/55">60 Minute Session</div>
                    </div>
                    <button
                      type="button"
                      disabled={slot.reserved}
                      className={`text-sm font-medium ${
                        slot.reserved ? "text-ink/40 cursor-not-allowed" : "text-brand hover:underline"
                      }`}
                    >
                      {slot.reserved ? "Reserved" : "Select"}
                    </button>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => setReserved(true)}
                disabled={reserved}
                className={`mt-5 w-full rounded-full px-6 py-2.5 text-sm font-medium transition-colors ${
                  reserved
                    ? "bg-surface text-ink/40 cursor-not-allowed"
                    : "bg-brand text-white hover:bg-brand/90"
                }`}
              >
                {reserved ? "Reserved ✓" : "Reserve Now"}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
