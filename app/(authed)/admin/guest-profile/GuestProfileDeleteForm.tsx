"use client";

import type { GuestProfileStatus } from "@/src/lib/guest-profiles";
import { deleteGuestProfileAction } from "./actions";

export default function GuestProfileDeleteForm({
  iconOnly = false,
  label,
  profileId,
  status,
}: {
  iconOnly?: boolean;
  label: string;
  profileId: number;
  status?: GuestProfileStatus;
}) {
  const ariaLabel = `Delete ${label}`;

  return (
    <form
      action={deleteGuestProfileAction}
      onSubmit={(event) => {
        if (!window.confirm(`Delete ${label}?`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="profileId" value={profileId} />
      {status && <input type="hidden" name="status" value={status} />}
      <button
        type="submit"
        aria-label={iconOnly ? ariaLabel : undefined}
        title={iconOnly ? ariaLabel : undefined}
        className={
          iconOnly
            ? "grid size-9 place-items-center rounded-md border border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700"
            : "h-9 rounded-md border border-red-200 px-3 text-sm font-medium text-red-700 hover:bg-red-50"
        }
      >
        {iconOnly ? (
          <TrashIcon className="size-4" />
        ) : (
          "Delete"
        )}
      </button>
    </form>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}
