"use client";

import { useState } from "react";
import type {
  AdminColumnDefinition,
  AdminRow,
  AdminSelectOptions,
  EditableTableName,
} from "@/src/lib/admin-data/definitions";
import AdminDateField from "./AdminDateField";

const USER_STAY_DATE_FIELDS = new Set(["check_in_date", "check_out_date"]);

export default function AdminFormFields({
  columns,
  formId,
  options,
  row,
  tableName,
}: {
  columns: AdminColumnDefinition[];
  formId: string;
  options: AdminSelectOptions;
  row?: AdminRow;
  tableName: EditableTableName;
}) {
  const initialRole = getFieldValue(
    columns.find((column) => column.name === "role"),
    row,
  );
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
  valueOverride,
}: {
  column: AdminColumnDefinition;
  formId: string;
  onRoleChange?: (role: string) => void;
  options: AdminSelectOptions;
  requiredOverride?: boolean;
  row?: AdminRow;
  valueOverride?: string;
}) {
  const id = `${formId}-${column.name}`;
  const required = requiredOverride ?? column.required;
  const value = valueOverride ?? getFieldValue(column, row);
  const baseClasses =
    "mt-1 h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";

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
          defaultValue={value}
          className={baseClasses}
        />
      )}
    </label>
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
