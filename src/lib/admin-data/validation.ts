import { isBookingDate, isWithinBookingDateRange } from "../booking-dates";
import { db } from "../db";
import type { AdminRowValue, EditableTableName } from "./definitions";

type ParsedValues =
  | { ok: true; values: Record<string, AdminRowValue> }
  | { ok: false; message: string };

type BookingUserRow = {
  role: "admin" | "guest";
  checkInDate: string | null;
  checkOutDate: string | null;
};

export function parseFormValues(
  tableName: EditableTableName,
  formData: FormData,
): ParsedValues {
  switch (tableName) {
    case "users": {
      const username = readRequiredText(formData, "username", "Username");
      if (!username.ok) return username;
      const password = readRequiredText(formData, "password", "Password", false);
      if (!password.ok) return password;
      const role = readRequiredText(formData, "role", "Role");
      if (!role.ok) return role;
      if (role.value !== "admin" && role.value !== "guest") {
        return { ok: false, message: "Choose a valid role." };
      }
      const checkInDate = readOptionalText(formData, "check_in_date");
      const checkOutDate = readOptionalText(formData, "check_out_date");

      if (role.value === "guest") {
        if (!checkInDate || !checkOutDate) {
          return {
            ok: false,
            message: "Check-in date and check-out date are required for guests.",
          };
        }
        if (!isBookingDate(checkInDate) || !isBookingDate(checkOutDate)) {
          return {
            ok: false,
            message: "Enter valid check-in and check-out dates.",
          };
        }
        if (checkOutDate < checkInDate) {
          return {
            ok: false,
            message: "Check-out date must be on or after check-in date.",
          };
        }
      }

      return {
        ok: true,
        values: {
          username: username.value,
          password: password.value,
          role: role.value,
          check_in_date: role.value === "guest" ? checkInDate : null,
          check_out_date: role.value === "guest" ? checkOutDate : null,
        },
      };
    }
    case "facility_time_slots": {
      const facilityId = readPositiveInteger(formData, "facility_id", "Facility");
      if (!facilityId.ok) return facilityId;
      const startTime = readRequiredText(formData, "start_time", "Start time");
      if (!startTime.ok) return startTime;
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime.value)) {
        return { ok: false, message: "Enter a valid start time." };
      }
      const duration = readPositiveInteger(
        formData,
        "duration_minutes",
        "Duration minutes",
      );
      if (!duration.ok) return duration;
      const capacity = readPositiveInteger(
        formData,
        "capacity_pax",
        "Capacity pax",
      );
      if (!capacity.ok) return capacity;
      const active = readRequiredText(formData, "active", "Active");
      if (!active.ok) return active;
      if (active.value !== "0" && active.value !== "1") {
        return { ok: false, message: "Choose whether the slot is active." };
      }
      return {
        ok: true,
        values: {
          facility_id: facilityId.value,
          start_time: startTime.value,
          duration_minutes: duration.value,
          capacity_pax: capacity.value,
          active: Number(active.value),
        },
      };
    }
    case "facility_bookings": {
      const userId = readPositiveInteger(formData, "user_id", "User");
      if (!userId.ok) return userId;
      const timeSlotId = readPositiveInteger(
        formData,
        "facility_time_slot_id",
        "Time slot",
      );
      if (!timeSlotId.ok) return timeSlotId;
      const bookingDate = readRequiredText(
        formData,
        "booking_date",
        "Booking date",
      );
      if (!bookingDate.ok) return bookingDate;
      if (!isBookingDate(bookingDate.value)) {
        return { ok: false, message: "Enter a valid booking date." };
      }
      const bookingWindow = validateUserBookingWindow(
        userId.value,
        bookingDate.value,
      );
      if (!bookingWindow.ok) return bookingWindow;
      return {
        ok: true,
        values: {
          user_id: userId.value,
          facility_time_slot_id: timeSlotId.value,
          booking_date: bookingDate.value,
        },
      };
    }
  }
}

function readRequiredText(
  formData: FormData,
  key: string,
  label: string,
  trim = true,
):
  | { ok: true; value: string }
  | { ok: false; message: string } {
  const raw = formData.get(key);
  const value = typeof raw === "string" ? (trim ? raw.trim() : raw) : "";
  if (!value) return { ok: false, message: `${label} is required.` };
  return { ok: true, value };
}

function readOptionalText(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  const value = typeof raw === "string" ? raw.trim() : "";
  return value || null;
}

function readPositiveInteger(
  formData: FormData,
  key: string,
  label: string,
):
  | { ok: true; value: number }
  | { ok: false; message: string } {
  const raw = formData.get(key);
  const value = typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isInteger(value) || value <= 0) {
    return { ok: false, message: `Choose a valid ${label.toLowerCase()}.` };
  }
  return { ok: true, value };
}

function validateUserBookingWindow(
  userId: number,
  bookingDate: string,
): { ok: true } | { ok: false; message: string } {
  const user = db
    .prepare(
      `
        SELECT
          role,
          check_in_date AS checkInDate,
          check_out_date AS checkOutDate
        FROM users
        WHERE id = ?
      `,
    )
    .get(userId) as BookingUserRow | undefined;

  if (!user) return { ok: false, message: "Choose a valid user." };
  if (user.role !== "guest") return { ok: true };

  if (
    !user.checkInDate ||
    !user.checkOutDate ||
    !isBookingDate(user.checkInDate) ||
    !isBookingDate(user.checkOutDate) ||
    user.checkOutDate < user.checkInDate
  ) {
    return {
      ok: false,
      message: "The selected guest does not have valid stay dates.",
    };
  }

  if (
    !isWithinBookingDateRange(
      bookingDate,
      user.checkInDate,
      user.checkOutDate,
    )
  ) {
    return {
      ok: false,
      message: "Booking date must be within the guest stay dates.",
    };
  }

  return { ok: true };
}
