import Link from "next/link";
import { requireAdminUser } from "@/src/lib/admin-auth";
import { getActiveLoginLock } from "@/src/lib/login-attempts";
import {
  EDITABLE_TABLE_NAMES,
  getAdminTableLabel,
  getDefaultAdminTableName,
  isEditableTableName,
  isUpdateOnlyAdminTable,
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
import ClearLoginLockForm from "./ClearLoginLockForm";
import DeleteRowForm from "./DeleteRowForm";
import RevokeSessionsForm from "./RevokeSessionsForm";

type UserCreateMode = "guest" | "admin";

type PageProps = {
  searchParams: Promise<{
    table?: string | string[];
    create?: string | string[];
    edit?: string | string[];
    error?: string | string[];
    success?: string | string[];
  }>;
};

export default async function AdminDataPage({ searchParams }: PageProps) {
  const actor = await requireAdminUser();
  const query = await searchParams;
  const selectedTable = getSelectedTable(getSingleValue(query.table));
  const updateOnly = isUpdateOnlyAdminTable(selectedTable);
  const canManageAdminUsers = actor.role === "superadmin";
  const createMode = getUserCreateMode(
    getSingleValue(query.create),
    canManageAdminUsers,
  );
  const editId = getEditId(getSingleValue(query.edit));
  const error = getSingleValue(query.error);
  const success = getSingleValue(query.success);
  const view = getAdminTableView(selectedTable, actor);
  const editRow = editId
    ? getAdminRowForEdit(selectedTable, editId, actor)
    : null;
  const editableColumns = view.table.columns.filter(
    (column) => !column.readOnly,
  );
  const createColumns =
    selectedTable === "users"
      ? getUserCreateColumns(editableColumns, createMode)
      : editableColumns;
  const createOptions =
    selectedTable === "users" && createMode === "admin"
      ? getAdminUserCreateOptions(view.selectOptions)
      : view.selectOptions;
  const createFixedRole =
    selectedTable === "users" && createMode === "guest" ? "guest" : undefined;
  const editColumns =
    selectedTable === "users" && !canManageAdminUsers
      ? editableColumns.filter((column) => column.name !== "role")
      : editableColumns;
  const editFixedRole =
    selectedTable === "users" && !canManageAdminUsers ? "guest" : undefined;

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

      {!updateOnly && (
        <section className="mb-7 rounded-lg border border-black/5 bg-surface px-4 py-5 sm:px-5">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-ink">
              Create {getCreateLabel(selectedTable, createMode)}
            </h2>
            <p className="mt-1 text-xs leading-5 text-ink/55">
              IDs and timestamp defaults are assigned by SQLite.
            </p>
          </div>
          {selectedTable === "users" && canManageAdminUsers && (
            <nav className="mb-4 flex flex-wrap gap-2">
              {(["guest", "admin"] as const).map((mode) => {
                const active = mode === createMode;
                return (
                  <Link
                    key={mode}
                    href={`/admin/data?table=users&create=${mode}`}
                    className={`rounded-md px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-brand text-white"
                        : "bg-white text-ink/70 hover:text-ink"
                    }`}
                  >
                    Create {mode === "guest" ? "Guest" : "Admin"}
                  </Link>
                );
              })}
            </nav>
          )}
          <form action={createAdminRowAction}>
            <input type="hidden" name="tableName" value={selectedTable} />
            {selectedTable === "users" && (
              <input type="hidden" name="createMode" value={createMode} />
            )}
            {createFixedRole && (
              <input type="hidden" name="role" value={createFixedRole} />
            )}
            <AdminFormFields
              key={`create-${selectedTable}-${createMode}`}
              columns={createColumns}
              fixedUserRole={createFixedRole}
              formId="create"
              options={createOptions}
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
      )}

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
                {editFixedRole && (
                  <input type="hidden" name="role" value={editFixedRole} />
                )}
                <AdminFormFields
                  key={`edit-${selectedTable}-${editId}`}
                  columns={editColumns}
                  fixedUserRole={editFixedRole}
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
                  const canManageAccess =
                    selectedTable === "users" &&
                    canManageUserAccess(actor.role, row);
                  const username =
                    typeof row.username === "string" ? row.username : "";
                  const activeLoginLock = canManageAccess
                    ? getActiveLoginLock(username)
                    : null;
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
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Link
                            href={`/admin/data?table=${selectedTable}&edit=${rowId}`}
                            className="rounded-md border border-black/10 px-2.5 py-1.5 text-xs font-medium text-ink/70 hover:bg-surface"
                          >
                            Edit
                          </Link>
                          {activeLoginLock && (
                            <>
                              <span className="rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700">
                                Locked until {activeLoginLock.lockedUntil}
                              </span>
                              <ClearLoginLockForm
                                userId={rowId}
                                label={getUserLabel(row, rowId)}
                              />
                            </>
                          )}
                          {canManageAccess && (
                            <RevokeSessionsForm
                              userId={rowId}
                              label={getUserLabel(row, rowId)}
                            />
                          )}
                          {!updateOnly && (
                            <DeleteRowForm
                              tableName={selectedTable}
                              rowId={rowId}
                              label={`${view.table.label} row #${rowId}`}
                            />
                          )}
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
    case "facilities":
      return "Facility Content";
    case "facility_time_slots":
      return "Time Slot";
    case "facility_bookings":
      return "Booking";
  }
}

function getCreateLabel(
  tableName: EditableTableName,
  createMode: UserCreateMode,
): string {
  if (tableName === "users") {
    return createMode === "admin" ? "Admin User" : "Guest User";
  }
  return getSingularLabel(tableName);
}

function getUserCreateMode(
  value: string | undefined,
  canManageAdminUsers: boolean,
): UserCreateMode {
  if (canManageAdminUsers && value === "admin") return "admin";
  return "guest";
}

function getUserCreateColumns(
  columns: AdminColumnDefinition[],
  createMode: UserCreateMode,
): AdminColumnDefinition[] {
  if (createMode === "admin") {
    return columns.filter(
      (column) =>
        column.name !== "check_in_date" && column.name !== "check_out_date",
    );
  }
  return columns.filter((column) => column.name !== "role");
}

function getAdminUserCreateOptions(
  options: AdminSelectOptions,
): AdminSelectOptions {
  return {
    ...options,
    roles: options.roles.filter(
      (option) => option.value === "superadmin" || option.value === "admin",
    ),
  };
}

function getEditId(value: string | undefined): number | null {
  if (!value) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function canManageUserAccess(actorRole: string, row: AdminRow): boolean {
  const role = row.role;
  return (
    typeof role === "string" &&
    (actorRole === "superadmin" || role === "guest")
  );
}

function getUserLabel(row: AdminRow, rowId: number): string {
  const username = row.username;
  return typeof username === "string" && username ? username : `user #${rowId}`;
}

function formatCellValue(
  column: AdminColumnDefinition,
  row: AdminRow,
  options: AdminSelectOptions,
): string {
  const value = row[column.name];
  if (
    (column.name === "check_in_date" || column.name === "check_out_date") &&
    (value === null || value === undefined)
  ) {
    return "-";
  }
  if (value === null || value === undefined) return "";
  if (column.optionsKey) {
    const option = options[column.optionsKey].find(
      (candidate) => candidate.value === String(value),
    );
    if (option) return option.label;
  }
  return String(value);
}
