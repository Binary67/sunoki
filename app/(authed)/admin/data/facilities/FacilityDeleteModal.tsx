"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import type { FacilityDeletionImpact } from "@/src/lib/admin-data/queries";
import { deleteFacilityAction } from "../actions";

export default function FacilityDeleteModal({
  cancelHref,
  impact,
}: {
  cancelHref: string;
  impact: FacilityDeletionImpact;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLElement>(null);
  const continueButtonRef = useRef<HTMLButtonElement>(null);
  const confirmationInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"warning" | "confirmation">("warning");
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    if (step === "warning") continueButtonRef.current?.focus();
    else confirmationInputRef.current?.focus();
  }, [step]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  function closeModal() {
    router.replace(cancelHref);
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeModal();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([type="hidden"]):not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      aria-describedby="facility-delete-description"
      aria-labelledby="facility-delete-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6"
      onKeyDown={handleDialogKeyDown}
      role="dialog"
    >
      <button
        aria-label="Cancel facility deletion"
        className="absolute inset-0 cursor-default"
        onClick={closeModal}
        tabIndex={-1}
        type="button"
      />
      <section
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-xl"
        ref={dialogRef}
      >
        <div className="flex items-start justify-between gap-4 border-b border-black/10 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-600">
              Permanent deletion
            </p>
            <h2 className="mt-1 text-lg font-semibold text-ink" id="facility-delete-title">
              {step === "warning"
                ? `Delete “${impact.name}”?`
                : "Confirm Permanent Deletion"}
            </h2>
          </div>
          <button
            aria-label="Cancel facility deletion"
            className="grid size-8 shrink-0 place-items-center rounded-md text-xl leading-none text-ink/55 hover:bg-surface hover:text-ink"
            onClick={closeModal}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        {step === "warning" ? (
          <div className="px-5 py-5">
            <div
              className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
              id="facility-delete-description"
            >
              This will permanently delete this facility and{" "}
              <strong>{formatBookingCount(impact.relatedBookingCount)}</strong>
              {impact.upcomingBookingCount > 0 && (
                <>
                  , including{" "}
                  <strong>{formatUpcomingCount(impact.upcomingBookingCount)}</strong>
                </>
              )}
              . They will disappear from the dashboard, guest profiles, reports,
              and backup exports. This action cannot be undone.
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                className="h-10 rounded-md border border-black/10 px-4 text-sm font-medium text-ink/70 hover:bg-surface"
                onClick={closeModal}
                type="button"
              >
                Cancel
              </button>
              <button
                className="h-10 rounded-md bg-red-700 px-4 text-sm font-medium text-white hover:bg-red-800"
                onClick={() => setStep("confirmation")}
                ref={continueButtonRef}
                type="button"
              >
                I Understand, Continue
              </button>
            </div>
          </div>
        ) : (
          <form
            action={deleteFacilityAction}
            className="px-5 py-5"
            onSubmit={(event) => {
              if (confirmation !== "delete") event.preventDefault();
            }}
          >
            <p className="text-sm leading-6 text-ink/65" id="facility-delete-description">
              Type <strong className="font-semibold text-ink">delete</strong> below
              to permanently delete “{impact.name}” and its related bookings.
            </p>
            <input name="facilityId" type="hidden" value={impact.id} />
            <label
              className="mt-4 block text-sm font-medium text-ink/75"
              htmlFor="facility-delete-confirmation"
            >
              Confirmation
              <input
                autoComplete="off"
                className="mt-1 h-10 w-full rounded-md border border-black/10 px-3 text-sm text-ink outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/15"
                id="facility-delete-confirmation"
                name="confirmation"
                onChange={(event) => setConfirmation(event.currentTarget.value)}
                ref={confirmationInputRef}
                spellCheck={false}
                value={confirmation}
              />
            </label>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                className="h-10 rounded-md border border-black/10 px-4 text-sm font-medium text-ink/70 hover:bg-surface"
                onClick={() => {
                  setConfirmation("");
                  setStep("warning");
                }}
                type="button"
              >
                Back
              </button>
              <button
                className="h-10 rounded-md bg-red-700 px-4 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-red-300"
                disabled={confirmation !== "delete"}
                type="submit"
              >
                Permanently Delete
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

function formatBookingCount(count: number): string {
  return `${count} related ${count === 1 ? "booking" : "bookings"}`;
}

function formatUpcomingCount(count: number): string {
  return `${count} upcoming ${count === 1 ? "booking" : "bookings"}`;
}
