"use client";

import { useState } from "react";
import type { GuestProfileColumn } from "@/src/lib/guest-profiles";
import {
  formatPackageServiceQuantity,
  getPackageServiceEnabledFieldName,
  getPackageServiceQuantityFieldName,
  isAvailablePackageServiceQuantity,
  UNLIMITED_PACKAGE_SERVICE_QUANTITY,
  type PackageEntitlementSnapshot,
  type PackageServiceColumnName,
  type PackageServiceSnapshotItem,
} from "@/src/lib/package-entitlements";

const CHOICE_SERVICE_NAMES = new Set<PackageServiceColumnName>([
  "candlelight_dinner",
  "full_moon_ceremony",
]);

export type RenderedGuestProfileField = {
  label: string;
  multiline?: boolean;
  name: GuestProfileColumn;
  required?: boolean;
  value: string;
};

export default function GuestProfilePackageFields({
  fields,
  initialSnapshot,
  packageOptions,
  profileId,
}: {
  fields: RenderedGuestProfileField[];
  initialSnapshot: PackageEntitlementSnapshot | null;
  packageOptions: PackageEntitlementSnapshot[];
  profileId?: number;
}) {
  const initialPackageType =
    fields.find((field) => field.name === "package_type")?.value ?? "";
  const [selectedPackageType, setSelectedPackageType] =
    useState(initialPackageType);
  const packageSnapshot = getPackageDefaultSnapshot(
    packageOptions,
    selectedPackageType,
  );
  const valueSnapshot = getPackageValueSnapshot(
    selectedPackageType,
    initialPackageType,
    initialSnapshot,
  );

  return (
    <>
      {fields.map((field) =>
        field.name === "package_type" ? (
          <PackageTypeSelect
            key={field.name}
            field={field}
            onChange={setSelectedPackageType}
            packageOptions={packageOptions}
            profileId={profileId}
            value={selectedPackageType}
          />
        ) : (
          <GuestProfilePackageInput
            key={field.name}
            field={field}
            profileId={profileId}
          />
        ),
      )}
      <GuestPackageServicesEditor
        key={`${selectedPackageType}-${valueSnapshot ? "saved" : "default"}`}
        className="md:col-span-2"
        packageSnapshot={packageSnapshot}
        valueSnapshot={valueSnapshot}
      />
    </>
  );
}

function PackageTypeSelect({
  field,
  onChange,
  packageOptions,
  profileId,
  value,
}: {
  field: RenderedGuestProfileField;
  onChange: (value: string) => void;
  packageOptions: PackageEntitlementSnapshot[];
  profileId?: number;
  value: string;
}) {
  const inputId = getInputId(profileId, field.name);
  const className = getInputClassName();

  return (
    <label className="block text-sm font-medium text-ink/75" htmlFor={inputId}>
      {field.label} {field.required && <span className="text-red-600">*</span>}
      <select
        id={inputId}
        name={field.name}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        required={field.required}
        className={`${className} h-10`}
      >
        <option value="">Select package</option>
        {packageOptions.map((option) => (
          <option key={option.packageName} value={option.packageName}>
            {option.packageName}
          </option>
        ))}
      </select>
    </label>
  );
}

function GuestProfilePackageInput({
  field,
  profileId,
}: {
  field: RenderedGuestProfileField;
  profileId?: number;
}) {
  const inputId = getInputId(profileId, field.name);
  const className = getInputClassName();

  return (
    <label
      className={`block text-sm font-medium text-ink/75 ${
        field.multiline ? "md:col-span-2" : ""
      }`}
      htmlFor={inputId}
    >
      {field.label} {field.required && <span className="text-red-600">*</span>}
      {field.multiline ? (
        <textarea
          id={inputId}
          name={field.name}
          rows={4}
          defaultValue={field.value}
          required={field.required}
          className={`${className} min-h-24 py-2`}
        />
      ) : (
        <input
          id={inputId}
          name={field.name}
          type="text"
          defaultValue={field.value}
          required={field.required}
          className={`${className} h-10`}
        />
      )}
    </label>
  );
}

