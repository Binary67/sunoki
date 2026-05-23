"use client";

import { revokeUserSessionsAction } from "./actions";

export default function RevokeSessionsForm({
  label,
  userId,
}: {
  label: string;
  userId: number;
}) {
  return (
    <form
      action={revokeUserSessionsAction}
      onSubmit={(event) => {
        if (!window.confirm(`Revoke all active sessions for ${label}?`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        className="rounded-md border border-amber-200 px-2.5 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50"
      >
        Revoke Sessions
      </button>
    </form>
  );
}
