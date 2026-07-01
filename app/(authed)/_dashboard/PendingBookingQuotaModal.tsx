import Link from "next/link";
import type { PendingBookingGuest } from "./pending-booking";

export default function PendingBookingQuotaModal({
  guest,
}: {
  guest: PendingBookingGuest;
}) {
  return (
    <div
      aria-labelledby="pending-booking-quota-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/35 p-3 sm:p-6"
      role="dialog"
    >
      <Link
        aria-label="Close service quota"
        className="absolute inset-0"
        href="/?tab=pending-booking"
        tabIndex={-1}
      />
      <section className="relative z-10 flex min-h-0 w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-black/10 px-4 py-4 sm:px-5">
          <div>
            <h2
              className="text-base font-semibold text-ink sm:text-lg"
              id="pending-booking-quota-title"
            >
              {guest.profile.name}
            </h2>
            <p className="mt-1 text-sm leading-6 text-ink/60">
              {formatValue(guest.profile.packageType)}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="w-fit rounded-md border border-brand/15 bg-brand/10 px-2.5 py-1.5 text-xs font-medium text-brand">
                Room {formatValue(guest.profile.roomNumber)}
              </span>
              <span className="w-fit rounded-md bg-surface px-2.5 py-1.5 text-xs font-medium text-ink/60">
                Checkout {formatValue(guest.checkoutDate)}
              </span>
            </div>
          </div>
          <Link
            aria-label="Close service quota"
            className="grid size-8 shrink-0 place-items-center rounded-md text-ink/55 hover:bg-surface hover:text-ink"
            href="/?tab=pending-booking"
          >
            <span aria-hidden="true" className="text-xl leading-none">
              x
            </span>
          </Link>
        </div>

        <div className="min-h-0 overflow-y-auto bg-surface px-4 py-5 sm:px-5">
          <div className="grid gap-2 sm:grid-cols-2">
            <QuotaSummaryItem
              label="Total remaining quota"
              value={guest.totalRemainingQuantity}
            />
            <QuotaSummaryItem
              label="Services with quota"
              value={guest.services.length}
            />
          </div>

          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            {guest.services.map((service) => (
              <li
                className="rounded-md border border-black/5 bg-white px-3 py-2.5 text-sm"
                key={service.serviceKey}
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <span className="font-medium text-ink">
                    {service.serviceName}
                  </span>
                  <span className="text-xs font-medium text-ink/60">
                    Remaining {service.remainingQuantity} /{" "}
                    {service.totalQuantity}
                  </span>
                </div>
                <dl className="mt-2 flex flex-wrap gap-x-8 gap-y-2 text-xs">
                  <QuotaDetailItem
                    label="Booked"
                    value={service.bookedQuantity}
                  />
                  <QuotaDetailItem
                    label="Package"
                    value={service.packageQuantity}
                  />
                  <QuotaDetailItem
                    label="Purchased"
                    value={service.purchasedPerkQuantity}
                  />
                </dl>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function QuotaSummaryItem({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md bg-white px-3 py-2 text-sm">
      <span className="font-medium text-ink/65">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}

function QuotaDetailItem({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-16 text-center">
      <dt className="font-medium text-ink/45">{label}</dt>
      <dd className="mt-1 font-semibold text-ink/75">{value}</dd>
    </div>
  );
}

function formatValue(value: string | null | undefined): string {
  return value || "-";
}
