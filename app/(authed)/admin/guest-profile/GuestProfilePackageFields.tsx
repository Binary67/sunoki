"use client";

import { useState } from "react";
import type { GuestProfileColumn } from "@/src/lib/guest-profiles";
import type { PackageEntitlementSnapshot } from "@/src/lib/package-entitlements";
import GuestPackageServicesList from "./GuestPackageServicesList";

export type RenderedGuestProfileField = {
  label: string;
  multiline?: boolean;
  name: GuestProfileColumn;
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
  const selectedSnapshot = getSelectedSnapshot(
    packageOptions,
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
      <GuestPackageServicesList
        className="md:col-span-2"
        snapshot={selectedSnapshot}
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
      {field.label}
      <select
        id={inputId}
        name={field.name}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
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
      {field.label}
      {field.multiline ? (
        <textarea
          id={inputId}
          name={field.name}
          rows={4}
          defaultValue={field.value}
          className={`${className} min-h-24 py-2`}
        />
      ) : (
        <input
          id={inputId}
          name={field.name}
          type="text"
          defaultValue={field.value}
          className={`${className} h-10`}
        />
      )}
    </label>
  );
}

function getSelectedSnapshot(
  packageOptions: PackageEntitlementSnapshot[],
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

  return (
    packageOptions.find(
      (option) => option.packageName === selectedPackageType,
    ) ?? null
  );
}

function getInputId(profileId: number | undefined, fieldName: string): string {
  return `${profileId ? `guest-${profileId}` : "guest-new"}-${fieldName}`;
}

function getInputClassName(): string {
  return "mt-1 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";
}
