import Link from "next/link";
import {
  isUpdateOnlyAdminTable,
  type AdminColumnDefinition,
  type AdminRow,
  type AdminSelectOptions,
  type AdminTableView,
  type EditableTableName,
} from "@/src/lib/admin-data/definitions";
import type { User } from "@/src/lib/db";
import AdminFormFields from "./AdminFormFields";
import {
  createAdminRowAction,
  updateAdminRowAction,
  updateUserPasswordAction,
} from "./actions";
import {
  canEditRecord,
  canManageUserRecord,
  getCannotEditRowMessage,
  getUserLabel,
  getUserRole,
} from "./AdminDataRules";

export type UserCreateMode = "guest" | "admin";

export function CreateFormSection({
  cancelHref,
  createMode = "guest",
  formSelectOptions,
  tableName,
  view,
}: {
  cancelHref?: string;
  createMode?: UserCreateMode;
  formSelectOptions?: AdminSelectOptions;
  tableName: EditableTableName;
  view: AdminTableView;
}) {
  if (isUpdateOnlyAdminTable(tableName)) return null;

  const options = formSelectOptions ?? view.selectOptions;
  const editableColumns = getEditableColumns(view);
  const createColumns =
    tableName === "users"
      ? getUserCreateColumns(editableColumns, createMode)
      : editableColumns;
  const createOptions =
    tableName === "users" && createMode === "admin"
      ? getAdminUserCreateOptions(options)
      : options;
  const createFixedRole =
    tableName === "users" && createMode === "guest" ? "guest" : undefined;

  return (
    <section className="mb-7 rounded-lg border border-black/5 bg-surface px-4 py-5 sm:px-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">
            Create {getCreateLabel(tableName, createMode)}
          </h2>
          <p className="mt-1 text-xs leading-5 text-ink/55">
            {tableName === "guest_service_bookings"
              ? "Package service availability and guest booking rules still apply."
              : "IDs and timestamp defaults are assigned by SQLite."}
          </p>
        </div>
        {cancelHref && (
          <Link
            href={cancelHref}
            className="text-sm font-medium text-brand hover:underline"
          >
            Cancel
          </Link>
        )}
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
  formSelectOptions,
  tableName,
  view,
}: {
  actor: User;
  cancelHref: string;
  editId: number | null;
  editRow: AdminRow | null;
  formSelectOptions?: AdminSelectOptions;
  tableName: EditableTableName;
  view: AdminTableView;
}) {
  if (!editId) return null;

  const options = formSelectOptions ?? view.selectOptions;
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
    (!editRow || tableName !== "users" || canManageUserRecord(actor, editRow)) &&
    (!editRow || canEditRecord(tableName, editRow));

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
              options={options}
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
          {getCannotEditRowMessage(tableName)}
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

function getEditableColumns(view: AdminTableView): AdminColumnDefinition[] {
  return view.table.columns.filter((column) => !column.readOnly);
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
    case "service_booking_limits":
      return "Booking Limit";
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
