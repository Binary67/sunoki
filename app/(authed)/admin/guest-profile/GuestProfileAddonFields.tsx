"use client";

import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";

export type GuestProfileAddonFormValue = {
  serviceName: string;
  priceAmount: string;
};

type GuestProfileAddonFieldsProps = {
  initialAddons: GuestProfileAddonFormValue[];
};

type AddonRow = GuestProfileAddonFormValue & {
  id: string;
};

export default function GuestProfileAddonFields({
  initialAddons,
}: GuestProfileAddonFieldsProps) {
  const [rows, setRows] = useState<AddonRow[]>(() =>
    initialAddons.length > 0
      ? initialAddons.map((addon, index) => ({
          ...addon,
          id: `addon-${index}`,
        }))
      : [createBlankRow("addon-0")],
  );
  const totalCents = useMemo(
    () =>
      rows.reduce(
        (total, row) => total + (parsePriceCents(row.priceAmount) ?? 0),
        0,
      ),
    [rows],
  );

  return (
    <fieldset className="rounded-lg border border-black/5 bg-white px-4 py-4">
      <legend className="px-1 text-sm font-semibold text-ink">Addon</legend>
      <div className="mt-3 grid gap-3">
        {rows.map((row, index) => {
          const serviceInputId = `${row.id}-service-name`;
          const priceInputId = `${row.id}-price`;

          return (
            <div
              className="grid gap-3 border-t border-black/5 pt-3 first:border-t-0 first:pt-0 md:grid-cols-[minmax(0,1fr)_10rem_auto] md:items-end"
              key={row.id}
            >
              <label
                className="block text-sm font-medium text-ink/75"
                htmlFor={serviceInputId}
              >
                Services / Sales
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
              </label>
              <label
                className="block text-sm font-medium text-ink/75"
                htmlFor={priceInputId}
              >
                Price (RM)
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
                aria-label={`Remove addon row ${index + 1}`}
                className="h-10 rounded-md border border-red-200 px-3 text-sm font-medium text-red-700 hover:bg-red-50"
                onClick={() =>
                  setRows((currentRows) =>
                    currentRows.length === 1
                      ? [createBlankRow(createRowId())]
                      : currentRows.filter(
                          (currentRow) => currentRow.id !== row.id,
                        ),
                  )
                }
                type="button"
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-col gap-3 border-t border-black/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          className="h-10 w-fit rounded-md border border-black/10 px-4 text-sm font-medium text-ink/70 hover:bg-surface"
          onClick={() =>
            setRows((currentRows) => [
              ...currentRows,
              createBlankRow(createRowId()),
            ])
          }
          type="button"
        >
          Add
        </button>
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

function updateRow(
  setRows: Dispatch<SetStateAction<AddonRow[]>>,
  rowId: string,
  value: Partial<GuestProfileAddonFormValue>,
): void {
  setRows((rows) =>
    rows.map((row) => (row.id === rowId ? { ...row, ...value } : row)),
  );
}

function createBlankRow(id: string): AddonRow {
  return { id, serviceName: "", priceAmount: "" };
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

function formatPrice(priceCents: number): string {
  const whole = Math.floor(priceCents / 100).toLocaleString("en-MY");
  const fraction = String(priceCents % 100).padStart(2, "0");
  return `RM ${whole}.${fraction}`;
}
