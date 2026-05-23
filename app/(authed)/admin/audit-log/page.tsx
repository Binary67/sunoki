import Link from "next/link";
import {
  EDITABLE_TABLE_NAMES,
  getAdminTableLabel,
  isAuditTableName,
  type AuditTableName,
} from "@/src/lib/admin-data/definitions";
import {
  AUDIT_OPERATIONS,
  getAuditLogs,
  isAuditOperation,
  type AuditOperation,
} from "@/src/lib/admin-data/audit";

type PageProps = {
  searchParams: Promise<{
    table?: string | string[];
    operation?: string | string[];
  }>;
};

export default async function AuditLogPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const tableName = getTableFilter(getSingleValue(query.table));
  const operation = getOperationFilter(getSingleValue(query.operation));
  const logs = getAuditLogs({ tableName, operation });

  return (
    <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink sm:text-2xl">
            Audit Log
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-ink/60">
            Review changes made through the admin data editor. Logs are
            read-only and shown newest first.
          </p>
        </div>
        <Link
          href="/admin/data/users"
          className="inline-flex h-9 items-center justify-center rounded-md border border-black/10 px-3 text-sm font-medium text-ink/75 hover:bg-surface"
        >
          Back to Data Editor
        </Link>
      </div>

      <form
        action="/admin/audit-log"
        className="mb-6 grid gap-4 rounded-lg border border-black/5 bg-surface px-4 py-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <label className="block text-sm font-medium text-ink/75">
          Table
          <select
            name="table"
            defaultValue={tableName ?? ""}
            className="mt-1 h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
          >
            <option value="">All tables</option>
            {EDITABLE_TABLE_NAMES.map((name) => (
              <option key={name} value={name}>
                {getAdminTableLabel(name)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-ink/75">
          Operation
          <select
            name="operation"
            defaultValue={operation ?? ""}
            className="mt-1 h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
          >
            <option value="">All operations</option>
            {AUDIT_OPERATIONS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="h-10 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand/90"
        >
          Apply Filters
        </button>
      </form>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-ink">Recent Changes</h2>
          <span className="text-xs text-ink/50">
            {logs.length} {logs.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="rounded-lg border border-black/5 bg-surface px-6 py-10 text-center text-sm text-ink/60">
            No audit entries found.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-black/5">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-surface text-[11px] uppercase tracking-[0.14em] text-ink/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Time</th>
                  <th className="px-4 py-3 text-left font-medium">Actor</th>
                  <th className="px-4 py-3 text-left font-medium">
                    Operation
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Table</th>
                  <th className="px-4 py-3 text-left font-medium">Row</th>
                  <th className="px-4 py-3 text-left font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t border-black/5">
                    <td className="px-4 py-3 text-ink/80">{log.createdAt}</td>
                    <td className="px-4 py-3 text-ink">
                      {log.actorUsername}
                      <span className="ml-1 text-xs text-ink/45">
                        #{log.actorUserId}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-ink/70">
                        {log.operation}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink/80">
                      {getAdminTableLabel(log.tableName)}
                    </td>
                    <td className="px-4 py-3 text-ink/80">#{log.rowId}</td>
                    <td className="px-4 py-3">
                      <details className="group">
                        <summary className="cursor-pointer text-sm font-medium text-brand">
                          View JSON
                        </summary>
                        <div className="mt-3 grid gap-3 lg:grid-cols-2">
                          <JsonBlock
                            title="Before"
                            json={log.beforeJson}
                            tableName={log.tableName}
                          />
                          <JsonBlock
                            title="After"
                            json={log.afterJson}
                            tableName={log.tableName}
                          />
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function JsonBlock({
  json,
  tableName,
  title,
}: {
  json: string | null;
  tableName: AuditTableName;
  title: string;
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">
        {title}
      </div>
      <pre className="max-h-72 overflow-auto rounded-md bg-ink px-3 py-2 text-xs leading-5 text-white">
        {formatJson(json, tableName)}
      </pre>
    </div>
  );
}

function getSingleValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getTableFilter(value: string | undefined): AuditTableName | undefined {
  return value && isAuditTableName(value) ? value : undefined;
}

function getOperationFilter(value: string | undefined): AuditOperation | undefined {
  return value && isAuditOperation(value) ? value : undefined;
}

function formatJson(value: string | null, tableName: AuditTableName): string {
  if (!value) return "null";
  try {
    const parsed = JSON.parse(value) as unknown;
    if (
      tableName === "users" &&
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      "password" in parsed
    ) {
      return JSON.stringify(
        { ...(parsed as Record<string, unknown>), password: "[hidden]" },
        null,
        2,
      );
    }
    return JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
}
