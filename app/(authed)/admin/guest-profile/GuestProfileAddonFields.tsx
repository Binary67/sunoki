"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { ADDITIONAL_DAYS_ADDON_NAME } from "@/src/lib/guest-profile-addon-constants";
import { PACKAGE_SERVICE_COLUMNS } from "@/src/lib/package-entitlements";

export type GuestProfileAddonFormValue = {
  category: AddonCategory;
  serviceName: string;
  quantity: string;
  days: string;
  priceAmount: string;
  remarks: string;
};

type AddonCategory = "sunoki" | "custom";

type GuestProfileAddonFieldsProps = {
  initialAddons: GuestProfileAddonFormValue[];
};

type AddonRow = GuestProfileAddonFormValue & {
  id: string;
  remarksOpen: boolean;
};

const SUNOKI_SERVICE_OPTIONS = PACKAGE_SERVICE_COLUMNS.map((column) => ({
  value: column.name,
  label: column.label,
}));

export default function GuestProfileAddonFields({
  initialAddons,
}: GuestProfileAddonFieldsProps) {
  const initialAdditionalDaysAddon = initialAddons.find(
    (addon) => addon.serviceName === ADDITIONAL_DAYS_ADDON_NAME,
  );
  const regularAddons = initialAddons.filter(
    (addon) => addon.serviceName !== ADDITIONAL_DAYS_ADDON_NAME,
  );
  const [additionalDays, setAdditionalDays] = useState(
    initialAdditionalDaysAddon?.days ?? "",
  );
  const [additionalDaysPriceAmount, setAdditionalDaysPriceAmount] = useState(
    initialAdditionalDaysAddon?.priceAmount ?? "",
  );
  const [additionalDaysRemarks, setAdditionalDaysRemarks] = useState(
    initialAdditionalDaysAddon?.remarks ?? "",
  );
  const [additionalDaysRemarksOpen, setAdditionalDaysRemarksOpen] = useState(
    Boolean(initialAdditionalDaysAddon?.remarks),
  );
  const [rows, setRows] = useState<AddonRow[]>(() =>
    regularAddons.map((addon, index) => ({
      ...addon,
      id: `addon-${index}`,
      quantity: addon.quantity || "1",
      remarksOpen: Boolean(addon.remarks),
    })),
  );
  const [sunokiPickerOpen, setSunokiPickerOpen] = useState(false);
  const showAdditionalDaysRemarks =
    additionalDaysRemarksOpen || additionalDaysRemarks.trim().length > 0;
  const sunokiRows = rows.filter((row) => row.category === "sunoki");
  const customRows = rows.filter((row) => row.category === "custom");
  const totalCents = useMemo(() => {
    const additionalDaysCents =
      parseAdditionalDays(additionalDays) === null
        ? 0
        : parsePriceCents(additionalDaysPriceAmount) ?? 0;

    return rows.reduce((total, row) => {
      const quantity = parseQuantity(row.quantity) ?? 0;
      const priceCents = parsePriceCents(row.priceAmount) ?? 0;
      return total + quantity * priceCents;
    }, additionalDaysCents);
  }, [additionalDays, additionalDaysPriceAmount, rows]);

  return (
    <fieldset className="rounded-lg border border-black/5 bg-white px-4 py-4">
      <legend className="px-1 text-sm font-semibold text-ink">Addon</legend>
      <div className="mt-3 grid gap-5">
        <AdditionalDaysFields
          additionalDays={additionalDays}
          additionalDaysPriceAmount={additionalDaysPriceAmount}
          additionalDaysRemarks={additionalDaysRemarks}
          setAdditionalDays={setAdditionalDays}
          setAdditionalDaysPriceAmount={setAdditionalDaysPriceAmount}
          setAdditionalDaysRemarks={setAdditionalDaysRemarks}
          setAdditionalDaysRemarksOpen={setAdditionalDaysRemarksOpen}
          showAdditionalDaysRemarks={showAdditionalDaysRemarks}
        />

        <AddonGroup
          action={
            <SunokiServicePicker
              open={sunokiPickerOpen}
              setOpen={setSunokiPickerOpen}
              setRows={setRows}
            />
          }
          emptyMessage="No purchased perks added."
          rows={sunokiRows}
          setRows={setRows}
          title="Purchased Perks"
        />

        <AddonGroup
          action={
            <button
              className="h-9 w-fit rounded-md border border-black/10 px-3 text-sm font-medium text-ink/70 hover:bg-surface"
              onClick={() =>
                setRows((currentRows) => [
                  ...currentRows,
                  createBlankRow(createRowId(), "custom"),
                ])
              }
              type="button"
            >
              + Add Sunoki service
            </button>
          }
          emptyMessage="No Sunoki services or sales added."
          rows={customRows}
          setRows={setRows}
          title="Sunoki Services / Sales"
        />
      </div>
      <div className="mt-4 flex flex-col gap-3 border-t border-black/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs leading-5 text-ink/50">
          Unit price is multiplied by quantity for service and sales rows.
        </span>
        <div className="flex min-w-56 items-center justify-between gap-4 rounded-md bg-surface px-3 py-2 text-sm">
          <span className="font-medium text-ink/65">Total Addon</span>
          <span className="font-semibold text-ink">
            {formatPrice(totalCents)}
          </span>
        </div>
      </div>
    </fieldset>
  );
}

