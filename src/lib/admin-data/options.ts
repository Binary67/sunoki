import { db } from "../db";
import type { AdminSelectOptions } from "./definitions";

type FacilityOptionRow = {
  id: number;
  slug: string;
  name: string;
};

type UserOptionRow = {
  id: number;
  username: string;
  role: "admin" | "guest";
};

type TimeSlotOptionRow = {
  id: number;
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
    .prepare("SELECT id, username, role FROM users ORDER BY username ASC, id ASC")
    .all() as UserOptionRow[];
  const timeSlots = db
    .prepare(
      `
        SELECT
          s.id,
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
    facilities: facilities.map((facility) => ({
      value: String(facility.id),
      label: `${facility.name} (${facility.slug})`,
    })),
    roles: [
      { value: "admin", label: "Admin" },
      { value: "guest", label: "Guest" },
    ],
    timeSlots: timeSlots.map((slot) => ({
      value: String(slot.id),
      label: `${slot.facilityName} - ${slot.startTime} - ${slot.durationMinutes} min${
        Number(slot.active) === 1 ? "" : " - inactive"
      }`,
    })),
    users: users.map((user) => ({
      value: String(user.id),
      label: `${user.username} (${user.role})`,
    })),
  };
}
