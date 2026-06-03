import Link from "next/link";
import type { ReactNode } from "react";
import { getActiveLoginLock } from "@/src/lib/login-attempts";
import {
  isUpdateOnlyAdminTable,
  type AdminColumnDefinition,
  type AdminTablePagination,
  type AdminRow,
  type AdminSelectOptions,
  type AdminTableView,
  type EditableTableName,
} from "@/src/lib/admin-data/definitions";
import type { User } from "@/src/lib/db";
import { UNLIMITED_PACKAGE_SERVICE_QUANTITY } from "@/src/lib/package-entitlements";
import AdminFormFields from "./AdminFormFields";
import {
  createAdminRowAction,
  updateAdminRowAction,
  updateUserPasswordAction,
} from "./actions";
import ClearLoginLockForm from "./ClearLoginLockForm";
import DeleteRowForm from "./DeleteRowForm";
import RevokeSessionsForm from "./RevokeSessionsForm";

export type UserCreateMode = "guest" | "admin";

export type TabLink<T extends string> = {
  label: string;
  value: T;
  href: string;
};

export function DataEditorHeader({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold text-ink sm:text-2xl">
          {title}
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-ink/60">
          {description}
        </p>
      </div>
      <Link
        href="/admin/audit-log"
        className="inline-flex h-9 items-center justify-center rounded-md border border-black/10 px-3 text-sm font-medium text-ink/75 hover:bg-surface"
      >
        View Audit Log
      </Link>
    </div>
  );
}

