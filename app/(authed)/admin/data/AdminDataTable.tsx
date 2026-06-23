import Link from "next/link";
import type { ReactNode } from "react";
import { getActiveLoginLock } from "@/src/lib/login-attempts";
import {
  isUpdateOnlyAdminTable,
  type AdminColumnDefinition,
  type AdminRow,
  type AdminSelectOptions,
  type AdminTablePagination,
  type AdminTableView,
  type EditableTableName,
} from "@/src/lib/admin-data/definitions";
import type { User } from "@/src/lib/db";
import { UNLIMITED_PACKAGE_SERVICE_QUANTITY } from "@/src/lib/package-entitlements";
import ClearLoginLockForm from "./ClearLoginLockForm";
import DeleteRowForm from "./DeleteRowForm";
import RevokeSessionsForm from "./RevokeSessionsForm";
import {
  canEditRecord,
  canManageUserRecord,
  getUserLabel,
} from "./AdminDataRules";

export function AdminTableSection({
  actionMode,
  actor,
  editHref,
  filters,
  paginationHref,
  passwordHref,
  tableName,
  toolbar,
  view,
}: {
  actionMode: "records" | "user-access";
  actor: User;
  editHref?: (rowId: number) => string;
  filters?: ReactNode;
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
    ? getPaginationRangeLabel(view.pagination, view.rows.length)
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
      {filters && <div className="mb-4">{filters}</div>}

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
                              prefetch={false}
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
                            {canManageRecord &&
                              editHref &&
                              canEditRecord(tableName, row) && (
                                <Link
                                  href={editHref(rowId)}
                                  prefetch={false}
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
  return (
    <div className="mt-4 flex flex-col gap-3 text-sm text-ink/65 sm:flex-row sm:items-center sm:justify-between">
      <span>Page {pagination.page}</span>
      <div className="flex items-center gap-2">
        {pagination.hasPreviousPage ? (
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
        {pagination.hasNextPage ? (
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

function getPaginationRangeLabel(
  pagination: AdminTablePagination,
  rowCount: number,
): string {
  if (rowCount === 0) return "Showing 0";

  const firstRow = (pagination.page - 1) * pagination.pageSize + 1;
  const lastRow = firstRow + rowCount - 1;

  return firstRow === lastRow
    ? `Showing ${firstRow}`
    : `Showing ${firstRow}-${lastRow}`;
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

function getUserAccessColumns(view: AdminTableView): AdminColumnDefinition[] {
  return view.table.columns.filter((column) =>
    ["id", "username", "role", "active", "check_in_date", "check_out_date"].includes(
      column.name,
    ),
  );
}

function canManageUserAccess(actorRole: string, row: AdminRow): boolean {
  const role = row.role;
  return (
    typeof role === "string" &&
    (actorRole === "superadmin" || role === "guest")
  );
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
  if (column.name === "status" && typeof value === "string") {
    return formatStatusValue(value, row);
  }
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

function formatStatusValue(value: string, row: AdminRow): string {
  if (value === "cancelled") return "Cancelled";
  if (value !== "booked") return value;
  if (isEnabled(row.admin_done)) return "Done";
  if (isEnabled(row.admin_read)) return "Read";
  return "Booked";
}

function isEnabled(value: AdminRow[string]): boolean {
  return value === 1 || value === "1";
}
