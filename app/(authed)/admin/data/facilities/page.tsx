import { requireAdminUser } from "@/src/lib/admin-auth";
import type { EditableTableName } from "@/src/lib/admin-data/definitions";
import {
  getAdminRowForEdit,
  getAdminTableView,
} from "@/src/lib/admin-data/queries";
import {
  AdminTableSection,
  CreateFormSection,
  DataEditorHeader,
  EditFormSection,
  getEditId,
  getSingleValue,
  LocalTabNav,
  StatusMessage,
  type TabLink,
} from "../AdminDataView";

type FacilitiesTab = "content" | "time-slots" | "bookings";

type PageProps = {
  searchParams: Promise<{
    edit?: string | string[];
    error?: string | string[];
    success?: string | string[];
    tab?: string | string[];
  }>;
};

const FACILITY_TABS: TabLink<FacilitiesTab>[] = [
  {
    label: "Content",
    value: "content",
    href: "/admin/data/facilities?tab=content",
  },
  {
    label: "Time Slots",
    value: "time-slots",
    href: "/admin/data/facilities?tab=time-slots",
  },
  {
    label: "Bookings",
    value: "bookings",
    href: "/admin/data/facilities?tab=bookings",
  },
];

export default async function AdminFacilitiesPage({ searchParams }: PageProps) {
  const actor = await requireAdminUser();
  const query = await searchParams;
  const activeTab = getFacilitiesTab(getSingleValue(query.tab));
  const tableName = getFacilitiesTableName(activeTab);
  const editId = getEditId(getSingleValue(query.edit));
  const view = getAdminTableView(tableName, actor);
  const editRow = editId ? getAdminRowForEdit(tableName, editId, actor) : null;

  return (
    <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <DataEditorHeader
        title="Facilities"
        description="Manage facility content, available time slots, and facility bookings in one focused workspace."
      />
      <LocalTabNav activeTab={activeTab} tabs={FACILITY_TABS} />
      <StatusMessage
        error={getSingleValue(query.error)}
        success={getSingleValue(query.success)}
      />
      <CreateFormSection
        canManageAdminUsers={actor.role === "superadmin"}
        tableName={tableName}
        view={view}
      />
      <EditFormSection
        actor={actor}
        cancelHref={`/admin/data/facilities?tab=${activeTab}`}
        editId={editId}
        editRow={editRow}
        tableName={tableName}
        view={view}
      />
      <AdminTableSection
        actionMode="records"
        actor={actor}
        editHref={(rowId) =>
          `/admin/data/facilities?tab=${activeTab}&edit=${rowId}`
        }
        tableName={tableName}
        view={view}
      />
    </main>
  );
}

function getFacilitiesTab(value: string | undefined): FacilitiesTab {
  if (value === "time-slots" || value === "bookings") return value;
  return "content";
}

function getFacilitiesTableName(tab: FacilitiesTab): EditableTableName {
  switch (tab) {
    case "content":
      return "facilities";
    case "time-slots":
      return "facility_time_slots";
    case "bookings":
      return "facility_bookings";
  }
}
