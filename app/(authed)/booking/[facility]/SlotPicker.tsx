"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { FacilitySlotAvailability } from "@/src/lib/bookings";
import {
  MONTH_NAMES,
  WEEKDAY_NAMES,
  ordinal,
  parseBookingDate,
} from "@/src/lib/booking-dates";
import { useToast } from "@/app/components/Toast";
import {
  cancelFacilityBookingAction,
  reserveFacilitySlotAction,
  type BookingActionState,
} from "./actions";
import type { FacilitySlug } from "./facility-content";
import { ChevronDownIcon } from "./icons";

const initialActionState: BookingActionState = {};

type SlotPeriod = "morning" | "afternoon" | "evening";

const PERIOD_ORDER: readonly SlotPeriod[] = ["morning", "afternoon", "evening"];

const PERIOD_LABEL: Record<SlotPeriod, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

function bucketSlotsByPeriod<T extends { startTime: string }>(
  slots: readonly T[],
): Record<SlotPeriod, T[]> {
  const buckets: Record<SlotPeriod, T[]> = {
    morning: [],
    afternoon: [],
    evening: [],
  };
  for (const slot of slots) {
    const hour = Number(slot.startTime.slice(0, 2));
    if (hour < 12) buckets.morning.push(slot);
    else if (hour < 17) buckets.afternoon.push(slot);
    else buckets.evening.push(slot);
  }
  return buckets;
}

function slotBulletClass(paxLeft: number) {
  if (paxLeft <= 0) return "bg-red-500";
  if (paxLeft === 1) return "bg-amber-400";
  return "bg-emerald-500";
}

function hasSlotStarted(
  selectedDateValue: string,
  startTime: string,
  currentDateValue: string,
  currentTimeValue: string,
) {
  return (
    selectedDateValue < currentDateValue ||
    (selectedDateValue === currentDateValue && startTime <= currentTimeValue)
  );
}

function formatDateLabel(value: string) {
  const date = parseBookingDate(value);
  return `${WEEKDAY_NAMES[date.getDay()]}, ${
    MONTH_NAMES[date.getMonth()]
  } ${ordinal(date.getDate())}`;
}

