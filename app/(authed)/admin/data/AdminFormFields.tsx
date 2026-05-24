"use client";

import { useState } from "react";
import type {
  AdminColumnDefinition,
  AdminRow,
  AdminSelectOptions,
  EditableTableName,
} from "@/src/lib/admin-data/definitions";
import { UNLIMITED_PACKAGE_SERVICE_QUANTITY } from "@/src/lib/package-entitlements";
import type { UserRole } from "@/src/lib/roles";
import AdminDateField from "./AdminDateField";

const USER_STAY_DATE_FIELDS = new Set(["check_in_date", "check_out_date"]);

export default function AdminFormFields({
  columns,
  fixedUserRole,
  formId,
  options,
  row,
  tableName,
}: {
  columns: AdminColumnDefinition[];
  fixedUserRole?: UserRole;
  formId: string;
  options: AdminSelectOptions;
  row?: AdminRow;
  tableName: EditableTableName;
}) {
  const initialRole =
    fixedUserRole ??
    getFieldValue(columns.find((column) => column.name === "role"), row);
  const [selectedRole, setSelectedRole] = useState(initialRole);
  const [stayDatesCleared, setStayDatesCleared] = useState(
    tableName === "users" && initialRole !== "guest",
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {columns.map((column) => {
        const isUserStayDate =
          tableName === "users" && USER_STAY_DATE_FIELDS.has(column.name);

        if (isUserStayDate && selectedRole !== "guest") return null;

        return (
          <AdminField
            key={column.name}
            column={column}
            formId={formId}
            options={options}
            row={row}
            tableName={tableName}
            requiredOverride={isUserStayDate ? true : undefined}
            valueOverride={isUserStayDate && stayDatesCleared ? "" : undefined}
            onRoleChange={
              tableName === "users" && column.name === "role"
                ? (role) => {
                    setSelectedRole(role);
                    if (role !== "guest") setStayDatesCleared(true);
                  }
                : undefined
            }
          />
        );
      })}
    </div>
  );
}