function AdditionalDaysFields({
  additionalDays,
  additionalDaysPriceAmount,
  additionalDaysRemarks,
  setAdditionalDays,
  setAdditionalDaysPriceAmount,
  setAdditionalDaysRemarks,
  setAdditionalDaysRemarksOpen,
  showAdditionalDaysRemarks,
}: {
  additionalDays: string;
  additionalDaysPriceAmount: string;
  additionalDaysRemarks: string;
  setAdditionalDays: Dispatch<SetStateAction<string>>;
  setAdditionalDaysPriceAmount: Dispatch<SetStateAction<string>>;
  setAdditionalDaysRemarks: Dispatch<SetStateAction<string>>;
  setAdditionalDaysRemarksOpen: Dispatch<SetStateAction<boolean>>;
  showAdditionalDaysRemarks: boolean;
}) {
  return (
    <section className="grid gap-3">
      <h3 className="text-sm font-semibold text-ink">Additional Stay</h3>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_8rem_10rem_6.5rem] md:items-end">
        <div className="block text-sm font-medium text-ink/75">
          <div className="flex min-h-5 items-center justify-between gap-2">
            <span>Service</span>
            <button
              aria-controls="additional-days-remarks"
              aria-expanded={showAdditionalDaysRemarks}
              className="text-xs font-medium text-brand hover:text-brand/80"
              onClick={() => {
                if (showAdditionalDaysRemarks) {
                  setAdditionalDaysRemarks("");
                  setAdditionalDaysRemarksOpen(false);
                  return;
                }
                setAdditionalDaysRemarksOpen(true);
              }}
              type="button"
            >
              {showAdditionalDaysRemarks ? "Remove remarks" : "Add remarks"}
            </button>
          </div>
          <div className="mt-1 flex h-10 w-full items-center rounded-md border border-black/10 bg-surface px-3 text-sm font-semibold text-ink">
            {ADDITIONAL_DAYS_ADDON_NAME}
          </div>
        </div>
        <label
          className="block text-sm font-medium text-ink/75"
          htmlFor="additional-days"
        >
          Days
          <input
            className="mt-1 h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
            id="additional-days"
            min="1"
            name="additional_days"
            onChange={(event) => setAdditionalDays(event.target.value)}
            step="1"
            type="number"
            value={additionalDays}
          />
        </label>
        <label
          className="block text-sm font-medium text-ink/75"
          htmlFor="additional-days-price"
        >
          Price (RM)
          <input
            className="mt-1 h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
            id="additional-days-price"
            min="0"
            name="additional_days_price_amount"
            onChange={(event) =>
              setAdditionalDaysPriceAmount(event.target.value)
            }
            step="0.01"
            type="number"
            value={additionalDaysPriceAmount}
          />
        </label>
        <div className="hidden h-10 md:block" />
        {showAdditionalDaysRemarks ? (
          <label
            className="block text-sm font-medium text-ink/75 md:col-span-4"
            htmlFor="additional-days-remarks"
          >
            Remarks
            <textarea
              className="mt-1 min-h-20 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
              id="additional-days-remarks"
              name="additional_days_remarks"
              onChange={(event) => setAdditionalDaysRemarks(event.target.value)}
              rows={3}
              value={additionalDaysRemarks}
            />
          </label>
        ) : (
          <input name="additional_days_remarks" type="hidden" value="" />
        )}
      </div>
    </section>
  );
}

