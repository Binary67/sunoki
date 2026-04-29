"use client";

import { usePathname, useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { FacilityAvailability } from "@/src/lib/bookings";
import { useToast } from "@/app/components/Toast";
import {
  FACILITIES,
  type FacilitySlug,
} from "./facility-content";
import {
  reserveFacilitySlotAction,
  type BookingActionState,
} from "./actions";

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

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

const initialActionState: BookingActionState = {};

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

function parseBookingDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatBookingDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function slotBulletClass(paxLeft: number) {
  if (paxLeft <= 0) return "bg-red-500";
  if (paxLeft === 1) return "bg-amber-400";
  return "bg-emerald-500";
}

export default function BookingClient({
  facilitySlug,
  selectedDateValue,
  availability,
}: {
  facilitySlug: FacilitySlug;
  selectedDateValue: string;
  availability: FacilityAvailability;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();
  const selectedDate = useMemo(
    () => parseBookingDate(selectedDateValue),
    [selectedDateValue],
  );
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selectedDate));
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [state, formAction, pending] = useActionState(
    reserveFacilitySlotAction,
    initialActionState,
  );
  const lastNotifiedSubmissionId = useRef<number | undefined>(undefined);

  useEffect(() => {
    setViewMonth(startOfMonth(selectedDate));
    setSelectedSlot(null);
  }, [selectedDate]);

  useEffect(() => {
    if (state.submissionId === undefined) return;
    if (lastNotifiedSubmissionId.current === state.submissionId) return;
    lastNotifiedSubmissionId.current = state.submissionId;

    if (state.success) {
      const date = parseBookingDate(state.success.bookingDate);
      const dateLabel = `${WEEKDAY_NAMES[date.getDay()]}, ${
        MONTH_NAMES[date.getMonth()]
      } ${ordinal(date.getDate())}`;
      showToast({
        tone: "success",
        title: "Reservation confirmed",
        description: `${dateLabel} at ${state.success.startTime}`,
      });
      setSelectedSlot(null);
    } else if (state.error) {
      showToast({
        tone: "error",
        title: "Couldn't reserve",
        description: state.error,
      });
    }
  }, [state, showToast]);

  const f = FACILITIES[facilitySlug];
  const cells = buildCalendarCells(viewMonth);
  const monthLabel = `${MONTH_NAMES[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`;
  const selectedDateLabel = `${WEEKDAY_NAMES[selectedDate.getDay()]}, ${
    MONTH_NAMES[selectedDate.getMonth()]
  } ${ordinal(selectedDate.getDate())}`;
  const selectedSlotRecord = availability.slots.find(
    (slot) => slot.id === selectedSlot,
  );

  const goToMonth = (offset: number) =>
    setViewMonth(
      new Date(viewMonth.getFullYear(), viewMonth.getMonth() + offset, 1),
    );

  const pickDate = (date: Date, muted: boolean) => {
    const params = new URLSearchParams();
    params.set("date", formatBookingDate(date));
    router.push(`${pathname}?${params.toString()}`);
    setSelectedSlot(null);
    if (muted) setViewMonth(startOfMonth(date));
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
            {availability.slots.map((slot) => {
              const unavailable = !slot.isAvailable;
              const selected = selectedSlot === slot.id;
              return (
                <li
                  key={slot.id}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 transition-colors ${
                    unavailable
                      ? "bg-surface/60 opacity-50 grayscale"
                      : selected
                        ? "bg-surface ring-1 ring-brand"
                        : "bg-surface"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className={`size-2.5 rounded-full ${slotBulletClass(slot.paxLeft)}`}
                    />
                    <div>
                      <div
                        className={`text-base font-semibold ${
                          unavailable ? "text-ink/40 line-through" : ""
                        }`}
                      >
                        {slot.startTime}
                      </div>
                      <div
                        className={`text-[11px] ${
                          unavailable ? "text-ink/35" : "text-ink/55"
                        }`}
                      >
                        {slot.durationMinutes} Minute Session
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`text-xs font-medium ${
                        unavailable ? "text-red-600/80" : "text-ink/55"
                      }`}
                    >
                      {unavailable
                        ? "Not available"
                        : `${slot.paxLeft} of ${slot.capacityPax} pax left`}
                    </span>
                    <button
                      type="button"
                      disabled={unavailable || pending}
                      onClick={() => setSelectedSlot(slot.id)}
                      className={`text-sm font-medium ${
                        unavailable
                          ? "text-ink/30 cursor-not-allowed"
                          : pending
                            ? "text-ink/40 cursor-not-allowed"
                            : selected
                              ? "text-brand"
                              : "text-brand hover:underline"
                      }`}
                    >
                      {unavailable ? "Full" : selected ? "Selected" : "Select"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <form action={formAction} className="mt-5">
            <input type="hidden" name="facility" value={facilitySlug} />
            <input type="hidden" name="bookingDate" value={selectedDateValue} />
            <input type="hidden" name="timeSlotId" value={selectedSlot ?? ""} />

            <button
              type="submit"
              disabled={!selectedSlotRecord?.isAvailable || pending}
              className={`w-full rounded-full px-6 py-2.5 text-sm font-medium transition-colors ${
                !selectedSlotRecord?.isAvailable || pending
                  ? "bg-surface text-ink/40 cursor-not-allowed"
                  : "bg-brand text-white hover:bg-brand/90"
              }`}
            >
              {pending ? "Reserving..." : "Reserve Now"}
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
}
