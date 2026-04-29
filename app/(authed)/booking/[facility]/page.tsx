import { notFound } from "next/navigation";
import {
  getFacilityAvailability,
  isBookingDate,
} from "@/src/lib/bookings";
import { formatBookingDate } from "@/src/lib/booking-dates";
import BookingClient from "./BookingClient";
import { FACILITIES, type FacilitySlug } from "./facility-content";

type PageProps = {
  params: Promise<{ facility: string }>;
  searchParams: Promise<{ date?: string | string[] }>;
};

function getSelectedDate(searchDate: string | string[] | undefined) {
  const value = Array.isArray(searchDate) ? searchDate[0] : searchDate;
  return value && isBookingDate(value) ? value : formatBookingDate(new Date());
}

export default async function FacilityPage({
  params,
  searchParams,
}: PageProps) {
  const { facility } = await params;
  if (!(facility in FACILITIES)) notFound();

  const query = await searchParams;
  const selectedDate = getSelectedDate(query.date);
  const availability = getFacilityAvailability(facility, selectedDate);

  if (!availability) notFound();

  return (
    <BookingClient
      key={`${facility}-${selectedDate}`}
      facilitySlug={facility as FacilitySlug}
      selectedDateValue={selectedDate}
      availability={availability}
    />
  );
}
