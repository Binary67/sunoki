"use client";

import { notFound } from "next/navigation";
import { use, useState } from "react";

type IconProps = { className?: string };

const CalendarIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

type Facility = {
  title: string;
  description: string;
  gradientClasses: string;
  accentColor: string;
  serifName: string;
  sublabel: string;
  tags: readonly string[];
};

const FACILITIES = {
  karaoke: {
    title: "Echoes of Serenity",
    description:
      "A private sanctuary designed for musical expression and emotional release, featuring studio-grade acoustics and intimate ambient lighting.",
    gradientClasses: "from-[#3b2a20] via-[#2a1f18] to-[#0e0a08]",
    accentColor: "#d4a574",
    serifName: "Dynasty",
    sublabel: "KARAOKE LOUNGE",
    tags: ["HI-FI AUDIO", "ATMOSPHERE", "MAX 4 PEOPLE"],
  },
  gym: {
    title: "Pulse of Vitality",
    description:
      "A precision-equipped strength studio balancing focused training with the calm of mindful movement and breath.",
    gradientClasses: "from-[#1a2530] via-[#11181f] to-[#070a0d]",
    accentColor: "#7fb3d5",
    serifName: "Apex",
    sublabel: "STRENGTH STUDIO",
    tags: ["FREE WEIGHTS", "CARDIO ZONE", "OPEN 24/7"],
  },
  yoga: {
    title: "Whispers of Stillness",
    description:
      "A softly lit studio for breath, balance, and restorative practice — natural fibers and warm light invite quiet presence.",
    gradientClasses: "from-[#2d2316] via-[#1f1810] to-[#0c0a07]",
    accentColor: "#e8c79b",
    serifName: "Lumina",
    sublabel: "YOGA STUDIO",
    tags: ["HEATED FLOOR", "MAT INCLUDED", "MAX 12 GUESTS"],
  },
  lounge: {
    title: "Garden of Repose",
    description:
      "An unhurried social retreat with low seating, herbal infusions, and shaded greenery for conversation or quiet repose.",
    gradientClasses: "from-[#1f2a22] via-[#162018] to-[#08100b]",
    accentColor: "#a8c8a0",
    serifName: "Verdance",
    sublabel: "TRANQUIL LOUNGE",
    tags: ["HERBAL BAR", "QUIET HOURS", "MAX 8 GUESTS"],
  },
} as const satisfies Record<string, Facility>;

type FacilitySlug = keyof typeof FACILITIES;

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

export default function FacilityPage({
  params,
}: {
  params: Promise<{ facility: string }>;
}) {
  const { facility } = use(params);
  const [reserved, setReserved] = useState(false);

  if (!(facility in FACILITIES)) notFound();
  const f = FACILITIES[facility as FacilitySlug];

  return (
    <div className="flex-1 flex min-h-0">
      <main className="flex-1 px-10 py-8 min-w-0">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight">{f.title}</h1>
          <p className="mt-3 text-sm leading-6 text-ink/60">{f.description}</p>

          <div
            className={`relative mt-6 rounded-2xl overflow-hidden bg-gradient-to-br aspect-[16/9] ${f.gradientClasses}`}
          >
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div
                  className="font-serif italic text-3xl tracking-wide drop-shadow"
                  style={{ color: f.accentColor }}
                >
                  {f.serifName}
                </div>
                <div
                  className="mt-1 text-[10px] tracking-[0.3em]"
                  style={{ color: `${f.accentColor}b3` }}
                >
                  {f.sublabel}
                </div>
              </div>
            </div>
            <div className="absolute left-4 bottom-4 flex flex-wrap gap-2">
              {f.tags.map((tag) => (
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
  );
}
