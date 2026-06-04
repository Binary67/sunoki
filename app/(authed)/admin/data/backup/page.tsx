import { requireSuperAdminUser } from "@/src/lib/admin-auth";
import {
  getExportTableSummaries,
  type ExportTableSummary,
} from "@/src/lib/admin-data/table-export";
import {
  getBackupImportDraft,
  type BackupCellDiff,
  type BackupImportDraft,
  type BackupImportError,
  type BackupRowDiff,
  type BackupTableDiff,
} from "@/src/lib/admin-data/backup";
import {
  DataEditorHeader,
  getSingleValue,
  LocalTabNav,
  StatusMessage,
} from "../AdminDataView";
import {
  confirmBackupImportAction,
  uploadBackupWorkbookAction,
} from "./actions";

type PageProps = {
  searchParams: Promise<{
    draft?: string | string[];
    error?: string | string[];
    success?: string | string[];
    tab?: string | string[];
  }>;
};

type BackupTab = "export" | "restore";

export default async function AdminDataBackupPage({
  searchParams,
}: PageProps) {
  const actor = await requireSuperAdminUser();
  const query = await searchParams;
  const activeTab = getBackupTab(getSingleValue(query.tab));
  const draftToken = getSingleValue(query.draft);
  const draft =
    activeTab === "restore" && draftToken
      ? getBackupImportDraft(draftToken, actor)
      : null;
  const draftExpired = Boolean(activeTab === "restore" && draftToken && !draft);
  const exportTables = getExportTableSummaries(3);

  return (
    <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <DataEditorHeader
        title="Backup & Restore"
        description="Export selected operations tables or restore a complete Sunoki backup workbook."
      />
      <LocalTabNav
        activeTab={activeTab}
        tabs={[
          {
            label: "Export Tables",
            value: "export",
            href: "/admin/data/backup?tab=export",
          },
          {
            label: "Restore Backup",
            value: "restore",
            href: "/admin/data/backup?tab=restore",
          },
        ]}
      />
      <StatusMessage
        error={
          getSingleValue(query.error) ??
          (draftExpired ? "Import draft expired or was not found." : undefined)
        }
        success={getSingleValue(query.success)}
      />

      {activeTab === "export" ? (
        <ExportTablesPanel tables={exportTables} />
      ) : (
        <RestoreBackupPanel draft={draft} />
      )}
    </main>
  );
}

