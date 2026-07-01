"use client";

export default function PrintBookingCountDetailsButton() {
  return (
    <button
      className="booking-count-print-hidden inline-flex h-9 items-center rounded-md bg-brand px-3 text-sm font-medium text-white hover:bg-brand/90"
      onClick={() => window.print()}
      type="button"
    >
      Print
    </button>
  );
}
