import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/src/lib/auth";
import { getFacilityAvailability } from "@/src/lib/bookings";
import {
  clampBookingDateToRange,
  formatBookingDate,
  isBookingDate,
} from "@/src/lib/booking-dates";
import type { User } from "@/src/lib/db";
import BookingClient from "./BookingClient";
import { FACILITIES, type FacilitySlug } from "./facility-content";

type PageProps = {
  params: Promise<{ facility: string }>;
  searchParams: Promise<{ date?: string | string[] }>;
};

type GuestBookingWindow = {
  checkInDate: string;
  checkOutDate: string;
};

function getSelectedDate(
  searchDate: string | string[] | undefined,
  bookingWindow: GuestBookingWindow | null,
  minBookableDate: string,
) {
  const value = Array.isArray(searchDate) ? searchDate[0] : searchDate;
  const selectedDate =
    value && isBookingDate(value) ? value : minBookableDate;

  if (!bookingWindow) {
    return selectedDate < minBookableDate ? minBookableDate : selectedDate;
  }

  if (minBookableDate > bookingWindow.checkOutDate) {
    return bookingWindow.checkOutDate;
  }

  return clampBookingDateToRange(
    selectedDate,
    minBookableDate,
    bookingWindow.checkOutDate,
  );
}

function getGuestBookingWindow(user: User): GuestBookingWindow | null {
  if (user.role !== "guest") return null;
  if (!user.checkInDate || !user.checkOutDate) return null;
  if (!isBookingDate(user.checkInDate) || !isBookingDate(user.checkOutDate)) {
    return null;
  }
  if (user.checkOutDate < user.checkInDate) return null;
  return {
    checkInDate: user.checkInDate,
    checkOutDate: user.checkOutDate,
  };
}

export default async function FacilityPage({
  params,
  searchParams,
}: PageProps) {
  const { facility } = await params;
  if (!(facility in FACILITIES)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const query = await searchParams;
  const bookingWindow = getGuestBookingWindow(user);
  const now = new Date();
  const todayDate = formatBookingDate(now);
  const minBookableDate =
    bookingWindow && bookingWindow.checkInDate > todayDate
      ? bookingWindow.checkInDate
      : todayDate;
  const currentTimeValue = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}`;
  const selectedDate = getSelectedDate(
    query.date,
    bookingWindow,
    minBookableDate,
  );
  const availability = getFacilityAvailability(facility, selectedDate);

  if (!availability) notFound();

  return (
    <BookingClient
      key={`${facility}-${selectedDate}`}
      facilitySlug={facility as FacilitySlug}
      selectedDateValue={selectedDate}
      bookingWindow={bookingWindow}
      minBookableDate={minBookableDate}
      currentDateValue={todayDate}
      currentTimeValue={currentTimeValue}
      availability={availability}
    />
  );
}
