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

const ChevronLeftIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const ChevronRightIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 6l6 6-6 6" />
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

const TIME_SLOTS = ["18:00", "19:30", "21:00", "22:30"];

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

function ordinal(n: number) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildCalendarCells(viewMonth: Date) {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  // Make Monday the first column: shift JS getDay (0=Sun) so Mon=0.
  const leading = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: { date: Date; muted: boolean }[] = [];
  for (let i = leading; i > 0; i--) {
    cells.push({ date: new Date(year, month, 1 - i), muted: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), muted: false });
  }
  while (cells.length % 7 !== 0) {
    const offset = cells.length - leading - daysInMonth + 1;
    cells.push({ date: new Date(year, month + 1, offset), muted: true });
  }
  return cells;
}

export default function FacilityPage({
  params,
}: {
  params: Promise<{ facility: string }>;
}) {
  const { facility } = use(params);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [reservedSlot, setReservedSlot] = useState<string | null>(null);

  if (!(facility in FACILITIES)) notFound();
  const f = FACILITIES[facility as FacilitySlug];

  const cells = buildCalendarCells(viewMonth);
  const monthLabel = `${MONTH_NAMES[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`;
  const selectedDateLabel = `${WEEKDAY_NAMES[selectedDate.getDay()]}, ${
    MONTH_NAMES[selectedDate.getMonth()]
  } ${ordinal(selectedDate.getDate())}`;

  const goToMonth = (offset: number) =>
    setViewMonth(
      new Date(viewMonth.getFullYear(), viewMonth.getMonth() + offset, 1),
    );

  const pickDate = (date: Date, muted: boolean) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setReservedSlot(null);
    if (muted) setViewMonth(startOfMonth(date));
  };

  const reserve = () => {
    if (!selectedSlot || reservedSlot) return;
    setReservedSlot(selectedSlot);
  };

  return (
    <div className="flex-1 flex min-h-0">
      <main className="flex-1 px-10 py-8 min-w-0">
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
      </main>

      <aside className="w-[440px] shrink-0 border-l border-black/5 px-6 py-8 space-y-6">
        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CalendarIcon className="size-4 text-ink/70" />
              <span>Select Your Date</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => goToMonth(-1)}
                aria-label="Previous month"
                className="size-7 grid place-items-center rounded-full text-ink/60 hover:bg-surface"
              >
                <ChevronLeftIcon className="size-4" />
              </button>
              <div className="text-xs font-medium text-ink/80 min-w-[110px] text-center">
                {monthLabel}
              </div>
              <button
                type="button"
                onClick={() => goToMonth(1)}
                aria-label="Next month"
                className="size-7 grid place-items-center rounded-full text-ink/60 hover:bg-surface"
              >
                <ChevronRightIcon className="size-4" />
              </button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-y-2 text-center">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-[10px] tracking-wider text-ink/40 pb-2">
                {d}
              </div>
            ))}
            {cells.map((cell, i) => {
              const selected = isSameDay(cell.date, selectedDate);
              return (
                <div key={i} className="grid place-items-center">
                  <button
                    type="button"
                    onClick={() => pickDate(cell.date, cell.muted)}
                    className={`size-9 grid place-items-center text-sm rounded-full transition-colors ${
                      selected
                        ? "bg-brand text-white font-medium"
                        : cell.muted
                        ? "text-ink/25 hover:bg-surface"
                        : "text-ink/80 hover:bg-surface"
                    }`}
                  >
                    {cell.date.getDate()}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <h2 className="text-base font-semibold">Evening Availability</h2>
          <div className="mt-1 text-xs text-ink/55">
            Selected Date: <span className="text-ink/80">{selectedDateLabel}</span>
          </div>

          <ul className="mt-5 flex flex-col gap-3">
            {TIME_SLOTS.map((time) => {
              const reserved = reservedSlot === time;
              const selected = !reservedSlot && selectedSlot === time;
              return (
                <li
                  key={time}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 transition-colors ${
                    reserved
                      ? "bg-brand/10"
                      : selected
                      ? "bg-surface ring-1 ring-brand"
                      : "bg-surface"
                  }`}
                >
                  <div>
                    <div className="text-base font-semibold">{time}</div>
                    <div className="text-[11px] text-ink/55">60 Minute Session</div>
                  </div>
                  <button
                    type="button"
                    disabled={!!reservedSlot}
                    onClick={() => setSelectedSlot(time)}
                    className={`text-sm font-medium ${
                      reserved
                        ? "text-brand"
                        : reservedSlot
                        ? "text-ink/40 cursor-not-allowed"
                        : selected
                        ? "text-brand"
                        : "text-brand hover:underline"
                    }`}
                  >
                    {reserved ? "Reserved" : selected ? "Selected" : "Select"}
                  </button>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={reserve}
            disabled={!selectedSlot || !!reservedSlot}
            className={`mt-5 w-full rounded-full px-6 py-2.5 text-sm font-medium transition-colors ${
              !selectedSlot || reservedSlot
                ? "bg-surface text-ink/40 cursor-not-allowed"
                : "bg-brand text-white hover:bg-brand/90"
            }`}
          >
            {reservedSlot ? `Reserved for ${reservedSlot} ✓` : "Reserve Now"}
          </button>
        </div>
      </aside>
    </div>
  );
}
