import { redirect } from "next/navigation";
import { getCurrentUser } from "@/src/lib/auth";
import { formatBookingDate, isBookingDate } from "@/src/lib/booking-dates";
import type { User } from "@/src/lib/db";
import { getGuestServiceBookingSummary } from "@/src/lib/service-bookings";
import ServiceBookingClient from "./ServiceBookingClient";

type GuestBookingWindow = {
  checkInDate: string;
  checkOutDate: string;
};

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

export default async function ServicesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "guest") redirect("/");

  const now = new Date();
  const todayDate = formatBookingDate(now);
  const bookingWindow = getGuestBookingWindow(user);
  const minBookableDate =
    bookingWindow && bookingWindow.checkInDate > todayDate
      ? bookingWindow.checkInDate
      : todayDate;
  const currentTimeValue = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}`;
  const summary = getGuestServiceBookingSummary(user, now);

  if (!summary) {
    return (
      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        <div className="max-w-3xl">
          <h1 className="text-xl font-semibold text-ink sm:text-2xl">
            Services
          </h1>
          <p className="mt-3 rounded-lg border border-black/5 bg-white px-4 py-5 text-sm leading-6 text-ink/60">
            Your guest profile is not set up for service booking. Please inform
            admin.
          </p>
        </div>
      </main>
    );
  }

  return (
    <ServiceBookingClient
      bookingWindow={bookingWindow}
      currentDateValue={todayDate}
      currentTimeValue={currentTimeValue}
      minBookableDate={minBookableDate}
      summary={summary}
    />
  );
}