function GuestPackageServicesEditor({
  className = "",
  packageSnapshot,
  valueSnapshot,
}: {
  className?: string;
  packageSnapshot: PackageEntitlementSnapshot | null;
  valueSnapshot: PackageEntitlementSnapshot | null;
}) {
  if (!packageSnapshot) {
    return (
      <div className={className}>
        <p className="text-sm leading-6 text-ink/55">
          Select a package to edit included services.
        </p>
      </div>
    );
  }

  const hasChoiceRule = packageSnapshot.celebrationChoiceRule === "choose_one";
  const availableServices = packageSnapshot.services.filter((service) =>
    isAvailablePackageServiceQuantity(service.quantity),
  );

  return (
    <div className={className}>
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h3 className="text-sm font-semibold text-ink">
          Services included for {packageSnapshot.packageName}
        </h3>
        {hasChoiceRule && (
          <span className="text-xs font-medium text-ink/55">
            Choose either Candlelight Dinner or Full Moon Ceremony
          </span>
        )}
      </div>
      {availableServices.length === 0 ? (
        <p className="text-sm leading-6 text-ink/55">
          No services are included for this package.
        </p>
      ) : (
        <ul className="grid gap-3">
          {availableServices.map((service) => {
            const valueService = valueSnapshot?.services.find(
              (candidate) => candidate.name === service.name,
            );

            return (
              <PackageServiceEditorRow
                choiceService={
                  hasChoiceRule && CHOICE_SERVICE_NAMES.has(service.name)
                }
                defaultQuantity={service.quantity}
                key={service.name}
                service={{
                  ...service,
                  quantity: valueService?.quantity ?? service.quantity,
                }}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}

function PackageServiceEditorRow({
  choiceService,
  defaultQuantity,
  service,
}: {
  choiceService: boolean;
  defaultQuantity: number;
  service: PackageServiceSnapshotItem;
}) {
  const initialIncluded = service.quantity !== 0;
  const [included, setIncluded] = useState(initialIncluded);
  const [unlimited, setUnlimited] = useState(
    initialIncluded &&
      service.quantity === UNLIMITED_PACKAGE_SERVICE_QUANTITY,
  );
  const [quantity, setQuantity] = useState(
    getQuantityInputValue(service.quantity, defaultQuantity),
  );
  const includeInputId = `package-service-${service.name}-included`;
  const quantityInputId = `package-service-${service.name}-quantity`;
  const unlimitedInputId = `package-service-${service.name}-unlimited`;
  const hiddenQuantity = included
    ? unlimited
      ? String(UNLIMITED_PACKAGE_SERVICE_QUANTITY)
      : quantity
    : "0";

  return (
    <li className="rounded-md border border-black/10 px-3 py-3">
      <input
        type="hidden"
        name={getPackageServiceQuantityFieldName(service.name)}
        value={hiddenQuantity}
      />
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_10rem_8rem] md:items-center">
        <label
          className="flex items-start gap-3 text-sm font-medium text-ink/75"
          htmlFor={includeInputId}
        >
          <input
            id={includeInputId}
            name={getPackageServiceEnabledFieldName(service.name)}
            type="checkbox"
            value="1"
            checked={included}
            onChange={(event) => {
              const checked = event.currentTarget.checked;
              setIncluded(checked);
              if (checked) {
                if (defaultQuantity === UNLIMITED_PACKAGE_SERVICE_QUANTITY) {
                  setUnlimited(true);
                }
                if (!quantity) {
                  setQuantity(getQuantityInputValue(0, defaultQuantity));
                }
              }
            }}
            className="mt-1 size-4 rounded border-black/20 text-brand focus:ring-brand/20"
          />
          <span>
            <span>{service.label}</span>
            <span className="mt-0.5 block text-xs font-normal leading-5 text-ink/45">
              Default {formatPackageServiceQuantity(defaultQuantity)}
              {choiceService ? " - Choose one" : ""}
            </span>
          </span>
        </label>
        <label
          className="block text-sm font-medium text-ink/75"
          htmlFor={quantityInputId}
        >
          Count
          <input
            id={quantityInputId}
            type="number"
            min={1}
            required={included && !unlimited}
            disabled={!included || unlimited}
            value={quantity}
            onChange={(event) => setQuantity(event.currentTarget.value)}
            className="mt-1 h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:cursor-not-allowed disabled:border-black/5 disabled:bg-black/[0.03] disabled:text-ink/35"
          />
        </label>
        <label
          className="flex items-center gap-2 text-sm font-medium text-ink/65 md:mt-6"
          htmlFor={unlimitedInputId}
        >
          <input
            id={unlimitedInputId}
            type="checkbox"
            checked={included && unlimited}
            disabled={!included}
            onChange={(event) => setUnlimited(event.currentTarget.checked)}
            className="size-4 rounded border-black/20 text-brand focus:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-40"
          />
          Unlimited
        </label>
      </div>
    </li>
  );
}

function getPackageDefaultSnapshot(
  packageOptions: PackageEntitlementSnapshot[],
  selectedPackageType: string,
): PackageEntitlementSnapshot | null {
  return (
    packageOptions.find(
      (option) => option.packageName === selectedPackageType,
    ) ?? null
  );
}

function getPackageValueSnapshot(
  selectedPackageType: string,
  initialPackageType: string,
  initialSnapshot: PackageEntitlementSnapshot | null,
): PackageEntitlementSnapshot | null {
  if (
    selectedPackageType === initialPackageType &&
    initialSnapshot?.packageName === selectedPackageType
  ) {
    return initialSnapshot;
  }

  return null;
}

function getQuantityInputValue(
  quantity: number,
  defaultQuantity: number,
): string {
  const source = quantity === 0 ? defaultQuantity : quantity;
  if (source === UNLIMITED_PACKAGE_SERVICE_QUANTITY) return "1";
  return source > 0 ? String(source) : "1";
}

function getInputId(profileId: number | undefined, fieldName: string): string {
  return `${profileId ? `guest-${profileId}` : "guest-new"}-${fieldName}`;
}

function getInputClassName(): string {
  return "mt-1 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";
}
