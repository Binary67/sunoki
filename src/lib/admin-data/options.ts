import { db } from "../db";
import type { UserRole } from "../roles";
import type { AdminSelectOptions } from "./definitions";

type FacilityOptionRow = {
  id: number;
  slug: string;
  name: string;
};

type UserOptionRow = {
  id: number;
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
      "SELECT id, username, role, active FROM users ORDER BY username ASC, id ASC",
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
        label: `${user.username}${user.active === 1 ? "" : " (inactive)"}`,
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
