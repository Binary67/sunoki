"use client";

import { useRef } from "react";
import { updateGuestBookingStatusAction } from "./actions";

type BookingType = "facility" | "service";
type BookingStatusField = "read" | "done";

export default function GuestBookingStatusCheckbox({
  bookingId,
  bookingType,
  checked,
  disabled = false,
  field,
  label,
  profileId,
}: {
  bookingId: number;
  bookingType: BookingType;
  checked: boolean;
  disabled?: boolean;
  field: BookingStatusField;
  label: string;
  profileId: number;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const checkedRef = useRef<HTMLInputElement>(null);

  return (
    <form action={updateGuestBookingStatusAction} ref={formRef}>
      <input name="profileId" type="hidden" value={profileId} />
      <input name="bookingId" type="hidden" value={bookingId} />
      <input name="bookingType" type="hidden" value={bookingType} />
      <input name="field" type="hidden" value={field} />
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
