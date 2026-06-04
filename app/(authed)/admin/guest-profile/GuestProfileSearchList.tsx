"use client";

import Link from "next/link";
import { useState } from "react";
import { isBookingDate } from "@/src/lib/booking-dates";
import type {
  GuestProfile,
  GuestProfileFilterStatus,
} from "@/src/lib/guest-profiles";
import GuestProfileDeleteForm from "./GuestProfileDeleteForm";

type CheckedInGuestProfile = GuestProfile & {
  checkoutDate: string | null;
};

type RoomOverlapWarning = {
  guestId: number;
  guestName: string;
  throughDate: string;
};

export default function GuestProfileSearchList({
  activeStatus,
  canDeleteGuestProfiles,
  checkedInProfiles,
  followUpThroughDate,
  profiles,
  today,
}: {
  activeStatus: GuestProfileFilterStatus;
  canDeleteGuestProfiles: boolean;
  checkedInProfiles: CheckedInGuestProfile[];
  followUpThroughDate: string;
  profiles: GuestProfile[];
  today: string;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const searchValue = normalizeSearchValue(searchTerm);
  const filteredProfiles = searchValue
    ? profiles.filter((profile) =>
        [
          profile.name,
          profile.accountUsername,
          profile.handphoneNo,
        ].some((value) => normalizeSearchValue(value).includes(searchValue)),
      )
    : profiles;

  return (
    <>
      <div className="mb-4 max-w-xl">
        <label className="sr-only" htmlFor="guest-profile-search">
          Search guest profiles
        </label>
        <input
          autoComplete="off"
          className="h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
          id="guest-profile-search"
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search mother name, username, or phone number"
          type="search"
          value={searchTerm}
        />
        {searchValue && (
          <p className="mt-2 text-xs text-ink/50">
            {filteredProfiles.length} of {profiles.length}{" "}
            {profiles.length === 1 ? "guest" : "guests"} shown
          </p>
        )}
      </div>

      {filteredProfiles.length === 0 ? (
        <div className="rounded-lg border border-black/5 bg-surface px-6 py-10 text-center text-sm text-ink/60">
          No guest profiles match this search.
        </div>
      ) : (
        <div className="grid items-start gap-3 xl:grid-cols-2">
          {[0, 1].map((columnIndex) => (
            <div key={columnIndex} className="contents xl:grid xl:gap-3">
              {filteredProfiles.map((profile, profileIndex) =>
                profileIndex % 2 === columnIndex ? (
                  <GuestProfileBlock
                    key={profile.id}
                    activeStatus={activeStatus}
                    canDeleteGuestProfiles={canDeleteGuestProfiles}
                    checkedInProfiles={checkedInProfiles}
                    followUpThroughDate={followUpThroughDate}
                    listOrder={profileIndex}
                    profile={profile}
                    today={today}
                  />
                ) : null,
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function GuestProfileBlock({
  activeStatus,
  canDeleteGuestProfiles,
  checkedInProfiles,
  followUpThroughDate,
  listOrder,
  profile,
  today,
}: {
  activeStatus: GuestProfileFilterStatus;
  canDeleteGuestProfiles: boolean;
  checkedInProfiles: CheckedInGuestProfile[];
  followUpThroughDate: string;
  listOrder: number;
  profile: GuestProfile;
  today: string;
}) {
  const profileHref = `/admin/guest-profile/${profile.id}`;
  const followUpDue = isFollowUpDue(profile, today, followUpThroughDate);
  const overlapWarnings =
    activeStatus === "incoming"
      ? getRoomOverlapWarnings(profile, checkedInProfiles)
      : [];
  const dateBadgeLabel = activeStatus === "incoming" ? "EDD" : "Check In";
  const dateBadgeValue =
    activeStatus === "incoming"
      ? profile.expectedDeliveryDate
      : profile.checkInDate;
  const statusClass =
    activeStatus === "checked_in"
      ? "bg-emerald-50 text-emerald-700"
      : activeStatus === "checked_out"
        ? "bg-amber-50 text-amber-800"
        : "bg-surface text-ink/60";

  return (
    <article
      className={`group relative rounded-lg border bg-white px-4 py-4 transition-colors hover:bg-surface ${
        overlapWarnings.length > 0
          ? "border-amber-300 hover:border-amber-400"
          : followUpDue
            ? "border-red-300 hover:border-red-400"
            : "border-black/5 hover:border-brand/30"
      }`}
      style={{ order: listOrder }}
    >
      <Link
        aria-label={`View ${profile.name}`}
        className="absolute inset-0 z-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20"
        href={profileHref}
      />
      <div className="pointer-events-none relative z-10 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-ink group-hover:text-brand group-focus-within:text-brand">
            {profile.name}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <span className="w-fit rounded-md border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-xs font-medium text-violet-700">
            {dateBadgeLabel} {formatValue(dateBadgeValue)}
          </span>
          <span className="w-fit rounded-md border border-brand/15 bg-brand/10 px-2.5 py-1.5 text-xs font-medium text-brand">
            Room {formatValue(profile.roomNumber)}
          </span>
          <span
            className={`w-fit rounded-md px-2.5 py-1.5 text-xs font-medium ${statusClass}`}
          >
            {getGuestProfileStatusLabel(activeStatus)}
          </span>
          {canDeleteGuestProfiles && (
            <div className="pointer-events-auto">
              <GuestProfileDeleteForm
                iconOnly
                label={profile.name}
                profileId={profile.id}
                status={activeStatus}
              />
            </div>
          )}
        </div>
      </div>
      <div className="pointer-events-none relative z-10 grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,margin,opacity] duration-200 group-hover:mt-4 group-hover:grid-rows-[1fr] group-hover:opacity-100 group-focus-within:mt-4 group-focus-within:grid-rows-[1fr] group-focus-within:opacity-100">
        <div className="min-h-0 overflow-hidden">
          <dl className="grid gap-3 sm:grid-cols-2">
            <SummaryItem label="Username" value={profile.accountUsername} />
            <SummaryItem
              label="Mother Phone Number"
              value={profile.handphoneNo}
            />
            <SummaryItem
              label="Mode of Delivery"
              value={profile.modeOfDelivery}
            />
            <SummaryItem label="Type of Package" value={profile.packageType} />
          </dl>
          {overlapWarnings.length > 0 && (
            <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-800">
              Room may overlap with{" "}
              {overlapWarnings.map((warning, index) => (
                <span key={warning.guestId}>
                  {index === 0
                    ? ""
                    : index === overlapWarnings.length - 1
                      ? " and "
                      : ", "}
                  <Link
                    className="pointer-events-auto relative z-20 font-semibold underline decoration-amber-500/60 underline-offset-2 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    href={`/admin/guest-profile/${warning.guestId}`}
                  >
                    {warning.guestName}
                  </Link>{" "}
                  until {warning.throughDate}
                </span>
              ))}
              .
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink/45">
        {label}
      </dt>
      <dd className="mt-1 text-sm leading-6 text-ink/75">
        {formatValue(value)}
      </dd>
    </div>
  );
}

function isFollowUpDue(
  profile: GuestProfile,
  today: string,
  followUpThroughDate: string,
): boolean {
  const edd = profile.expectedDeliveryDate;
  return (
    profile.status === "incoming" &&
    Boolean(
      edd &&
        isBookingDate(edd) &&
        edd >= today &&
        edd <= followUpThroughDate,
    )
  );
}

function getRoomOverlapWarnings(
  profile: GuestProfile,
  checkedInProfiles: CheckedInGuestProfile[],
): RoomOverlapWarning[] {
  const edd = profile.expectedDeliveryDate;
  if (!profile.roomNumber || !edd || !isBookingDate(edd)) return [];

  return checkedInProfiles.flatMap((checkedInProfile) => {
    const checkInDate = checkedInProfile.checkInDate;
    if (
      checkedInProfile.status !== "checked_in" ||
      checkedInProfile.roomNumber !== profile.roomNumber ||
      !checkInDate ||
      !isBookingDate(checkInDate) ||
      isSameGuest(profile, checkedInProfile)
    ) {
      return [];
    }

    const throughDate = checkedInProfile.checkoutDate;
    if (!throughDate) return [];
    if (edd < checkInDate || edd > throughDate) return [];

    return [
      {
        guestId: checkedInProfile.id,
        guestName: checkedInProfile.name,
        throughDate,
      },
    ];
  });
}

function isSameGuest(a: GuestProfile, b: GuestProfile): boolean {
  return a.id === b.id || Boolean(a.icNo && b.icNo && a.icNo === b.icNo);
}

function getGuestProfileStatusLabel(status: GuestProfileFilterStatus): string {
  if (status === "checked_out") return "Checked Out";
  return status === "checked_in" ? "Checked In" : "Incoming";
}

function normalizeSearchValue(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/[\s()+-]+/g, "");
}

function formatValue(value: string | null | undefined): string {
  return value || "-";
}
