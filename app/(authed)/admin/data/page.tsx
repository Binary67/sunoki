import Link from "next/link";
import {
  EDITABLE_TABLE_NAMES,
  getAdminTableLabel,
  getDefaultAdminTableName,
  isEditableTableName,
  type AdminColumnDefinition,
  type AdminRow,
  type AdminSelectOptions,
  type EditableTableName,
} from "@/src/lib/admin-data/definitions";
import {
  getAdminRowForEdit,
  getAdminTableView,
} from "@/src/lib/admin-data/queries";
import AdminFormFields from "./AdminFormFields";
import { createAdminRowAction, updateAdminRowAction } from "./actions";
import DeleteRowForm from "./DeleteRowForm";

type PageProps = {
  searchParams: Promise<{
    table?: string | string[];
    edit?: string | string[];
    error?: string | string[];
    success?: string | string[];
  }>;
};

export default async function AdminDataPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const selectedTable = getSelectedTable(getSingleValue(query.table));
  const editId = getEditId(getSingleValue(query.edit));
  const error = getSingleValue(query.error);
  const success = getSingleValue(query.success);
  const view = getAdminTableView(selectedTable);
  const editRow = editId
    ? getAdminRowForEdit(selectedTable, editId)
    : null;
  const editableColumns = view.table.columns.filter(
    (column) => !column.readOnly,
  );

  return (
    <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink sm:text-2xl">
            Data Editor
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-ink/60">
            Edit SQLite records through validated admin forms. Audit history is
            recorded for every successful change made here.
          </p>
        </div>
        <Link
          href="/admin/audit-log"
          className="inline-flex h-9 items-center justify-center rounded-md border border-black/10 px-3 text-sm font-medium text-ink/75 hover:bg-surface"
        >
          View Audit Log
        </Link>
      </div>

      <nav className="mb-6 flex flex-wrap gap-2">
        {EDITABLE_TABLE_NAMES.map((tableName) => {
          const active = tableName === selectedTable;
          return (
            <Link
              key={tableName}
              href={`/admin/data?table=${tableName}`}
              className={`rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-brand text-white"
                  : "bg-surface text-ink/70 hover:text-ink"
              }`}
            >
              {getAdminTableLabel(tableName)}
            </Link>
          );
        })}
      </nav>

      {(error || success) && (
        <div
          role={error ? "alert" : "status"}
          className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {error ?? success}
        </div>
      )}

      <section className="mb-7 rounded-lg border border-black/5 bg-surface px-4 py-5 sm:px-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-ink">
            Create {getSingularLabel(selectedTable)}
          </h2>
          <p className="mt-1 text-xs leading-5 text-ink/55">
            IDs and timestamp defaults are assigned by SQLite.
          </p>
        </div>
        <form action={createAdminRowAction}>
          <input type="hidden" name="tableName" value={selectedTable} />
          <AdminFormFields
            key={`create-${selectedTable}`}
            columns={editableColumns}
            formId="create"
            options={view.selectOptions}
            tableName={selectedTable}
          />
          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90"
            >
              Create Row
            </button>
          </div>
        </form>
      </section>

      {editId && (
        <section className="mb-7 rounded-lg border border-brand/20 px-4 py-5 sm:px-5">
          {editRow ? (
            <>
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-ink">
                    Edit Row #{editId}
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-ink/55">
                    Update editable fields for the selected row.
                  </p>
                </div>
                <Link
                  href={`/admin/data?table=${selectedTable}`}
                  className="text-sm font-medium text-brand hover:underline"
                >
                  Cancel
                </Link>
              </div>
              <form action={updateAdminRowAction}>
                <input type="hidden" name="tableName" value={selectedTable} />
                <input type="hidden" name="rowId" value={editId} />
                <AdminFormFields
                  key={`edit-${selectedTable}-${editId}`}
                  columns={editableColumns}
                  formId={`edit-${editId}`}
                  options={view.selectOptions}
                  row={editRow}
                  tableName={selectedTable}
                />
                <div className="mt-5 flex justify-end">
                  <button
                    type="submit"
                    className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="text-sm text-red-700">Row #{editId} not found.</div>
          )}
        </section>
      )}

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-ink">
            {view.table.label}
          </h2>
          <span className="text-xs text-ink/50">
            {view.rows.length} {view.rows.length === 1 ? "row" : "rows"}
          </span>
        </div>

        {view.rows.length === 0 ? (
          <div className="rounded-lg border border-black/5 bg-surface px-6 py-10 text-center text-sm text-ink/60">
            No rows in this table.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-black/5">
            <table className="w-full min-w-[780px] text-sm">
              <thead className="bg-surface text-[11px] uppercase tracking-[0.14em] text-ink/50">
                <tr>
                  {view.table.columns.map((column) => (
                    <th
                      key={column.name}
                      className="px-4 py-3 text-left font-medium"
                    >
                      {column.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {view.rows.map((row) => {
                  const rowId = Number(row.id);
                  return (
                    <tr key={rowId} className="border-t border-black/5">
                      {view.table.columns.map((column) => (
                        <td
                          key={column.name}
                          className="max-w-[260px] px-4 py-3 text-ink/80"
                        >
                          <span className="block truncate">
                            {formatCellValue(column, row, view.selectOptions)}
                          </span>
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/data?table=${selectedTable}&edit=${rowId}`}
                            className="rounded-md border border-black/10 px-2.5 py-1.5 text-xs font-medium text-ink/70 hover:bg-surface"
                          >
                            Edit
                          </Link>
                          <DeleteRowForm
                            tableName={selectedTable}
                            rowId={rowId}
                            label={`${view.table.label} row #${rowId}`}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function getSingleValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getSelectedTable(value: string | undefined): EditableTableName {
  return value && isEditableTableName(value)
    ? value
    : getDefaultAdminTableName();
}

function getSingularLabel(tableName: EditableTableName): string {
  switch (tableName) {
    case "users":
      return "User";
    case "facility_time_slots":
      return "Time Slot";
    case "facility_bookings":
      return "Booking";
  }
}

function getEditId(value: string | undefined): number | null {
  if (!value) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function formatCellValue(
  column: AdminColumnDefinition,
  row: AdminRow,
  options: AdminSelectOptions,
): string {
  const value = row[column.name];
  if (value === null || value === undefined) return "";
  if (column.optionsKey) {
    const option = options[column.optionsKey].find(
      (candidate) => candidate.value === String(value),
    );
    if (option) return option.label;
  }
  return String(value);
}
