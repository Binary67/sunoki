"use client";

import { deleteAdminRowAction } from "./actions";
import type { EditableTableName } from "@/src/lib/admin-data";

export default function DeleteRowForm({
  tableName,
  rowId,
  label,
}: {
  tableName: EditableTableName;
  rowId: number;
  label: string;
}) {
  return (
    <form
      action={deleteAdminRowAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Delete ${label}? Related rows may also be deleted by SQLite cascades.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="tableName" value={tableName} />
      <input type="hidden" name="rowId" value={rowId} />
      <button
        type="submit"
        className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
      >
        Delete
      </button>
    </form>
  );
}
