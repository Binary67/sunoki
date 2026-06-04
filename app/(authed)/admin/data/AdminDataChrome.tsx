import Link from "next/link";

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