function ExportTablesPanel({ tables }: { tables: ExportTableSummary[] }) {
  return (
    <form
      action="/admin/data/backup/table-export"
      method="get"
      className="space-y-4"
    >
      <section className="rounded-lg border border-black/5 bg-surface">
        <div className="flex flex-col gap-3 border-b border-black/5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-base font-semibold text-ink">Export Tables</h2>
            <p className="mt-1 text-xs text-ink/55">
              Reporting workbook only. Restore uses the full backup workbook.
            </p>
          </div>
          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand/90 sm:w-auto"
          >
            Export Selected Tables
          </button>
        </div>

        <div className="divide-y divide-black/5">
          {tables.map((table) => (
            <div key={table.tableName} className="px-4 py-4 sm:px-5">
              <input
                id={`preview-${table.tableName}`}
                type="checkbox"
                className="peer sr-only"
                aria-label={`Toggle ${table.label} preview`}
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="table"
                    value={table.tableName}
                    defaultChecked
                    className="h-4 w-4 rounded border-black/20 text-brand"
                  />
                  <span className="text-sm font-semibold text-ink">
                    {table.label}
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="w-fit rounded-md border border-black/5 bg-white px-2.5 py-1 text-xs text-ink/55">
                    {table.rowCount} {table.rowCount === 1 ? "row" : "rows"}
                  </span>
                  <label
                    htmlFor={`preview-${table.tableName}`}
                    className="inline-flex cursor-pointer rounded-md border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-ink/65 hover:text-ink"
                  >
                    Preview
                  </label>
                </div>
              </div>
              <div className="mt-3 hidden peer-checked:block">
                <TablePreview table={table} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </form>
  );
}

function TablePreview({ table }: { table: ExportTableSummary }) {
  return (
    <div className="max-h-[320px] overflow-auto rounded-md border border-black/5 bg-white">
      <table className="w-max min-w-full text-xs">
        <thead className="sticky top-0 bg-surface text-[11px] uppercase tracking-[0.14em] text-ink/50">
          <tr>
            {table.columns.map((column) => (
              <th
                key={column}
                className="whitespace-nowrap px-3 py-2 text-left font-medium"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.previewRows.length === 0 ? (
            <tr className="border-t border-black/5">
              <td
                colSpan={table.columns.length}
                className="px-3 py-6 text-center text-sm text-ink/55"
              >
                No rows in this table.
              </td>
            </tr>
          ) : (
            table.previewRows.map((row, index) => (
              <tr
                key={typeof row.id === "number" ? row.id : index}
                className="border-t border-black/5"
              >
                {table.columns.map((column) => (
                  <td
                    key={column}
                    className="max-w-[240px] whitespace-nowrap px-3 py-2 text-ink/70"
                  >
                    <span className="block overflow-hidden text-ellipsis">
                      {formatPreviewValue(row[column])}
                    </span>
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function RestoreBackupPanel({ draft }: { draft: BackupImportDraft | null }) {
  return (
    <>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="rounded-lg border border-black/5 bg-surface px-4 py-5 sm:px-5">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Full Backup Workbook
            </h2>
            <p className="mt-1 text-xs leading-5 text-ink/55">
              Download the complete restorable workbook for guest operations.
            </p>
          </div>
          <div className="mt-5">
            <a
              href="/admin/data/backup/export"
              download
              className="inline-flex h-9 items-center justify-center rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand/90"
            >
              Export Full Backup
            </a>
          </div>
        </section>

        <section className="rounded-lg border border-black/5 bg-surface px-4 py-5 sm:px-5">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Validate Workbook
            </h2>
            <p className="mt-1 text-xs leading-5 text-ink/55">
              Upload a full backup workbook. The database is not changed until
              the preview is confirmed.
            </p>
          </div>
          <form action={uploadBackupWorkbookAction} className="mt-5 space-y-4">
            <input
              type="file"
              name="workbook"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              required
              className="block w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink/70"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90"
              >
                Validate Excel
              </button>
            </div>
          </form>
        </section>
      </div>

      {draft && <BackupDraftPreview draft={draft} />}
    </>
  );
}

function BackupDraftPreview({ draft }: { draft: BackupImportDraft }) {
  const { payload } = draft;
  const totalChanges = payload.diff.reduce(
    (sum, table) => sum + table.changes.length,
    0,
  );
  const hasErrors = payload.errors.length > 0;

  return (
    <section className="mt-7 rounded-lg border border-black/5 px-4 py-5 sm:px-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">
            Validation Preview
          </h2>
          <p className="mt-1 text-xs leading-5 text-ink/55">
            Draft expires at {draft.expiresAt}.
          </p>
        </div>
        {!hasErrors && totalChanges > 0 && (
          <form action={confirmBackupImportAction}>
            <input type="hidden" name="draftToken" value={draft.token} />
            <button
              type="submit"
              className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
            >
              Apply Restore
            </button>
          </form>
        )}
      </div>

      {hasErrors ? (
        <ValidationErrors errors={payload.errors} />
      ) : (
        <>
          <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            Applying this restore makes the uploaded workbook the source of
            truth for guest operations data and required references. Review the
            changes before continuing.
          </div>
          <DiffSummary diff={payload.diff} />
        </>
      )}
    </section>
  );
}

function ValidationErrors({ errors }: { errors: BackupImportError[] }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3">
      <h3 className="text-sm font-semibold text-red-900">
        Fix these errors before applying
      </h3>
      <ul className="mt-3 space-y-2 text-sm text-red-800">
        {errors.map((error, index) => (
          <li key={`${error.message}-${index}`}>
            {formatErrorLocation(error)}
            {error.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DiffSummary({ diff }: { diff: BackupTableDiff[] }) {
  const totalChanges = diff.reduce((sum, table) => sum + table.changes.length, 0);

  if (totalChanges === 0) {
    return (
      <div className="rounded-lg border border-black/5 bg-surface px-6 py-10 text-center text-sm text-ink/60">
        No changes detected.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {diff.map((table) => (
        <div key={table.tableName} className="rounded-lg border border-black/5">
          <div className="flex flex-col gap-2 border-b border-black/5 bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-ink">{table.label}</h3>
            <div className="flex flex-wrap gap-2 text-xs text-ink/60">
              <span>{table.inserted} added</span>
              <span>{table.updated} updated</span>
              <span>{table.deleted} deleted</span>
              <span>{table.unchanged} unchanged</span>
            </div>
          </div>
          {table.changes.length === 0 ? (
            <div className="px-4 py-4 text-sm text-ink/55">No changes.</div>
          ) : (
            <ul className="divide-y divide-black/5">
              {table.changes.map((change) => (
                <li key={`${change.kind}-${change.rowId}`} className="px-4 py-3">
                  <RowChange change={change} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function RowChange({ change }: { change: BackupRowDiff }) {
  return (
    <div className="text-sm">
      <div className="font-medium text-ink">
        {formatChangeKind(change.kind)} row #{change.rowId}
      </div>
      {change.kind === "update" ? (
        <ul className="mt-2 space-y-1 text-xs leading-5 text-ink/65">
          {change.cells.map((cell) => (
            <li key={cell.columnName}>
              <CellDiff cell={cell} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-1 text-xs text-ink/55">
          {change.cells.length} columns affected
        </div>
      )}
    </div>
  );
}

function CellDiff({ cell }: { cell: BackupCellDiff }) {
  return (
    <>
      <span className="font-medium text-ink/75">{cell.columnName}</span>
      <span>: </span>
      <span>{formatValue(cell.before)}</span>
      <span>{" -> "}</span>
      <span>{formatValue(cell.after)}</span>
    </>
  );
}

function formatErrorLocation(error: BackupImportError): string {
  const parts = [
    error.tableName,
    error.rowNumber ? `row ${error.rowNumber}` : null,
    error.columnName,
  ].filter(Boolean);
  return parts.length > 0 ? `${parts.join(" / ")}: ` : "";
}

function formatChangeKind(kind: BackupRowDiff["kind"]): string {
  switch (kind) {
    case "insert":
      return "Add";
    case "update":
      return "Update";
    case "delete":
      return "Delete";
  }
}

function formatValue(value: string | number | null): string {
  if (value === null || value === "") return "(blank)";
  return String(value);
}

function formatPreviewValue(
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined || value === "") return "(blank)";
  const text = String(value);
  return text.length > 96 ? `${text.slice(0, 96)}...` : text;
}

function getBackupTab(value: string | undefined): BackupTab {
  return value === "restore" ? "restore" : "export";
}