export function LocalTabNav<T extends string>({
  activeTab,
  tabs,
}: {
  activeTab: T;
  tabs: TabLink<T>[];
}) {
  return (
    <nav className="mb-6 flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          href={tab.href}
          className={`rounded-md px-3 py-2 text-sm transition-colors ${
            tab.value === activeTab
              ? "bg-brand text-white"
              : "bg-surface text-ink/70 hover:text-ink"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export function StatusMessage({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  if (!error && !success) return null;

  return (
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
  );
}

export function CreateFormSection({
  createMode = "guest",
  tableName,
  view,
}: {
  createMode?: UserCreateMode;
  tableName: EditableTableName;
  view: AdminTableView;
}) {
  if (isUpdateOnlyAdminTable(tableName)) return null;

  const editableColumns = getEditableColumns(view);
  const createColumns =
    tableName === "users"
      ? getUserCreateColumns(editableColumns, createMode)
      : editableColumns;
  const createOptions =
    tableName === "users" && createMode === "admin"
      ? getAdminUserCreateOptions(view.selectOptions)
      : view.selectOptions;
  const createFixedRole =
    tableName === "users" && createMode === "guest" ? "guest" : undefined;

  return (
    <section className="mb-7 rounded-lg border border-black/5 bg-surface px-4 py-5 sm:px-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-ink">
          Create {getCreateLabel(tableName, createMode)}
        </h2>
        <p className="mt-1 text-xs leading-5 text-ink/55">
          {tableName === "guest_service_bookings"
            ? "Package service availability and guest booking rules still apply."
            : "IDs and timestamp defaults are assigned by SQLite."}
        </p>
      </div>
      <form action={createAdminRowAction}>
        <input type="hidden" name="tableName" value={tableName} />
        {tableName === "users" && (
          <input type="hidden" name="createMode" value={createMode} />
        )}
        {createFixedRole && (
          <input type="hidden" name="role" value={createFixedRole} />
        )}
        <AdminFormFields
          key={`create-${tableName}-${createMode}`}
          columns={createColumns}
          fixedUserRole={createFixedRole}
          formId="create"
          options={createOptions}
          tableName={tableName}
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
  );
}

export function EditFormSection({
  actor,
  cancelHref,
  editId,
  editRow,
  tableName,
  view,
}: {
  actor: User;
  cancelHref: string;
  editId: number | null;
  editRow: AdminRow | null;
  tableName: EditableTableName;
  view: AdminTableView;
}) {
  if (!editId) return null;

  const editableColumns = getEditableColumns(view);
  const editColumns =
    tableName === "users"
      ? editableColumns.filter(
          (column) =>
            column.name !== "password" &&
            (actor.role === "superadmin" || column.name !== "role"),
        )
      : editableColumns;
  const editFixedRole =
    tableName === "users" && actor.role !== "superadmin" ? "guest" : undefined;
  const canEditRow =
    !editRow || tableName !== "users" || canManageUserRecord(actor, editRow);

  return (
    <section className="mb-7 rounded-lg border border-brand/20 px-4 py-5 sm:px-5">
      {editRow && canEditRow ? (
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
              href={cancelHref}
              className="text-sm font-medium text-brand hover:underline"
            >
              Cancel
            </Link>
          </div>
          <form action={updateAdminRowAction}>
            <input type="hidden" name="tableName" value={tableName} />
            <input type="hidden" name="rowId" value={editId} />
            {editFixedRole && (
              <input type="hidden" name="role" value={editFixedRole} />
            )}
            <AdminFormFields
              key={`edit-${tableName}-${editId}`}
              columns={editColumns}
              fixedUserRole={editFixedRole}
              formId={`edit-${editId}`}
              options={view.selectOptions}
              row={editRow}
              tableName={tableName}
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
      ) : editRow ? (
        <div className="text-sm text-ink/60">
          Guest accounts are managed from guest profiles.
        </div>
      ) : (
        <div className="text-sm text-red-700">Row #{editId} not found.</div>
      )}
    </section>
  );
}

export function SetPasswordFormSection({
  cancelHref,
  passwordId,
  passwordRow,
}: {
  cancelHref: string;
  passwordId: number | null;
  passwordRow: AdminRow | null;
}) {
  if (!passwordId) return null;

  return (
    <section className="mb-7 rounded-lg border border-brand/20 px-4 py-5 sm:px-5">
      {passwordRow ? (
        getUserRole(passwordRow) === "guest" ? (
          <div className="text-sm text-ink/60">
            Guest passwords are managed from guest profiles.
          </div>
        ) : (
          <>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">
                Set New Password
              </h2>
              <p className="mt-1 text-xs leading-5 text-ink/55">
                Update the password for {getUserLabel(passwordRow, passwordId)}.
                The current password is not shown.
              </p>
            </div>
            <Link
              href={cancelHref}
              className="text-sm font-medium text-brand hover:underline"
            >
              Cancel
            </Link>
          </div>
          <form action={updateUserPasswordAction}>
            <input type="hidden" name="userId" value={passwordId} />
            <label
              htmlFor={`password-${passwordId}`}
              className="block text-sm font-medium text-ink/75"
            >
              New Password <span className="text-red-600">*</span>
              <input
                id={`password-${passwordId}`}
                name="password"
                type="password"
                required
                autoComplete="new-password"
                className="mt-1 h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 sm:max-w-md"
              />
            </label>
            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90"
              >
                Save New Password
              </button>
            </div>
          </form>
        </>
        )
      ) : (
        <div className="text-sm text-red-700">
          User #{passwordId} not found.
        </div>
      )}
    </section>
  );
}

export function AdminTableSection({
  actionMode,
  actor,
  editHref,
  paginationHref,
  passwordHref,
  tableName,
  toolbar,
  view,
}: {
  actionMode: "records" | "user-access";
  actor: User;
  editHref?: (rowId: number) => string;
  paginationHref?: (page: number) => string;
  passwordHref?: (rowId: number) => string;
  tableName: EditableTableName;
  toolbar?: ReactNode;
  view: AdminTableView;
}) {
  const updateOnly = isUpdateOnlyAdminTable(tableName);
  const isPackageTable = tableName === "package_service_entitlements";
  const columns =
    actionMode === "user-access"
      ? getUserAccessColumns(view)
      : view.table.columns;
  const rowCountLabel = view.pagination
    ? getPaginationRangeLabel(view.pagination)
    : `${view.rows.length} ${view.rows.length === 1 ? "row" : "rows"}`;

  return (
    <section>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-base font-semibold text-ink">
          {actionMode === "user-access" ? "User Access" : view.table.label}
        </h2>
        <div className="flex flex-col gap-2 sm:items-end">
          {toolbar}
          <span className="text-xs text-ink/50">{rowCountLabel}</span>
        </div>
      </div>

      {view.rows.length === 0 ? (
        <div className="rounded-lg border border-black/5 bg-surface px-6 py-10 text-center text-sm text-ink/60">
          No rows in this table.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-black/5">
          <table
            className={`w-full text-sm ${
              isPackageTable ? "min-w-[2600px] table-fixed" : "min-w-[780px]"
            }`}
          >
            {isPackageTable && (
              <colgroup>
                {columns.map((column) => (
                  <col
                    key={column.name}
                    className={
                      column.name === "id"
                        ? "w-[72px]"
                        : column.name === "package_name"
                          ? "w-[180px]"
                          : column.name === "celebration_choice_rule"
                            ? "w-[170px]"
                            : "w-[128px]"
                    }
                  />
                ))}
                <col className="w-[120px]" />
              </colgroup>
            )}
            <thead className="bg-surface text-[11px] uppercase tracking-[0.14em] text-ink/50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.name}
                    className={`px-4 py-3 font-medium ${
                      isPackageTable
                        ? "whitespace-normal break-words text-left leading-5"
                        : "text-left"
                    }`}
                  >
                    {column.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-medium">
                  {actionMode === "user-access" ? "Access" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody>
              {view.rows.map((row) => {
                const rowId = Number(row.id);
                const canManageRecord =
                  tableName !== "users" || canManageUserRecord(actor, row);
                return (
                  <tr key={rowId} className="border-t border-black/5">
                    {columns.map((column) => (
                      <td
                        key={column.name}
                        className={`px-4 py-3 text-ink/80 ${
                          isPackageTable
                            ? getPackageCellClassName(column)
                            : "max-w-[260px]"
                        }`}
                      >
                        {tableName === "users" &&
                        actionMode === "records" &&
                        column.name === "password" ? (
                          canManageRecord ? (
                            <Link
                              href={
                                passwordHref
                                  ? passwordHref(rowId)
                                  : `/admin/data/users?tab=accounts&password=${rowId}`
                              }
                              className="inline-flex rounded-md border border-black/10 px-2.5 py-1.5 text-xs font-medium text-ink/70 hover:bg-surface"
                            >
                              Set New Password
                            </Link>
                          ) : (
                            <span className="text-xs text-ink/45">
                              Managed in profile
                            </span>
                          )
                        ) : (
                          <span
                            className={
                              isPackageTable
                                ? "block whitespace-normal break-words"
                                : "block truncate"
                            }
                          >
                            {formatCellValue(column, row, view.selectOptions)}
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {actionMode === "user-access" ? (
                          <UserAccessActions
                            actor={actor}
                            row={row}
                            rowId={rowId}
                          />
                        ) : (
                          <>
                            {canManageRecord && editHref && (
                              <Link
                                href={editHref(rowId)}
                                className="rounded-md border border-black/10 px-2.5 py-1.5 text-xs font-medium text-ink/70 hover:bg-surface"
                              >
                                Edit
                              </Link>
                            )}
                            {canManageRecord && !updateOnly && (
                              <DeleteRowForm
                                tableName={tableName}
                                rowId={rowId}
                                label={`${view.table.label} row #${rowId}`}
                              />
                            )}
                            {!canManageRecord && tableName === "users" && (
                              <span className="rounded-md bg-surface px-2.5 py-1.5 text-xs font-medium text-ink/55">
                                View only
                              </span>
                            )}
                          </>
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
      {view.pagination && paginationHref && (
        <PaginationControls
          hrefForPage={paginationHref}
          pagination={view.pagination}
        />
      )}
    </section>
  );
}

