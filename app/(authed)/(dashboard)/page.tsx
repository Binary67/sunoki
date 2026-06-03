import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/src/lib/auth";
import {
  formatBookingDate as formatDateKey,
  isBookingDate,
} from "@/src/lib/booking-dates";
import {
  getUpcomingBookings,
  listFacilityBookingOptions,
  type FacilityBookingOption,
} from "@/src/lib/bookings";
import { listGuestProfiles } from "@/src/lib/guest-profiles";
import { isAdminRole } from "@/src/lib/roles";
import {
  BOOKABLE_PACKAGE_SERVICES,
  type ServiceBookingKey,
} from "@/src/lib/service-bookings";
import RoomOccupancyModal from "../_dashboard/RoomOccupancyModal";
import RoomOccupancySection from "../_dashboard/RoomOccupancySection";
import UpcomingBookings from "../_dashboard/UpcomingBookings";
import { getRoomOccupancy } from "../_dashboard/room-occupancy";

type DashboardTab = "room-occupancy" | "upcoming-bookings";

type PageProps = {
  searchParams: Promise<{
    date?: string | string[];
    facility?: string | string[];
    room?: string | string[];
    service?: string | string[];
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
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdminRole(user.role)) return <GuestHome />;

  const query = await searchParams;
  const today = formatDateKey(new Date());
  const selectedBookingDate = getBookingDateFilter(getSingleValue(query.date));
  const selectedServiceKeys = getServiceKeyFilters(getValues(query.service));
  const facilityOptions = listFacilityBookingOptions();
  const selectedFacilityIds = getFacilityIdFilters(
    getValues(query.facility),
    facilityOptions,
  );
  const bookings = getUpcomingBookings({
    bookingDate: selectedBookingDate,
    facilityIds: selectedFacilityIds,
    serviceKeys: selectedServiceKeys,
  });
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
        <UpcomingBookings
          bookings={bookings}
          filters={{
            bookingDate: selectedBookingDate,
            facilityIds: selectedFacilityIds,
            serviceKeys: selectedServiceKeys,
          }}
          facilityOptions={facilityOptions}
          serviceOptions={BOOKABLE_PACKAGE_SERVICES}
          today={today}
        />
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

function GuestHome() {
  return (
    <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <div className="max-w-3xl">
        <h1 className="text-xl font-semibold text-ink sm:text-2xl">Home</h1>
        <p className="mt-3 rounded-lg border border-black/5 bg-white px-4 py-5 text-sm leading-6 text-ink/60">
          Bookings are managed by admin. Please contact the front desk for
          facility and service booking requests.
        </p>
      </div>
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

function getValues(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function getBookingDateFilter(value: string | undefined): string | undefined {
  return value && isBookingDate(value) ? value : undefined;
}

function getServiceKeyFilters(values: string[]): ServiceBookingKey[] {
  const requestedValues = new Set(values);
  return BOOKABLE_PACKAGE_SERVICES.filter((service) =>
    requestedValues.has(service.key),
  ).map((service) => service.key);
}

function getFacilityIdFilters(
  values: string[],
  facilityOptions: FacilityBookingOption[],
): number[] {
  const requestedValues = new Set(values);
  return facilityOptions
    .filter((facility) => requestedValues.has(String(facility.id)))
    .map((facility) => facility.id);
}
