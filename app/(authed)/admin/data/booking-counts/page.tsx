import Link from "next/link";
import CalendarDateRangeField from "@/app/components/CalendarDateRangeField";
import { requireAdminUser } from "@/src/lib/admin-auth";
import {
  isBookingDate,
  parseBookingDate,
  MONTH_NAMES,
} from "@/src/lib/booking-dates";
import {
  getBookingCountDetails,
  getBookingCountReport,
  type BookingCountDetails,
  type BookingCountItem,
  type BookingCountType,
} from "@/src/lib/admin-data/booking-counts";
import { waitForSkeletonLoadingDelay } from "@/src/lib/loading-delay";
import {
  DataEditorHeader,
  getSingleValue,
  StatusMessage,
} from "../AdminDataView";
import PrintBookingCountDetailsButton from "./PrintBookingCountDetailsButton";

type BookingCountDateRange = {
  from: string;
  to: string;
};

type PageProps = {
  searchParams: Promise<{
    dateFrom?: string | string[];
    dateTo?: string | string[];
    detailKey?: string | string[];
    detailType?: string | string[];
  }>;
};

const BOOKING_COUNTS_PATH = "/admin/data/booking-counts";

export default async function AdminBookingCountsPage({
  searchParams,
}: PageProps) {
  await requireAdminUser();
  await waitForSkeletonLoadingDelay();

  const query = await searchParams;
  const rawFrom = getSingleValue(query.dateFrom);
  const rawTo = getSingleValue(query.dateTo);
  const hasSubmittedRange = rawFrom !== undefined || rawTo !== undefined;
  const range = getBookingCountDateRange(rawFrom, rawTo);
  const rangeError =
    hasSubmittedRange && !range ? "Choose a valid date range." : undefined;
  const report = range ? getBookingCountReport(range) : null;
  const detailType = getBookingCountType(getSingleValue(query.detailType));
  const detailKey = getSingleValue(query.detailKey);
  const details =
    range && detailType && detailKey
      ? getBookingCountDetails({
          ...range,
          key: detailKey,
          type: detailType,
        })
      : null;

  return (
    <main className="booking-count-print-page flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <style>{`
        @media print {
          @page {
            margin: 10mm;
          }

          body:has(.booking-count-print-page) {
            background: #fff;
          }

          body:has(.booking-count-print-page) aside,
          body:has(.booking-count-print-page) header,
          body:has(.booking-count-print-page) .booking-count-screen-content,
          body:has(.booking-count-print-page) .booking-count-print-hidden {
            display: none !important;
          }

          body:has(.booking-count-print-page) .h-screen {
            height: auto !important;
          }

          body:has(.booking-count-print-page) .overflow-hidden,
          body:has(.booking-count-print-page) .overflow-x-auto,
          body:has(.booking-count-print-page) .overflow-y-auto {
            overflow: visible !important;
          }

          body:has(.booking-count-print-page) .booking-count-print-page {
            color: #000;
            padding: 0 !important;
          }

          body:has(.booking-count-print-page) .booking-count-details-dialog {
            background: #fff !important;
            display: block !important;
            inset: auto !important;
            padding: 0 !important;
            position: static !important;
          }

          body:has(.booking-count-print-page) .booking-count-details-panel {
            border-radius: 0 !important;
            box-shadow: none !important;
            max-width: none !important;
            min-height: 0 !important;
            overflow: visible !important;
            width: 100% !important;
          }

          body:has(.booking-count-print-page) .booking-count-details-header {
            border-bottom: 1px solid #1d1d1f;
            padding: 0 0 5mm !important;
          }

          body:has(.booking-count-print-page) .booking-count-details-body {
            background: #fff !important;
            padding: 5mm 0 0 !important;
          }

          body:has(.booking-count-print-page) .booking-count-details-table-wrap {
            border: 0 !important;
            border-radius: 0 !important;
          }

          body:has(.booking-count-print-page) .booking-count-details-table {
            border-collapse: collapse;
            color: #000;
            font-size: 8.5pt;
            min-width: 0 !important;
            width: 100% !important;
          }

          body:has(.booking-count-print-page) .booking-count-details-table th,
          body:has(.booking-count-print-page) .booking-count-details-table td {
            border: 1px solid #bbb;
            color: #000 !important;
            padding: 2mm;
          }
        }
      `}</style>
      <div className="booking-count-screen-content">
        <DataEditorHeader
          title="Booking Counts"
          description="Check service and facility booking counts for vendor reconciliation."
        />
        <StatusMessage error={rangeError} />
        <BookingCountSearchForm
          from={range?.from ?? rawFrom ?? ""}
          hasSubmittedRange={hasSubmittedRange}
          to={range?.to ?? rawTo ?? ""}
        />

        {report && range ? (
          <div className="space-y-8">
            <BookingCountSection
              items={report.services}
              range={range}
              title="Service Bookings"
              type="service"
            />
            <BookingCountSection
              items={report.facilities}
              range={range}
              title="Facility Bookings"
              type="facility"
            />
          </div>
        ) : (
          <div className="rounded-lg border border-black/5 bg-surface px-6 py-10 text-center text-sm text-ink/60">
            Choose a date range and search to show booking counts.
          </div>
        )}
      </div>

      {range && details && (
        <BookingCountDetailsModal details={details} range={range} />
      )}
    </main>
  );
}

function BookingCountSearchForm({
  from,
  hasSubmittedRange,
  to,
}: {
  from: string;
  hasSubmittedRange: boolean;
  to: string;
}) {
  return (
    <form
      action={BOOKING_COUNTS_PATH}
      className="mb-7 flex flex-wrap items-center gap-2"
      method="get"
    >
      <CalendarDateRangeField
        buttonClassName="flex h-9 w-full items-center gap-2 rounded-md border border-black/10 bg-white px-3 text-left text-sm text-ink shadow-sm shadow-black/[0.02] outline-none transition-colors hover:bg-white/90 focus:border-brand focus:ring-2 focus:ring-brand/15"
        defaultFromValue={from}
        defaultToValue={to}
        fromName="dateFrom"
        id="booking-count-date-range"
        prefix="Date"
        toName="dateTo"
        wrapperClassName="relative w-full max-w-[21rem] sm:w-[21rem]"
      />
      <button
        className="h-9 rounded-md bg-brand px-4 text-sm font-medium text-white shadow-sm shadow-black/[0.04] hover:bg-brand/90"
        type="submit"
      >
        Search
      </button>
      {hasSubmittedRange && (
        <Link
          className="flex h-9 items-center rounded-md px-3 text-sm font-medium text-ink/55 hover:bg-surface hover:text-ink"
          href={BOOKING_COUNTS_PATH}
        >
          Clear
        </Link>
      )}
    </form>
  );
}

function BookingCountSection({
  items,
  range,
  title,
  type,
}: {
  items: BookingCountItem[];
  range: BookingCountDateRange;
  title: string;
  type: BookingCountType;
}) {
  return (
    <section>
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-sm text-ink/60">
            {formatDateRange(range)}
          </p>
        </div>
        <span className="text-xs text-ink/50">
          {items.length} {items.length === 1 ? "row" : "rows"}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-black/5">
        <table className="w-full min-w-[720px] table-fixed text-sm">
          <colgroup>
            <col />
            <col className="w-[120px]" />
            <col className="w-[120px]" />
            <col className="w-[220px]" />
          </colgroup>
          <thead className="bg-surface text-[11px] uppercase tracking-[0.14em] text-ink/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">
                {type === "service" ? "Service" : "Facility"}
              </th>
              <th className="px-4 py-3 text-center font-medium">Booked</th>
              <th className="px-4 py-3 text-center font-medium">Done</th>
              <th className="px-4 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr className="border-t border-black/5" key={item.key}>
                <td className="px-4 py-3 font-medium text-ink">
                  {item.name}
                </td>
                <td className="px-4 py-3 text-center text-ink/80">
                  {item.bookedCount}
                </td>
                <td className="px-4 py-3 text-center text-ink/80">
                  {item.doneCount}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    className="inline-flex h-8 items-center rounded-md px-2 text-sm font-medium text-brand hover:bg-brand/10"
                    href={getBookingCountsHref({
                      detailKey: item.key,
                      detailType: type,
                      from: range.from,
                      to: range.to,
                    })}
                    prefetch={false}
                  >
                    View bookings -&gt;
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BookingCountDetailsModal({
  details,
  range,
}: {
  details: BookingCountDetails;
  range: BookingCountDateRange;
}) {
  return (
    <div
      aria-labelledby="booking-count-details-title"
      aria-modal="true"
      className="booking-count-details-dialog fixed inset-0 z-50 flex items-stretch justify-center bg-black/35 p-3 sm:p-6"
      role="dialog"
    >
      <Link
        aria-label="Close booking details"
        className="booking-count-print-hidden absolute inset-0"
        href={getBookingCountsHref(range)}
        tabIndex={-1}
      />
      <section className="booking-count-details-panel relative z-10 flex min-h-0 w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="booking-count-details-header flex items-start justify-between gap-4 border-b border-black/10 px-4 py-4 sm:px-5">
          <div>
            <h2
              className="text-base font-semibold text-ink sm:text-lg"
              id="booking-count-details-title"
            >
              {details.name}
            </h2>
            <p className="mt-1 text-sm leading-6 text-ink/60">
              {details.type === "service" ? "Service" : "Facility"} bookings
              for {formatDateRange(range)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <PrintBookingCountDetailsButton />
            <Link
              aria-label="Close booking details"
              className="booking-count-print-hidden grid size-8 place-items-center rounded-md text-ink/55 hover:bg-surface hover:text-ink"
              href={getBookingCountsHref(range)}
            >
              <span aria-hidden="true" className="text-xl leading-none">
                x
              </span>
            </Link>
          </div>
        </div>

        <div className="booking-count-details-body min-h-0 overflow-y-auto bg-surface px-4 py-5 sm:px-5">
          {details.rows.length === 0 ? (
            <div className="rounded-lg border border-black/5 bg-white px-6 py-10 text-center text-sm text-ink/60">
              No bookings found for this date range.
            </div>
          ) : (
            <div className="booking-count-details-table-wrap overflow-x-auto rounded-lg border border-black/5 bg-white">
              <table className="booking-count-details-table w-full min-w-[1160px] text-sm">
                <thead className="bg-surface text-[11px] uppercase tracking-[0.14em] text-ink/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Guest</th>
                    <th className="px-4 py-3 text-left font-medium">
                      Guest IC
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Phone</th>
                    <th className="px-4 py-3 text-left font-medium">
                      {details.type === "service" ? "Service" : "Facility"}
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Booking Date
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Booking Time
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">
                      Cancelled At
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {details.rows.map((row) => (
                    <tr className="border-t border-black/5" key={row.id}>
                      <td className="px-4 py-3 text-ink/80">
                        {row.guestName}
                      </td>
                      <td className="px-4 py-3 text-ink/80">
                        {formatOptionalValue(row.guestIcNo)}
                      </td>
                      <td className="px-4 py-3 text-ink/80">
                        {formatOptionalValue(row.guestPhoneNo)}
                      </td>
                      <td className="px-4 py-3 text-ink/80">{row.name}</td>
                      <td className="px-4 py-3 text-ink/80">
                        {row.bookingDate}
                      </td>
                      <td className="px-4 py-3 text-ink/80">
                        {row.bookingTime}
                      </td>
                      <td className="px-4 py-3 text-ink/80">
                        {formatBookingStatus(row)}
                      </td>
                      <td className="px-4 py-3 text-ink/80">
                        {formatOptionalValue(row.cancelledAt)}
                      </td>
                      <td className="px-4 py-3 text-ink/80">
                        {row.createdAt}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function getBookingCountDateRange(
  from: string | undefined,
  to: string | undefined,
): BookingCountDateRange | null {
  if (!from || !to || !isBookingDate(from) || !isBookingDate(to) || from > to) {
    return null;
  }
  return { from, to };
}

function getBookingCountType(
  value: string | undefined,
): BookingCountType | null {
  if (value === "service" || value === "facility") return value;
  return null;
}

function getBookingCountsHref({
  detailKey,
  detailType,
  from,
  to,
}: BookingCountDateRange & {
  detailKey?: string;
  detailType?: BookingCountType;
}): string {
  const params = new URLSearchParams();
  params.set("dateFrom", from);
  params.set("dateTo", to);
  if (detailType && detailKey) {
    params.set("detailType", detailType);
    params.set("detailKey", detailKey);
  }
  return `${BOOKING_COUNTS_PATH}?${params.toString()}`;
}

function formatDateRange({ from, to }: BookingCountDateRange): string {
  return `${formatDisplayDate(from)} - ${formatDisplayDate(to)}`;
}

function formatDisplayDate(value: string): string {
  const date = parseBookingDate(value);
  const month = MONTH_NAMES[date.getMonth()].slice(0, 3);
  return `${month} ${date.getDate()}, ${date.getFullYear()}`;
}

function formatBookingStatus(row: {
  adminDone: number;
  adminRead: number;
  status: string;
}): string {
  if (row.status === "cancelled") return "Cancelled";
  if (row.status !== "booked") return row.status;
  if (row.adminDone === 1) return "Done";
  if (row.adminRead === 1) return "Read";
  return "Booked";
}

function formatOptionalValue(value: string | null): string {
  return value || "-";
}