function AddonGroup({
  action,
  emptyMessage,
  rows,
  setRows,
  title,
}: {
  action: ReactNode;
  emptyMessage: string;
  rows: AddonRow[];
  setRows: Dispatch<SetStateAction<AddonRow[]>>;
  title: string;
}) {
  return (
    <section className="grid gap-3 border-t border-black/5 pt-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {action}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm leading-6 text-ink/50">{emptyMessage}</p>
      ) : (
        <div className="grid gap-3">
          {rows.map((row, index) => (
            <AddonRowFields
              key={row.id}
              row={row}
              rowIndex={index}
              setRows={setRows}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function SunokiServicePicker({
  open,
  setOpen,
  setRows,
}: {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  setRows: Dispatch<SetStateAction<AddonRow[]>>;
}) {
  if (open) {
    return (
      <label className="block text-sm font-medium text-ink/75 sm:min-w-72">
        Add service
        <select
          className="mt-1 h-9 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
          defaultValue=""
          onChange={(event) => {
            const service = SUNOKI_SERVICE_OPTIONS.find(
              (option) => option.value === event.currentTarget.value,
            );
            if (!service) return;
            setRows((currentRows) => [
              ...currentRows,
              {
                ...createBlankRow(createRowId(), "sunoki"),
                serviceName: service.label,
              },
            ]);
            setOpen(false);
          }}
        >
          <option value="">Select purchased perk</option>
          {SUNOKI_SERVICE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <button
      className="h-9 w-fit rounded-md border border-black/10 px-3 text-sm font-medium text-ink/70 hover:bg-surface"
      onClick={() => setOpen(true)}
      type="button"
    >
      + Add purchased perk
    </button>
  );
}

function AddonRowFields({
  row,
  rowIndex,
  setRows,
}: {
  row: AddonRow;
  rowIndex: number;
  setRows: Dispatch<SetStateAction<AddonRow[]>>;
}) {
  const serviceInputId = `${row.id}-service-name`;
  const quantityInputId = `${row.id}-quantity`;
  const priceInputId = `${row.id}-price`;
  const remarksInputId = `${row.id}-remarks`;
  const showRemarks = row.remarksOpen || row.remarks.trim().length > 0;

  return (
    <div className="grid gap-3 rounded-md border border-black/5 px-3 py-3 md:grid-cols-[minmax(0,1fr)_7rem_10rem_6.5rem] md:items-end">
      <input name="addon_category" type="hidden" value={row.category} />
      <div className="block text-sm font-medium text-ink/75">
        <div className="flex min-h-5 items-center justify-between gap-2">
          <label htmlFor={serviceInputId}>Service / Sale</label>
          <button
            aria-controls={remarksInputId}
            aria-expanded={showRemarks}
            className="text-xs font-medium text-brand hover:text-brand/80"
            onClick={() => {
              updateRow(setRows, row.id, {
                remarks: "",
                remarksOpen: !showRemarks,
              });
            }}
            type="button"
          >
            {showRemarks ? "Remove remarks" : "Add remarks"}
          </button>
        </div>
        {row.category === "sunoki" ? (
          <select
            className="mt-1 h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
            id={serviceInputId}
            name="addon_service_name"
            onChange={(event) =>
              updateRow(setRows, row.id, {
                serviceName: event.currentTarget.value,
              })
            }
            value={row.serviceName}
          >
            {SUNOKI_SERVICE_OPTIONS.map((option) => (
              <option key={option.value} value={option.label}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            className="mt-1 h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
            id={serviceInputId}
            name="addon_service_name"
            onChange={(event) =>
              updateRow(setRows, row.id, {
                serviceName: event.target.value.toUpperCase(),
              })
            }
            type="text"
            value={row.serviceName}
          />
        )}
      </div>
      <label
        className="block text-sm font-medium text-ink/75"
        htmlFor={quantityInputId}
      >
        Quantity
        <input
          className="mt-1 h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
          id={quantityInputId}
          min="1"
          name="addon_quantity"
          onChange={(event) =>
            updateRow(setRows, row.id, {
              quantity: event.target.value,
            })
          }
          step="1"
          type="number"
          value={row.quantity}
        />
      </label>
      <label
        className="block text-sm font-medium text-ink/75"
        htmlFor={priceInputId}
      >
        Unit Price (RM)
        <input
          className="mt-1 h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
          id={priceInputId}
          min="0"
          name="addon_price_amount"
          onChange={(event) =>
            updateRow(setRows, row.id, {
              priceAmount: event.target.value,
            })
          }
          step="0.01"
          type="number"
          value={row.priceAmount}
        />
      </label>
      <button
        aria-label={`Remove addon row ${rowIndex + 1}`}
        className="h-10 rounded-md border border-red-200 px-3 text-sm font-medium text-red-700 hover:bg-red-50 md:w-full"
        onClick={() =>
          setRows((currentRows) =>
            currentRows.filter((currentRow) => currentRow.id !== row.id),
          )
        }
        type="button"
      >
        Remove
      </button>
      {showRemarks ? (
        <label
          className="block text-sm font-medium text-ink/75 md:col-span-4"
          htmlFor={remarksInputId}
        >
          Remarks
          <textarea
            className="mt-1 min-h-20 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
            id={remarksInputId}
            name="addon_remarks"
            onChange={(event) =>
              updateRow(setRows, row.id, {
                remarks: event.target.value,
              })
            }
            rows={3}
            value={row.remarks}
          />
        </label>
      ) : (
        <input name="addon_remarks" type="hidden" value="" />
      )}
    </div>
  );
}

function updateRow(
  setRows: Dispatch<SetStateAction<AddonRow[]>>,
  rowId: string,
  value: Partial<AddonRow>,
): void {
  setRows((rows) =>
    rows.map((row) => (row.id === rowId ? { ...row, ...value } : row)),
  );
}

function createBlankRow(id: string, category: AddonCategory): AddonRow {
  return {
    category,
    id,
    serviceName: "",
    quantity: "1",
    days: "",
    priceAmount: "",
    remarks: "",
    remarksOpen: false,
  };
}

function createRowId(): string {
  return `addon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function parsePriceCents(value: string): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;

  const [ringgit, sen = ""] = value.split(".");
  const totalCents = Number(ringgit) * 100 + Number(sen.padEnd(2, "0"));
  return Number.isSafeInteger(totalCents) ? totalCents : null;
}

function parseAdditionalDays(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;

  const days = Number(value);
  return Number.isSafeInteger(days) && days > 0 ? days : null;
}

function parseQuantity(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;

  const quantity = Number(value);
  return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : null;
}

function formatPrice(priceCents: number): string {
  const whole = Math.floor(priceCents / 100).toLocaleString("en-MY");
  const fraction = String(priceCents % 100).padStart(2, "0");
  return `RM ${whole}.${fraction}`;
}