function getPackageCellClassName(column: AdminColumnDefinition): string {
  if (column.name === "id" || column.input === "packageQuantity") {
    return "text-center";
  }
  return "text-left";
}

function PaginationControls({
  hrefForPage,
  pagination,
}: {
  hrefForPage: (page: number) => string;
  pagination: AdminTablePagination;
}) {
  const hasPrevious = pagination.page > 1;
  const hasNext = pagination.page < pagination.totalPages;

  return (
    <div className="mt-4 flex flex-col gap-3 text-sm text-ink/65 sm:flex-row sm:items-center sm:justify-between">
      <span>
        Page {pagination.page} of {pagination.totalPages}
      </span>
      <div className="flex items-center gap-2">
        {hasPrevious ? (
          <Link
            href={hrefForPage(pagination.page - 1)}
            className="rounded-md border border-black/10 px-3 py-2 font-medium text-ink/70 hover:bg-surface"
          >
            Previous
          </Link>
        ) : (
          <span className="rounded-md border border-black/5 px-3 py-2 font-medium text-ink/35">
            Previous
          </span>
        )}
        {hasNext ? (
          <Link
            href={hrefForPage(pagination.page + 1)}
            className="rounded-md border border-black/10 px-3 py-2 font-medium text-ink/70 hover:bg-surface"
          >
            Next
          </Link>
        ) : (
          <span className="rounded-md border border-black/5 px-3 py-2 font-medium text-ink/35">
            Next
          </span>
        )}
      </div>
    </div>
  );
}

