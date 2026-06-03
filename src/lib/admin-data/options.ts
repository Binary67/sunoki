import { db } from "../db";
import type { UserRole } from "../roles";
import { BOOKABLE_PACKAGE_SERVICES } from "../service-bookings";
import type { AdminSelectOptions } from "./definitions";

type FacilityOptionRow = {
  id: number;
  slug: string;
  name: string;
};

type UserOptionRow = {
  id: number;
  guestName: string | null;
  username: string;
  role: UserRole;
  active: number;
};

type TimeSlotOptionRow = {
  id: number;
  facilityId: number;
  facilityName: string;
  startTime: string;
  durationMinutes: number;
  active: number;
};

export function getAdminSelectOptions(): AdminSelectOptions {
  const facilities = db
    .prepare("SELECT id, slug, name FROM facilities ORDER BY name ASC, id ASC")
    .all() as FacilityOptionRow[];
  const users = db
    .prepare(
      `
        SELECT
          u.id,
          gp.name AS guestName,
          u.username,
          u.role,
          u.active
        FROM users u
        LEFT JOIN guest_profiles gp ON gp.user_id = u.id
        ORDER BY gp.name ASC, u.username ASC, u.id ASC
      `,
    )
    .all() as UserOptionRow[];
  const timeSlots = db
    .prepare(
      `
        SELECT
          s.id,
          s.facility_id AS facilityId,
          f.name AS facilityName,
          s.start_time AS startTime,
          s.duration_minutes AS durationMinutes,
          s.active
        FROM facility_time_slots s
        JOIN facilities f ON f.id = s.facility_id
        ORDER BY f.name ASC, s.start_time ASC, s.id ASC
      `,
    )
    .all() as TimeSlotOptionRow[];

  return {
    active: [
      { value: "1", label: "Active" },
      { value: "0", label: "Inactive" },
    ],
    bookableServices: BOOKABLE_PACKAGE_SERVICES.map((service) => ({
      value: service.key,
      label: service.name,
    })),
    celebrationChoiceRules: [
      { value: "none", label: "None" },
      { value: "choose_one", label: "Choose One" },
    ],
    facilities: facilities.map((facility) => ({
      value: String(facility.id),
      label: `${facility.name} (${facility.slug})`,
    })),
    guestUsers: users
      .filter((user) => user.role === "guest")
      .map((user) => ({
        value: String(user.id),
        label: `${formatGuestLabel(user)}${
          user.active === 1 ? "" : " (inactive)"
        }`,
      })),
    roles: [
      { value: "superadmin", label: "Super Admin" },
      { value: "admin", label: "Admin" },
      { value: "guest", label: "Guest" },
    ],
    timeSlots: timeSlots.map((slot) => ({
      value: String(slot.id),
      label: `${slot.facilityName} - ${slot.startTime} - ${slot.durationMinutes} min${
        Number(slot.active) === 1 ? "" : " - inactive"
      }`,
      facilityId: String(slot.facilityId),
    })),
    users: users.map((user) => ({
      value: String(user.id),
      label: `${user.username} (${formatRoleLabel(user.role)}${
        user.active === 1 ? "" : ", inactive"
      })`,
    })),
  };
}

function formatGuestLabel(user: UserOptionRow): string {
  return user.guestName ? `${user.guestName} (${user.username})` : user.username;
}

function formatRoleLabel(role: UserRole): string {
  switch (role) {
    case "superadmin":
      return "Super Admin";
    case "admin":
      return "Admin";
    case "guest":
      return "Guest";
  }
}
