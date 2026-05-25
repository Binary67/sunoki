import { redirect } from "next/navigation";
import { getCurrentUser } from "@/src/lib/auth";
import { formatBookingDate as formatDateKey } from "@/src/lib/booking-dates";
import { getUpcomingBookings } from "@/src/lib/bookings";
import { listGuestProfiles } from "@/src/lib/guest-profiles";
import { isAdminRole } from "@/src/lib/roles";
import RoomOccupancyModal from "./_dashboard/RoomOccupancyModal";
import RoomOccupancySection from "./_dashboard/RoomOccupancySection";
import UpcomingFacilitySessions from "./_dashboard/UpcomingFacilitySessions";
import { getRoomOccupancy } from "./_dashboard/room-occupancy";

type PageProps = {
  searchParams: Promise<{
    room?: string | string[];
  }>;
};

export default async function Dashboard({ searchParams }: PageProps) {
  const query = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdminRole(user.role)) redirect("/booking/karaoke");

  const today = formatDateKey(new Date());
  const bookings = getUpcomingBookings();
  const checkedInProfiles = listGuestProfiles("checked_in", today);
  const incomingProfiles = listGuestProfiles("incoming", today);
  const roomOccupancy = getRoomOccupancy(
    checkedInProfiles,
    incomingProfiles,
    today,
  );
  const selectedRoom = getSingleValue(query.room);
  const selectedRoomDetails = selectedRoom
    ? roomOccupancy.rooms.get(selectedRoom)
    : undefined;

  return (
    <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
      <div className="mb-10">
        <h1 className="text-xl sm:text-2xl font-semibold text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-ink/60">
          Overview of facility activity for the team.
        </p>
      </div>

      <RoomOccupancySection
        occupancyByRoom={roomOccupancy.rooms}
        unassignedCount={roomOccupancy.unassignedCount}
      />

      <UpcomingFacilitySessions bookings={bookings} />

      {selectedRoom && selectedRoomDetails && (
        <RoomOccupancyModal
          roomDetails={selectedRoomDetails}
          roomNumber={selectedRoom}
        />
      )}
    </main>
  );
}

function getSingleValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
