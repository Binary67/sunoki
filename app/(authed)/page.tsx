import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/src/lib/auth";
import { formatBookingDate as formatDateKey } from "@/src/lib/booking-dates";
import { getUpcomingBookings } from "@/src/lib/bookings";
import { listGuestProfiles } from "@/src/lib/guest-profiles";
import { isAdminRole } from "@/src/lib/roles";
import RoomOccupancyModal from "./_dashboard/RoomOccupancyModal";
import RoomOccupancySection from "./_dashboard/RoomOccupancySection";
import UpcomingBookings from "./_dashboard/UpcomingBookings";
import { getRoomOccupancy } from "./_dashboard/room-occupancy";

type DashboardTab = "room-occupancy" | "upcoming-bookings";

type PageProps = {
  searchParams: Promise<{
    room?: string | string[];
    tab?: string | string[];
  }>;
};

const DASHBOARD_TABS: { label: string; value: DashboardTab; href: string }[] = [
  {
    label: "Room Occupancy",
    value: "room-occupancy",
    href: "/?tab=room-occupancy",
  },
  {
    label: "Upcoming Bookings",
    value: "upcoming-bookings",
    href: "/?tab=upcoming-bookings",
  },
];

export default async function Dashboard({ searchParams }: PageProps) {
  const query = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdminRole(user.role)) redirect("/booking/karaoke");

  const today = formatDateKey(new Date());
  const bookings = getUpcomingBookings();
  const checkedInProfiles = listGuestProfiles("checked_in", today);
  const incomingProfiles = listGuestProfiles("incoming", today);
  const activeTab = getDashboardTab(getSingleValue(query.tab));
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

      <DashboardTabNav activeTab={activeTab} />

      {activeTab === "room-occupancy" ? (
        <RoomOccupancySection
          occupancyByRoom={roomOccupancy.rooms}
          unassignedCount={roomOccupancy.unassignedCount}
        />
      ) : (
        <UpcomingBookings bookings={bookings} />
      )}

      {activeTab === "room-occupancy" && selectedRoom && selectedRoomDetails && (
        <RoomOccupancyModal
          roomDetails={selectedRoomDetails}
          roomNumber={selectedRoom}
        />
      )}
    </main>
  );
}

function DashboardTabNav({ activeTab }: { activeTab: DashboardTab }) {
  return (
    <nav className="mb-6 flex flex-wrap gap-2">
      {DASHBOARD_TABS.map((tab) => (
        <Link
          key={tab.value}
          href={tab.href}
          className={`rounded-md px-3 py-2 text-sm transition-colors ${
            tab.value === activeTab
              ? "bg-brand text-white"
              : "bg-surface text-ink/70 hover:text-ink"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

function getDashboardTab(value: string | undefined): DashboardTab {
  return value === "upcoming-bookings" ? value : "room-occupancy";
}

function getSingleValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
