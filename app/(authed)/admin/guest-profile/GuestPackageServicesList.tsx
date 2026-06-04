import {
  formatPackageServiceQuantity,
  type PackageEntitlementSnapshot,
  type PackageServiceColumnName,
} from "@/src/lib/package-entitlements";

const CHOICE_SERVICE_NAMES = new Set<PackageServiceColumnName>([
  "candlelight_dinner",
  "full_moon_ceremony",
]);

export default function GuestPackageServicesList({
  className = "",
  emptyMessage = "Select a package to preview services.",
  snapshot,
}: {
  className?: string;
  emptyMessage?: string;
  snapshot: PackageEntitlementSnapshot | null;
}) {
  if (!snapshot) {
    return (
      <div className={className}>
        <p className="text-sm leading-6 text-ink/55">{emptyMessage}</p>
      </div>
    );
  }

  const hasChoiceRule = snapshot.celebrationChoiceRule === "choose_one";

  return (
    <div className={className}>
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h3 className="text-sm font-semibold text-ink">
          Services included for {snapshot.packageName}
        </h3>
        {hasChoiceRule && (
          <span className="text-xs font-medium text-ink/55">
            The default package offer includes one celebration service.
          </span>
        )}
      </div>
      <ul className="grid gap-x-8 gap-y-4 md:grid-cols-2">
        {snapshot.services.map((service) => {
          const unavailable = service.quantity === 0;
          const choiceService = hasChoiceRule && CHOICE_SERVICE_NAMES.has(service.name);

          return (
            <li
              key={service.name}
              className={`flex items-start gap-3 text-sm leading-6 ${
                unavailable ? "text-ink/35" : "text-ink/80"
              }`}
            >
              <span
                className={`mt-0.5 inline-flex min-w-12 shrink-0 justify-center rounded-md border px-2 py-0.5 text-xs font-semibold ${
                  unavailable
                    ? "border-black/10 bg-surface text-ink/35"
                    : "border-brand/15 bg-brand/5 text-brand"
                }`}
              >
                {formatPackageServiceQuantity(service.quantity)}
              </span>
              <span>
                <span className={unavailable ? "line-through" : ""}>
                  {service.label}
                </span>
                {choiceService && !unavailable && (
                  <span className="ml-2 text-xs font-medium text-ink/45">
                    Celebration option
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
