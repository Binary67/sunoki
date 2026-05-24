"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  MONTH_NAMES,
  WEEKDAY_NAMES,
  ordinal,
  parseBookingDate,
} from "@/src/lib/booking-dates";
import type {
  GuestServiceBooking,
  GuestServiceBookingSummary,
} from "@/src/lib/service-bookings";
import { UNLIMITED_PACKAGE_SERVICE_QUANTITY } from "@/src/lib/package-entitlements";
import { useToast } from "@/app/components/Toast";
import {
  bookServiceAction,
  type ServiceBookingActionState,
} from "./actions";

const initialActionState: ServiceBookingActionState = {};

function formatDateLabel(value: string) {
  const date = parseBookingDate(value);
  return `${WEEKDAY_NAMES[date.getDay()]}, ${
    MONTH_NAMES[date.getMonth()]
  } ${ordinal(date.getDate())}`;
}

function formatQuantity(value: number | null) {
  if (value === null || value === UNLIMITED_PACKAGE_SERVICE_QUANTITY) {
    return "Unlimited";
  }
  return String(value);
}

export default function ServiceBookingClient({
  bookingWindow,
  currentDateValue,
  currentTimeValue,
  minBookableDate,
  summary,
}: {
  bookingWindow: { checkInDate: string; checkOutDate: string } | null;
  currentDateValue: string;
  currentTimeValue: string;
  minBookableDate: string;
  summary: GuestServiceBookingSummary;
}) {
  const { showToast } = useToast();
  const [bookingDate, setBookingDate] = useState(minBookableDate);
  const [bookingTime, setBookingTime] = useState("");
  const [bookState, rawBookFormAction, bookPending] = useActionState(
    bookServiceAction,
    initialActionState,
  );
  const lastNotifiedBookSubmissionId = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (bookState.submissionId === undefined) return;
    if (lastNotifiedBookSubmissionId.current === bookState.submissionId) {
      return;
    }
    lastNotifiedBookSubmissionId.current = bookState.submissionId;

    if (bookState.success) {
      showToast({
        tone: "success",
        title: "Service booked",
        description: `${bookState.success.serviceName} on ${formatDateLabel(
          bookState.success.bookingDate,
        )} at ${bookState.success.bookingTime}`,
      });
    } else if (bookState.error) {
      showToast({
        tone: "error",
        title: "Couldn't book service",
        description: bookState.error,
      });
    }
  }, [bookState, showToast]);

  return (
    <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-ink sm:text-2xl">
          Services
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          Book available package and purchased perk services.
        </p>
      </div>

      <div className="grid max-w-5xl gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-lg border border-black/5 bg-white px-4 py-5 sm:px-5">
          <div className="flex flex-col gap-4 border-b border-black/5 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink/45">
                Service
              </p>
              <h2 className="mt-1 text-lg font-semibold text-ink">
                {summary.serviceName}
              </h2>
              <p className="mt-1 text-sm leading-6 text-ink/60">
                Future bookings count against your available sessions
                immediately.
              </p>
            </div>
            <div className="flex w-fit items-baseline gap-2 rounded-md bg-surface px-3 py-2">
              <span className="text-2xl font-semibold text-ink">
                {formatQuantity(summary.remainingQuantity)}
              </span>
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-ink/45">
                remaining
              </span>
            </div>
          </div>

          <dl className="mt-5 grid gap-3 sm:grid-cols-4">
            <QuotaItem
              label="Package"
              value={formatQuantity(summary.packageQuantity)}
            />
            <QuotaItem
              label="Purchased Perks"
              value={formatQuantity(summary.purchasedPerkQuantity)}
            />
            <QuotaItem label="Booked" value={String(summary.usedQuantity)} />
            <QuotaItem
              label="Total"
              value={formatQuantity(summary.totalQuantity)}
            />
          </dl>

          <form action={rawBookFormAction} className="mt-6 grid gap-4">
            <input
              name="serviceKey"
              type="hidden"
              value={summary.serviceKey}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-ink/75">
                Preferred Date
                <input
                  className="mt-1 h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                  max={bookingWindow?.checkOutDate}
                  min={minBookableDate}
                  name="bookingDate"
                  onChange={(event) => setBookingDate(event.target.value)}
                  required
                  type="date"
                  value={bookingDate}
                />
              </label>
              <label className="block text-sm font-medium text-ink/75">
                Preferred Time
                <input
                  className="mt-1 h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                  min={
                    bookingDate === currentDateValue
                      ? currentTimeValue
                      : undefined
                  }
                  name="bookingTime"
                  onChange={(event) => setBookingTime(event.target.value)}
                  required
                  type="time"
                  value={bookingTime}
                />
              </label>
            </div>
            <button
              className={`h-10 rounded-full px-5 text-sm font-medium transition-colors ${
                bookPending
                  ? "cursor-not-allowed bg-surface text-ink/40"
                  : "bg-brand text-white hover:bg-brand/90"
              }`}
              disabled={bookPending}
              type="submit"
            >
              {bookPending ? "Booking..." : "Book Session"}
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-black/5 bg-white px-4 py-5 sm:px-5">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-base font-semibold text-ink">
              Booked Sessions
            </h2>
            <span className="text-xs text-ink/50">
              {summary.bookings.length}{" "}
              {summary.bookings.length === 1 ? "session" : "sessions"}
            </span>
          </div>

          {summary.bookings.length === 0 ? (
            <p className="mt-4 rounded-md bg-surface px-3 py-4 text-sm leading-6 text-ink/55">
              No service sessions booked.
            </p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {summary.bookings.map((booking) => (
                <BookedServiceRow
                  booking={booking}
                  key={booking.id}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function QuotaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface px-3 py-3">
      <dt className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink/45">
        {label}
      </dt>
      <dd className="mt-1 text-base font-semibold text-ink">{value}</dd>
    </div>
  );
}

function BookedServiceRow({ booking }: {
  booking: GuestServiceBooking;
}) {
  return (
    <li className="rounded-md bg-surface px-3 py-3">
      <div>
        <div className="text-sm font-semibold text-ink">
          {formatDateLabel(booking.bookingDate)}
        </div>
        <div className="mt-0.5 text-xs text-ink/55">
          {booking.bookingTime} · {booking.isUpcoming ? "Upcoming" : "Used"}
        </div>
      </div>
    </li>
  );
}
