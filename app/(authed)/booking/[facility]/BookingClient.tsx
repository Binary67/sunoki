import type { FacilityAvailability } from "@/src/lib/bookings";
import CalendarPicker from "./CalendarPicker";
import FacilityHero from "./FacilityHero";
import SlotPicker from "./SlotPicker";
import { FACILITIES, type FacilitySlug } from "./facility-content";

export default function BookingClient({
  facilitySlug,
  selectedDateValue,
  bookingWindow,
  availability,
}: {
  facilitySlug: FacilitySlug;
  selectedDateValue: string;
  bookingWindow: { checkInDate: string; checkOutDate: string } | null;
  availability: FacilityAvailability;
}) {
  return (
    <div className="flex-1 flex flex-col lg:grid lg:grid-cols-2 lg:gap-0 min-h-0">
      <FacilityHero facility={FACILITIES[facilitySlug]} />

      <aside className="border-t border-black/5 lg:border-t-0 lg:border-l px-4 sm:px-6 py-6 sm:py-8 space-y-6 min-w-0">
        <CalendarPicker
          selectedDateValue={selectedDateValue}
          bookingWindow={bookingWindow}
        />
        <SlotPicker
          facilitySlug={facilitySlug}
          selectedDateValue={selectedDateValue}
          slots={availability.slots}
        />
      </aside>
    </div>
  );
}