export default function SlotPicker({
  facilitySlug,
  selectedDateValue,
  currentDateValue,
  currentTimeValue,
  slots,
}: {
  facilitySlug: FacilitySlug;
  selectedDateValue: string;
  currentDateValue: string;
  currentTimeValue: string;
  slots: FacilitySlotAvailability[];
}) {
  const { showToast } = useToast();
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [expandedPeriods, setExpandedPeriods] = useState<
    Record<SlotPeriod, boolean>
  >({ morning: false, afternoon: false, evening: false });
  const [reserveState, rawReserveFormAction, reservePending] = useActionState(
    reserveFacilitySlotAction,
    initialActionState,
  );
  const [cancelState, rawCancelFormAction, cancelPending] = useActionState(
    cancelFacilityBookingAction,
    initialActionState,
  );
  const lastNotifiedReserveSubmissionId = useRef<number | undefined>(undefined);
  const lastNotifiedCancelSubmissionId = useRef<number | undefined>(undefined);
  const pending = reservePending || cancelPending;

  const reserveFormAction = (formData: FormData) => {
    setSelectedSlot(null);
    rawReserveFormAction(formData);
  };

  const cancelFormAction = (formData: FormData) => {
    setSelectedSlot(null);
    rawCancelFormAction(formData);
  };

  useEffect(() => {
    if (reserveState.submissionId === undefined) return;
    if (lastNotifiedReserveSubmissionId.current === reserveState.submissionId) {
      return;
    }
    lastNotifiedReserveSubmissionId.current = reserveState.submissionId;

    if (reserveState.success) {
      showToast({
        tone: "success",
        title: "Reservation confirmed",
        description: `${formatDateLabel(reserveState.success.bookingDate)} at ${
          reserveState.success.startTime
        }`,
      });
    } else if (reserveState.error) {
      showToast({
        tone: "error",
        title: "Couldn't reserve",
        description: reserveState.error,
      });
    }
  }, [reserveState, showToast]);

  useEffect(() => {
    if (cancelState.submissionId === undefined) return;
    if (lastNotifiedCancelSubmissionId.current === cancelState.submissionId) {
      return;
    }
    lastNotifiedCancelSubmissionId.current = cancelState.submissionId;

    if (cancelState.success) {
      showToast({
        tone: "success",
        title: "Booking cancelled",
        description: `${formatDateLabel(cancelState.success.bookingDate)} at ${
          cancelState.success.startTime
        }`,
      });
    } else if (cancelState.error) {
      showToast({
        tone: "error",
        title: "Couldn't cancel",
        description: cancelState.error,
      });
    }
  }, [cancelState, showToast]);

  const selectedDateLabel = formatDateLabel(selectedDateValue);
  const selectedSlotRecord = slots.find((slot) => slot.id === selectedSlot);
  const canReserveSelectedSlot =
    selectedSlotRecord?.isAvailable === true &&
    selectedSlotRecord.currentUserBookingId === null;
  const slotsByPeriod = bucketSlotsByPeriod(slots);

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <h2 className="text-base font-semibold">Availability</h2>
      <div className="mt-1 text-xs text-ink/55">
        Selected Date: <span className="text-ink/80">{selectedDateLabel}</span>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {PERIOD_ORDER.map((period) => {
          const periodSlots = slotsByPeriod[period];
          const hasSlots = periodSlots.length > 0;
          const expanded = hasSlots && expandedPeriods[period];
          const togglePeriod = () =>
            setExpandedPeriods((prev) => ({
              ...prev,
              [period]: !prev[period],
            }));
          return (
            <section
              key={period}
              className="rounded-xl border border-black/5"
            >
              <button
                type="button"
                onClick={hasSlots ? togglePeriod : undefined}
                aria-expanded={expanded}
                disabled={!hasSlots}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl ${
                  hasSlots ? "cursor-pointer" : "cursor-default"
                }`}
              >
                <div className="flex items-center gap-3">
                  <h3 className="text-[11px] font-semibold tracking-[0.18em] text-ink/60 uppercase">
                    {PERIOD_LABEL[period]}
                  </h3>
                  <span className="text-[11px] text-ink/40">
                    {hasSlots
                      ? `${periodSlots.length} slot${periodSlots.length === 1 ? "" : "s"}`
                      : "No slots available"}
                  </span>
                </div>
                {hasSlots && (
                  <ChevronDownIcon
                    className={`size-4 text-ink/50 transition-transform ${
                      expanded ? "rotate-180" : ""
                    }`}
                  />
                )}
              </button>
              {expanded && (
                <ul className="px-3 pb-3 flex flex-col gap-3">
                  {periodSlots.map((slot) => {
                    const started = hasSlotStarted(
                      selectedDateValue,
                      slot.startTime,
                      currentDateValue,
                      currentTimeValue,
                    );
                    const bookedByCurrentUser =
                      slot.currentUserBookingId !== null;
                    const fullForOthers =
                      !slot.isAvailable && !bookedByCurrentUser;
                    const unavailable = fullForOthers || started;
                    const selected = selectedSlot === slot.id;
                    return (
                      <li
                        key={slot.id}
                        className={`flex flex-col gap-3 rounded-xl px-4 py-3 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                          unavailable
                            ? "bg-surface/60 opacity-50 grayscale"
                            : bookedByCurrentUser
                              ? "bg-surface ring-1 ring-brand/60"
                            : selected
                              ? "bg-surface ring-1 ring-brand"
                              : "bg-surface"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden="true"
                            className={`size-2.5 rounded-full ${
                              bookedByCurrentUser && !started
                                ? "bg-brand"
                                : slotBulletClass(unavailable ? 0 : slot.paxLeft)
                            }`}
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
                        <div className="flex items-center justify-between gap-3 sm:justify-end sm:gap-4">
                          <span
                            className={`text-xs font-medium ${
                              bookedByCurrentUser && !started
                                ? "text-brand"
                                : unavailable
                                  ? "text-red-600/80"
                                  : "text-ink/55"
                            }`}
                          >
                            {bookedByCurrentUser
                              ? "Booked"
                              : unavailable
                              ? started
                                ? "Closed"
                                : "Not available"
                              : `${slot.paxLeft} of ${slot.capacityPax} pax left`}
                          </span>
                          {bookedByCurrentUser ? (
                            <form action={cancelFormAction}>
                              <input
                                type="hidden"
                                name="facility"
                                value={facilitySlug}
                              />
                              <input
                                type="hidden"
                                name="bookingDate"
                                value={selectedDateValue}
                              />
                              <input
                                type="hidden"
                                name="timeSlotId"
                                value={slot.id}
                              />
                              <button
                                type="submit"
                                disabled={started || pending}
                                className={`text-sm font-medium ${
                                  started || pending
                                    ? "text-ink/30 cursor-not-allowed"
                                    : "text-red-600 hover:underline"
                                }`}
                              >
                                {started
                                  ? "Closed"
                                  : cancelPending
                                    ? "Cancelling..."
                                    : "Cancel booking"}
                              </button>
                            </form>
                          ) : (
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
                              {unavailable
                                ? started
                                  ? "Closed"
                                  : "Full"
                                : selected
                                  ? "Selected"
                                  : "Select"}
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <form action={reserveFormAction} className="mt-6">
        <input type="hidden" name="facility" value={facilitySlug} />
        <input type="hidden" name="bookingDate" value={selectedDateValue} />
        <input type="hidden" name="timeSlotId" value={selectedSlot ?? ""} />

        <button
          type="submit"
          disabled={!canReserveSelectedSlot || pending}
          className={`w-full rounded-full px-6 py-2.5 text-sm font-medium transition-colors ${
            !canReserveSelectedSlot || pending
              ? "bg-surface text-ink/40 cursor-not-allowed"
              : "bg-brand text-white hover:bg-brand/90"
          }`}
        >
          {reservePending ? "Reserving..." : "Reserve Now"}
        </button>
      </form>
    </div>
  );
}
