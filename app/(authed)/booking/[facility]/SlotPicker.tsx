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

export default function SlotPicker({
  facilitySlug,
  selectedDateValue,
  slots,
}: {
  facilitySlug: FacilitySlug;
  selectedDateValue: string;
  slots: FacilitySlotAvailability[];
}) {
  const { showToast } = useToast();
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [expandedPeriods, setExpandedPeriods] = useState<
    Record<SlotPeriod, boolean>
  >({ morning: false, afternoon: false, evening: false });
  const [state, rawFormAction, pending] = useActionState(
    reserveFacilitySlotAction,
    initialActionState,
  );
  const lastNotifiedSubmissionId = useRef<number | undefined>(undefined);

  const formAction = (formData: FormData) => {
    setSelectedSlot(null);
    rawFormAction(formData);
  };

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
    } else if (state.error) {
      showToast({
        tone: "error",
        title: "Couldn't reserve",
        description: state.error,
      });
    }
  }, [state, showToast]);

  const selectedDate = parseBookingDate(selectedDateValue);
  const selectedDateLabel = `${WEEKDAY_NAMES[selectedDate.getDay()]}, ${
    MONTH_NAMES[selectedDate.getMonth()]
  } ${ordinal(selectedDate.getDate())}`;
  const selectedSlotRecord = slots.find((slot) => slot.id === selectedSlot);
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
                            {unavailable
                              ? "Full"
                              : selected
                                ? "Selected"
                                : "Select"}
                          </button>
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

      <form action={formAction} className="mt-6">
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
  );
}