function AdminField({
  column,
  formId,
  onRoleChange,
  options,
  requiredOverride,
  row,
  tableName,
  valueOverride,
}: {
  column: AdminColumnDefinition;
  formId: string;
  onRoleChange?: (role: string) => void;
  options: AdminSelectOptions;
  requiredOverride?: boolean;
  row?: AdminRow;
  tableName: EditableTableName;
  valueOverride?: string;
}) {
  const id = `${formId}-${column.name}`;
  const required = requiredOverride ?? column.required;
  const value = valueOverride ?? getFieldValue(column, row);
  const baseClasses =
    "mt-1 h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";

  if (
    tableName === "facility_bookings" &&
    column.name === "facility_time_slot_id"
  ) {
    return (
      <BookingTimeSlotField
        baseClasses={baseClasses}
        column={column}
        formId={formId}
        options={options}
        required={required}
        value={value}
      />
    );
  }

  if (column.input === "date") {
    return (
      <div className="block text-sm font-medium text-ink/75">
        <label htmlFor={id}>
          {column.label}
          {required && <span className="text-red-600"> *</span>}
        </label>
        <AdminDateField
          key={`${id}-${value}`}
          id={id}
          name={column.name}
          required={required}
          defaultValue={value}
        />
      </div>
    );
  }

  if (column.input === "packageQuantity") {
    return (
      <PackageQuantityField
        baseClasses={baseClasses}
        column={column}
        formId={formId}
        required={required}
        value={value}
      />
    );
  }

  return (
    <label htmlFor={id} className="block text-sm font-medium text-ink/75">
      {column.label}
      {required && <span className="text-red-600"> *</span>}
      {column.input === "select" && column.optionsKey ? (
        <select
          id={id}
          name={column.name}
          required={required}
          defaultValue={value}
          onChange={(event) => onRoleChange?.(event.currentTarget.value)}
          className={baseClasses}
        >
          <option value="">Select {column.label.toLowerCase()}</option>
          {options[column.optionsKey].map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          name={column.name}
          type={column.input ?? "text"}
          required={required}
          min={column.min}
          maxLength={column.maxLength}
          defaultValue={value}
          className={baseClasses}
        />
      )}
    </label>
  );
}

function PackageQuantityField({
  baseClasses,
  column,
  formId,
  required,
  value,
}: {
  baseClasses: string;
  column: AdminColumnDefinition;
  formId: string;
  required?: boolean;
  value: string;
}) {
  const isInitialUnlimited =
    value === String(UNLIMITED_PACKAGE_SERVICE_QUANTITY);
  const [unlimited, setUnlimited] = useState(isInitialUnlimited);
  const [quantity, setQuantity] = useState(isInitialUnlimited ? "0" : value || "0");
  const id = `${formId}-${column.name}`;
  const checkboxId = `${id}-unlimited`;

  return (
    <div className="block text-sm font-medium text-ink/75">
      <label htmlFor={id}>
        {column.label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      <input
        type="hidden"
        name={column.name}
        value={unlimited ? String(UNLIMITED_PACKAGE_SERVICE_QUANTITY) : quantity}
      />
      <input
        id={id}
        type="number"
        min={0}
        required={required && !unlimited}
        disabled={unlimited}
        value={quantity}
        onChange={(event) => setQuantity(event.currentTarget.value)}
        className={`${baseClasses} disabled:cursor-not-allowed disabled:border-black/5 disabled:bg-black/[0.03] disabled:text-ink/35`}
      />
      <label
        htmlFor={checkboxId}
        className="mt-2 flex items-center gap-2 text-xs font-medium text-ink/65"
      >
        <input
          id={checkboxId}
          type="checkbox"
          checked={unlimited}
          onChange={(event) => setUnlimited(event.currentTarget.checked)}
          className="size-4 rounded border-black/20 text-brand focus:ring-brand/20"
        />
        Unlimited
      </label>
    </div>
  );
}

function BookingTimeSlotField({
  baseClasses,
  column,
  formId,
  options,
  required,
  value,
}: {
  baseClasses: string;
  column: AdminColumnDefinition;
  formId: string;
  options: AdminSelectOptions;
  required?: boolean;
  value: string;
}) {
  const initialFacilityId =
    options.timeSlots.find((option) => option.value === value)?.facilityId ?? "";
  const [selectedFacilityId, setSelectedFacilityId] =
    useState(initialFacilityId);
  const [selectedTimeSlotId, setSelectedTimeSlotId] = useState(value);
  const facilityId = `${formId}-booking-facility`;
  const timeSlotId = `${formId}-${column.name}`;
  const timeSlotOptions = options.timeSlots.filter(
    (option) => option.facilityId === selectedFacilityId,
  );
  const timeSlotClasses = selectedFacilityId
    ? baseClasses
    : `${baseClasses} disabled:cursor-not-allowed disabled:border-black/5 disabled:bg-black/[0.03] disabled:text-ink/35`;

  return (
    <>
      <label
        htmlFor={facilityId}
        className="block text-sm font-medium text-ink/75"
      >
        Facility
        {required && <span className="text-red-600"> *</span>}
        <select
          id={facilityId}
          required={required}
          value={selectedFacilityId}
          onChange={(event) => {
            setSelectedFacilityId(event.currentTarget.value);
            setSelectedTimeSlotId("");
          }}
          className={baseClasses}
        >
          <option value="">Select facility</option>
          {options.facilities.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label
        htmlFor={timeSlotId}
        className="block text-sm font-medium text-ink/75"
      >
        {column.label}
        {required && <span className="text-red-600"> *</span>}
        <select
          id={timeSlotId}
          name={column.name}
          required={required}
          disabled={!selectedFacilityId}
          value={selectedTimeSlotId}
          onChange={(event) => setSelectedTimeSlotId(event.currentTarget.value)}
          className={timeSlotClasses}
        >
          <option value="">
            {selectedFacilityId ? "Select time slot" : "Select facility first"}
          </option>
          {timeSlotOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

function getFieldValue(
  column: AdminColumnDefinition | undefined,
  row?: AdminRow,
): string {
  if (!column) return "";
  if (!row && column.defaultValue) return column.defaultValue;
  const value = row?.[column.name];
  return value === undefined || value === null ? "" : String(value);
}