function getPaginationRangeLabel(pagination: AdminTablePagination): string {
  if (pagination.totalRows === 0) return "Showing 0 of 0";

  const firstRow = (pagination.page - 1) * pagination.pageSize + 1;
  const lastRow = Math.min(
    pagination.page * pagination.pageSize,
    pagination.totalRows,
  );

  return `Showing ${firstRow}-${lastRow} of ${pagination.totalRows}`;
}

export function getSingleValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function getEditId(value: string | undefined): number | null {
  if (!value) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function UserAccessActions({
  actor,
  row,
  rowId,
}: {
  actor: User;
  row: AdminRow;
  rowId: number;
}) {
  const canManageAccess = canManageUserAccess(actor.role, row);
  const username = typeof row.username === "string" ? row.username : "";
  const activeLoginLock = canManageAccess ? getActiveLoginLock(username) : null;

  if (!canManageAccess) {
    return (
      <span className="rounded-md bg-surface px-2.5 py-1.5 text-xs font-medium text-ink/55">
        Restricted
      </span>
    );
  }

  return (
    <>
      <span
        className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
          activeLoginLock
            ? "bg-red-50 text-red-700"
            : "bg-emerald-50 text-emerald-700"
        }`}
      >
        {activeLoginLock
          ? `Locked until ${activeLoginLock.lockedUntil}`
          : "No active lock"}
      </span>
      {activeLoginLock && (
        <ClearLoginLockForm userId={rowId} label={getUserLabel(row, rowId)} />
      )}
      <RevokeSessionsForm userId={rowId} label={getUserLabel(row, rowId)} />
    </>
  );
}

function getEditableColumns(view: AdminTableView): AdminColumnDefinition[] {
  return view.table.columns.filter((column) => !column.readOnly);
}

function getUserAccessColumns(view: AdminTableView): AdminColumnDefinition[] {
  return view.table.columns.filter((column) =>
    ["id", "username", "role", "active", "check_in_date", "check_out_date"].includes(
      column.name,
    ),
  );
}

function getSingularLabel(tableName: EditableTableName): string {
  switch (tableName) {
    case "users":
      return "User";
    case "facilities":
      return "Facility Content";
    case "facility_bookings":
      return "Booking";
    case "guest_service_bookings":
      return "Service Booking";
    case "package_service_entitlements":
      return "Package";
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

function canManageUserAccess(actorRole: string, row: AdminRow): boolean {
  const role = row.role;
  return (
    typeof role === "string" &&
    (actorRole === "superadmin" || role === "guest")
  );
}

function canManageUserRecord(actor: User, row: AdminRow): boolean {
  return actor.role === "superadmin" && getUserRole(row) !== "guest";
}

function getUserRole(row: AdminRow): string | null {
  return typeof row.role === "string" ? row.role : null;
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
  if (
    column.input === "packageQuantity" &&
    value === UNLIMITED_PACKAGE_SERVICE_QUANTITY
  ) {
    return "Unlimited";
  }
  if (column.optionsKey) {
    const option = options[column.optionsKey].find(
      (candidate) => candidate.value === String(value),
    );
    if (option) return option.label;
  }
  return String(value);
}
