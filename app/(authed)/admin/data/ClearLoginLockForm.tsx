"use client";

import { clearLoginLockAction } from "./actions";

export default function ClearLoginLockForm({
  label,
  userId,
}: {
  label: string;
  userId: number;
}) {
  return (
    <form
      action={clearLoginLockAction}
      onSubmit={(event) => {
        if (!window.confirm(`Clear temporary login lock for ${label}?`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
      >
        Clear Login Lock
      </button>
    </form>
  );
}
