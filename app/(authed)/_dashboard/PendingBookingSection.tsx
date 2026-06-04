import type { PendingBookingGuest } from "./pending-booking";

export default function PendingBookingSection({
  guests,
}: {
  guests: PendingBookingGuest[];
}) {
  const urgentCount = guests.filter((guest) => guest.isUrgent).length;

  return (
    <section className="mb-10">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">Pending booking</h2>
          <p className="mt-1 text-sm text-ink/60">
            Checked-in guests with remaining package service quota.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          <span className="rounded-md bg-surface px-2.5 py-1.5 text-ink/60">
            {guests.length} {guests.length === 1 ? "guest" : "guests"}
          </span>
          {urgentCount > 0 && (
            <span className="rounded-md bg-red-50 px-2.5 py-1.5 text-red-700">
              {urgentCount} urgent
            </span>
          )}
        </div>
      </div>

      {guests.length === 0 ? (
        <div className="rounded-lg border border-black/5 bg-surface px-6 py-10 text-center text-sm text-ink/60">
          No checked-in guests have remaining finite service quota.
        </div>
      ) : (
        <div className="grid items-start gap-3 xl:grid-cols-2">
          {guests.map((guest) => (
            <PendingBookingCard guest={guest} key={guest.profile.id} />
          ))}
        </div>
      )}
    </section>
  );
}

function PendingBookingCard({ guest }: { guest: PendingBookingGuest }) {
  return (
    <article
      className={`rounded-lg border bg-white px-4 py-4 ${
        guest.isUrgent ? "border-red-300" : "border-black/5"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-ink">
            {guest.profile.name}
          </h3>
          <p className="mt-1 text-sm leading-6 text-ink/60">
            {formatValue(guest.profile.packageType)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {guest.isUrgent && (
            <span className="w-fit rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700">
              Within 7 days
            </span>
          )}
          <span className="w-fit rounded-md border border-brand/15 bg-brand/10 px-2.5 py-1.5 text-xs font-medium text-brand">
            Room {formatValue(guest.profile.roomNumber)}
          </span>
          <span className="w-fit rounded-md bg-surface px-2.5 py-1.5 text-xs font-medium text-ink/60">
            Checkout {formatValue(guest.checkoutDate)}
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 rounded-md bg-surface px-3 py-2 text-sm">
        <span className="font-medium text-ink/65">Total remaining quota</span>
        <span className="font-semibold text-ink">
          {guest.totalRemainingQuantity}
        </span>
      </div>

      <ul className="mt-3 grid gap-2">
        {guest.services.map((service) => (
          <li
            className="rounded-md border border-black/5 px-3 py-2 text-sm"
            key={service.serviceKey}
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <span className="font-medium text-ink">{service.serviceName}</span>
              <span className="text-xs font-medium text-ink/60">
                Remaining {service.remainingQuantity} / {service.totalQuantity}
              </span>
            </div>
            <div className="mt-1 text-xs leading-5 text-ink/50">
              Booked {service.usedQuantity} | Package {service.packageQuantity} |
              Purchased {service.purchasedPerkQuantity}
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}

function formatValue(value: string | null | undefined): string {
  return value || "-";
}
