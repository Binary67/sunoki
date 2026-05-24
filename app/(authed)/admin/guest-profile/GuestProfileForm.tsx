import Link from "next/link";
import type { ReactNode } from "react";
import { ADDITIONAL_DAYS_ADDON_NAME } from "@/src/lib/guest-profile-addons";
import {
  GUEST_ROOM_LEVELS,
  GUEST_ROOM_NUMBERS,
  type GuestProfileAddon,
  type GuestProfile,
} from "@/src/lib/guest-profiles";
import GuestProfileAddonFields, {
  type GuestProfileAddonFormValue,
} from "./GuestProfileAddonFields";
import GuestProfileImportButton from "./GuestProfileImportButton";
import { GUEST_PROFILE_SECTIONS, type GuestProfileField } from "./fields";

type GuestProfileFormProps = {
  action: (formData: FormData) => Promise<void>;
  addons?: GuestProfileAddon[];
  allowImport?: boolean;
  cancelHref: string;
  notice?: ReactNode;
  profile?: GuestProfile;
  submitLabel: string;
};

export default function GuestProfileForm({
  action,
  addons = [],
  allowImport = false,
  cancelHref,
  notice,
  profile,
  submitLabel,
}: GuestProfileFormProps) {
  return (
    <form action={action} className="flex min-h-0 flex-1 flex-col">
      {profile && <input type="hidden" name="profileId" value={profile.id} />}
      <div className="grid gap-5 overflow-y-auto bg-surface px-4 py-5 sm:px-5">
        {notice}
        {GUEST_PROFILE_SECTIONS.map((section) => (
          <fieldset
            key={section.title}
            className="rounded-lg border border-black/5 bg-white px-4 py-4"
          >
            <legend className="px-1 text-sm font-semibold text-ink">
              {section.title}
            </legend>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {section.fields.map((field) => (
                <GuestProfileInput
                  key={field.name}
                  field={field}
                  profile={profile}
                />
              ))}
            </div>
          </fieldset>
        ))}
        <GuestProfileAddonFields initialAddons={getAddonFormValues(addons)} />
        <GuestProfileAccountFields profile={profile} />
      </div>
      <div
        className={`flex flex-col gap-3 border-t border-black/10 bg-white px-4 py-4 sm:flex-row sm:items-center sm:px-5 ${
          allowImport ? "sm:justify-between" : "sm:justify-end"
        }`}
      >
        {allowImport && <GuestProfileImportButton />}
        <div className="flex justify-end gap-3">
          <Link
            href={cancelHref}
            className="inline-flex h-10 items-center justify-center rounded-md border border-black/10 px-4 text-sm font-medium text-ink/70 hover:bg-surface"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="h-10 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand/90"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}

function GuestProfileAccountFields({ profile }: { profile?: GuestProfile }) {
  const inputId = `${profile ? `guest-${profile.id}` : "guest-new"}-account-password`;
  const hasLinkedAccount = Boolean(profile?.userId);
  const accountStatus =
    profile?.accountActive === 1
      ? "Active"
      : hasLinkedAccount
        ? "Inactive"
        : "Not created";

  return (
    <fieldset className="rounded-lg border border-black/5 bg-white px-4 py-4">
      <legend className="px-1 text-sm font-semibold text-ink">
        Account Access
      </legend>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div>
          <span className="text-sm font-medium text-ink/75">Username</span>
          <div className="mt-1 flex h-10 items-center rounded-md border border-black/10 bg-surface px-3 text-sm text-ink/70">
            {profile?.accountUsername ?? "Generated from room and IC on save"}
          </div>
        </div>
        <div>
          <span className="text-sm font-medium text-ink/75">Access Status</span>
          <div className="mt-1 flex h-10 items-center rounded-md border border-black/10 bg-surface px-3 text-sm text-ink/70">
            {accountStatus}
          </div>
        </div>
        {profile?.accountActive !== 0 && (
          <label
            className="block text-sm font-medium text-ink/75 md:col-span-2"
            htmlFor={inputId}
          >
            {hasLinkedAccount ? "New Password" : "Password"}{" "}
            {!hasLinkedAccount && <span className="text-red-600">*</span>}
            <input
              id={inputId}
              name="account_password"
              type="password"
              required={!profile}
              autoComplete="new-password"
              className="mt-1 h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 md:max-w-md"
            />
          </label>
        )}
      </div>
    </fieldset>
  );
}

function getAddonFormValues(
  addons: GuestProfileAddon[],
): GuestProfileAddonFormValue[] {
  return addons.map((addon) => ({
    serviceName: addon.serviceName,
    days:
      addon.serviceName === ADDITIONAL_DAYS_ADDON_NAME && addon.days
        ? String(addon.days)
        : "",
    priceAmount: formatAddonInputPrice(addon.priceCents),
  }));
}

function formatAddonInputPrice(priceCents: number): string {
  const whole = Math.floor(priceCents / 100);
  const fraction = String(priceCents % 100).padStart(2, "0");
  return `${whole}.${fraction}`;
}

function GuestProfileInput({
  field,
  profile,
}: {
  field: GuestProfileField;
  profile?: GuestProfile;
}) {
  const required = field.name === "name";
  const date = field.name === "expected_delivery_date";
  const inputId = `${profile ? `guest-${profile.id}` : "guest-new"}-${
    field.name
  }`;
  const className =
    "mt-1 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";
  const value = profile ? field.value(profile) ?? "" : "";

  return (
    <label
      className={`block text-sm font-medium text-ink/75 ${
        field.multiline ? "md:col-span-2" : ""
      }`}
      htmlFor={inputId}
    >
      {field.label} {required && <span className="text-red-600">*</span>}
      {field.name === "room_number" ? (
        <select
          id={inputId}
          name={field.name}
          defaultValue={value}
          className={`${className} h-10`}
        >
          <option value="">Select room</option>
          {GUEST_ROOM_LEVELS.map((level) => (
            <optgroup key={level} label={`Level ${level}`}>
              {GUEST_ROOM_NUMBERS.map((roomNumber) => {
                const optionValue = `${level}-${roomNumber}`;
                return (
                  <option key={optionValue} value={optionValue}>
                    Room {optionValue}
                  </option>
                );
              })}
            </optgroup>
          ))}
        </select>
      ) : field.multiline ? (
        <textarea
          id={inputId}
          name={field.name}
          rows={4}
          defaultValue={value}
          className={`${className} min-h-24 py-2`}
        />
      ) : (
        <input
          id={inputId}
          name={field.name}
          type={date ? "date" : "text"}
          required={required}
          defaultValue={value}
          className={`${className} h-10`}
        />
      )}
    </label>
  );
}
