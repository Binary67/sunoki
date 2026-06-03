"use client";

import CalendarDateField from "@/app/components/CalendarDateField";

export default function AdminDateField({
  id,
  name,
  required,
  defaultValue,
}: {
  id: string;
  name: string;
  required?: boolean;
  defaultValue: string;
}) {
  return (
    <CalendarDateField
      id={id}
      name={name}
      required={required}
      defaultValue={defaultValue}
    />
  );
}
