"use client";

import { useEffect, useRef, useState } from "react";
import {
  MONTH_NAMES,
  formatBookingDate,
  isBookingDate,
  isSameDay,
  parseBookingDate,
  startOfMonth,
} from "@/src/lib/booking-dates";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"] as const;
const DEFAULT_BUTTON_CLASS =
  "flex h-10 w-full items-center gap-2 rounded-xl border border-black/10 bg-white px-3 text-left text-sm text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(0,0,0,0.04)] outline-none transition-colors hover:bg-white/90 focus:border-brand focus:ring-2 focus:ring-brand/15";

function buildCalendarCells(viewMonth: Date) {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const leading = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: { date: Date; muted: boolean }[] = [];

  for (let i = leading; i > 0; i--) {
    cells.push({ date: new Date(year, month, 1 - i), muted: true });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: new Date(year, month, day), muted: false });
  }
  while (cells.length % 7 !== 0) {
    const offset = cells.length - leading - daysInMonth + 1;
    cells.push({ date: new Date(year, month + 1, offset), muted: true });
  }

  return cells;
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="5" width="16" height="15" rx="4" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </svg>
  );
}

function ChevronIcon({
  direction,
  className,
}: {
  direction: "left" | "right";
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={direction === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}

function cleanDate(value: string) {
  return isBookingDate(value) ? value : "";
}

function getInitialMonth(value: string) {
  return startOfMonth(value ? parseBookingDate(value) : new Date());
}

function formatDisplayDate(value: string, placeholder: string) {
  if (!value) return placeholder;
  const date = parseBookingDate(value);
  const month = MONTH_NAMES[date.getMonth()].slice(0, 3);
  return `${month} ${date.getDate()}, ${date.getFullYear()}`;
}

export default function CalendarDateField({
  id,
  name,
  required,
  defaultValue,
  minDate,
  placeholder = "Select date",
  prefix,
  wrapperClassName = "relative mt-1",
  buttonClassName = DEFAULT_BUTTON_CLASS,
}: {
  id: string;
  name: string;
  required?: boolean;
  defaultValue: string;
  minDate?: string;
  placeholder?: string;
  prefix?: string;
  wrapperClassName?: string;
  buttonClassName?: string;
}) {
  const initialValue = cleanDate(defaultValue);
  const [value, setValue] = useState(initialValue);
  const [viewMonth, setViewMonth] = useState(() => getInitialMonth(initialValue));
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const syncFromInput = () => {
      const nextValue = cleanDate(input.value);
      setValue((currentValue) => {
        if (currentValue === nextValue) return currentValue;
        setViewMonth(getInitialMonth(nextValue));
        return nextValue;
      });
    };

    input.addEventListener("input", syncFromInput);
    input.addEventListener("change", syncFromInput);
    return () => {
      input.removeEventListener("input", syncFromInput);
      input.removeEventListener("change", syncFromInput);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const selectedDate = value ? parseBookingDate(value) : null;
  const cells = buildCalendarCells(viewMonth);
  const monthLabel = `${MONTH_NAMES[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`;

  const moveMonth = (offset: number) => {
    setViewMonth(
      new Date(viewMonth.getFullYear(), viewMonth.getMonth() + offset, 1),
    );
  };

  const isDateDisabled = (dateValue: string) =>
    minDate !== undefined && dateValue < minDate;

  const selectDate = (date: Date) => {
    const dateValue = formatBookingDate(date);
    if (isDateDisabled(dateValue)) return;
    setValue(dateValue);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className={wrapperClassName}>
      <input ref={inputRef} type="hidden" name={name} value={value} />
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        data-required={required ? "true" : undefined}
        onClick={() => setOpen((current) => !current)}
        className={buttonClassName}
      >
        <CalendarIcon className="size-4 shrink-0 text-ink/45" />
        {prefix && <span className="shrink-0 text-ink/70">{prefix}</span>}
        <span className={value ? "text-ink" : "text-ink/40"}>
          {formatDisplayDate(value, placeholder)}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose date"
          className="absolute left-0 top-full z-30 mt-2 w-[292px] rounded-2xl border border-black/10 bg-white/95 p-3 text-ink shadow-[0_18px_50px_rgba(0,0,0,0.16)] backdrop-blur"
        >
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => moveMonth(-1)}
              className="grid size-8 place-items-center rounded-full text-ink/55 hover:bg-surface"
            >
              <ChevronIcon direction="left" className="size-4" />
            </button>
            <div className="text-sm font-semibold text-ink">{monthLabel}</div>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => moveMonth(1)}
              className="grid size-8 place-items-center rounded-full text-ink/55 hover:bg-surface"
            >
              <ChevronIcon direction="right" className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((day, index) => (
              <div
                key={`${day}-${index}`}
                className="pb-1 text-[10px] font-medium text-ink/35"
              >
                {day}
              </div>
            ))}
            {cells.map((cell) => {
              const dateValue = formatBookingDate(cell.date);
              const selected =
                selectedDate !== null && isSameDay(cell.date, selectedDate);
              const disabled = isDateDisabled(dateValue);

              return (
                <button
                  key={dateValue}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectDate(cell.date)}
                  className={`grid size-9 place-items-center rounded-full text-sm transition-colors ${
                    selected
                      ? "bg-brand text-white shadow-sm"
                      : disabled
                        ? "cursor-not-allowed text-ink/15"
                        : cell.muted
                          ? "text-ink/25 hover:bg-surface"
                          : "text-ink/75 hover:bg-surface"
                  }`}
                >
                  {cell.date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3">
            <button
              type="button"
              onClick={() => {
                setValue("");
                setOpen(false);
              }}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-ink/50 hover:bg-surface hover:text-ink/70"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => selectDate(new Date())}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-brand outline-none transition-colors hover:bg-brand/10 focus-visible:ring-2 focus-visible:ring-brand/20"
            >
              Current Date
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
