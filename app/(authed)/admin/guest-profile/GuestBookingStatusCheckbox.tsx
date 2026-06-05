"use client";

import { useRef } from "react";
import { updateGuestBookingStatusAction } from "./actions";

type BookingType = "facility" | "service";
type BookingStatusField = "read" | "done";
type BookingStatusAction = (formData: FormData) => void | Promise<void>;
type HiddenField = {
  name: string;
  value: number | string;
};

export default function GuestBookingStatusCheckbox({
  bookingId,
  bookingType,
  checked,
  disabled = false,
  field,
  hiddenFields = [],
  label,
  profileId,
  statusAction = updateGuestBookingStatusAction,
}: {
  bookingId: number;
  bookingType: BookingType;
  checked: boolean;
  disabled?: boolean;
  field: BookingStatusField;
  hiddenFields?: HiddenField[];
  label: string;
  profileId: number;
  statusAction?: BookingStatusAction;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const checkedRef = useRef<HTMLInputElement>(null);

  return (
    <form action={statusAction} ref={formRef}>
      <input name="profileId" type="hidden" value={profileId} />
      <input name="bookingId" type="hidden" value={bookingId} />
      <input name="bookingType" type="hidden" value={bookingType} />
      <input name="field" type="hidden" value={field} />
      {hiddenFields.map((hiddenField) => (
        <input
          key={`${hiddenField.name}-${hiddenField.value}`}
          name={hiddenField.name}
          type="hidden"
          value={hiddenField.value}
        />
      ))}
      <input
        defaultValue={checked ? "1" : "0"}
        name="checked"
        ref={checkedRef}
        type="hidden"
      />
      <input
        aria-label={label}
        className="size-4 rounded border-black/20 text-brand focus:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-35"
        defaultChecked={checked}
        disabled={disabled}
        onChange={(event) => {
          if (checkedRef.current) {
            checkedRef.current.value = event.currentTarget.checked ? "1" : "0";
          }
          formRef.current?.requestSubmit();
        }}
        type="checkbox"
      />
    </form>
  );
}
