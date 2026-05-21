"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  MONTH_NAMES,
  formatBookingDate,
  isSameDay,
  parseBookingDate,
  startOfMonth,
} from "@/src/lib/booking-dates";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "./icons";

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

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

export default function CalendarPicker({
  selectedDateValue,
  bookingWindow,
  minBookableDate,
}: {
  selectedDateValue: string;
  bookingWindow: { checkInDate: string; checkOutDate: string } | null;
  minBookableDate: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const selectedDate = parseBookingDate(selectedDateValue);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selectedDate));

  const cells = buildCalendarCells(viewMonth);
  const monthLabel = `${MONTH_NAMES[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`;

  const goToMonth = (offset: number) =>
    setViewMonth(
      new Date(viewMonth.getFullYear(), viewMonth.getMonth() + offset, 1),
    );

  const pushDateValue = (dateValue: string) => {
    const params = new URLSearchParams();
    params.set("date", dateValue);
    router.push(`${pathname}?${params.toString()}`);
  };

  const isDateDisabled = (dateValue: string) =>
    dateValue < minBookableDate ||
    (bookingWindow !== null && dateValue > bookingWindow.checkOutDate);

  const pickDate = (date: Date) => {
    const dateValue = formatBookingDate(date);
    if (isDateDisabled(dateValue)) return;
    pushDateValue(dateValue);
  };

  const hasBookableDates =
    bookingWindow === null || minBookableDate <= bookingWindow.checkOutDate;

  const goToEarliestDate = () => {
    if (!hasBookableDates) return;
    setViewMonth(startOfMonth(parseBookingDate(minBookableDate)));
    pushDateValue(minBookableDate);
  };

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <CalendarIcon className="size-4 text-ink/70" />
          <span>Select Your Date</span>
        </div>
        <div className="flex items-center gap-1 self-end sm:self-auto">
          <button
            type="button"
            onClick={goToEarliestDate}
            disabled={!hasBookableDates}
            className={`px-2 h-7 rounded-full text-xs font-medium ${
              hasBookableDates
                ? "text-ink/60 hover:bg-surface"
                : "text-ink/30 cursor-not-allowed"
            }`}
          >
            Earliest Date
          </button>
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
          const dateValue = formatBookingDate(cell.date);
          const selected = isSameDay(cell.date, selectedDate);
          const disabled = isDateDisabled(dateValue);
          return (
            <div key={i} className="grid place-items-center">
              <button
                type="button"
                disabled={disabled}
                onClick={() => pickDate(cell.date)}
                className={`size-9 grid place-items-center text-sm rounded-full transition-colors ${
                  disabled
                    ? "cursor-not-allowed bg-surface/50 text-ink/20"
                    : selected
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
  );
}
