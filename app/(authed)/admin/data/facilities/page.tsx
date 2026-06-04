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

type FacilitiesTab = "content" | "bookings";

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
    label: "Bookings",
    value: "bookings",
    href: "/admin/data/facilities?tab=bookings",
  },
  {
    label: "Content",
    value: "content",
    href: "/admin/data/facilities?tab=content",
  },
];

const FACILITY_CONTENT_ENABLED = false;

export default async function AdminFacilitiesPage({ searchParams }: PageProps) {
  const actor = await requireAdminUser();
  const query = await searchParams;
  const activeTab = getFacilitiesTab(getSingleValue(query.tab));
  const tableName = getFacilitiesTableName(activeTab);
  const editId = getEditId(getSingleValue(query.edit));
  const view = getAdminTableView(tableName, actor);
  const contentDisabled =
    activeTab === "content" && !FACILITY_CONTENT_ENABLED;
  const editRow =
    editId && !contentDisabled
      ? getAdminRowForEdit(tableName, editId, actor)
      : null;

  return (
    <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <DataEditorHeader
        title="Facilities"
        description="Manage facility content and facility bookings in one focused workspace."
      />
      <LocalTabNav activeTab={activeTab} tabs={FACILITY_TABS} />
      <StatusMessage
        error={getSingleValue(query.error)}
        success={getSingleValue(query.success)}
      />
      {contentDisabled ? (
        <DisabledFacilityContent
          actor={actor}
          tableName={tableName}
          view={view}
        />
      ) : (
        <>
          <CreateFormSection
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
            editHref={
              (rowId) => `/admin/data/facilities?tab=${activeTab}&edit=${rowId}`
            }
            tableName={tableName}
            view={view}
          />
        </>
      )}
    </main>
  );
}

function DisabledFacilityContent({
  actor,
  tableName,
  view,
}: {
  actor: Awaited<ReturnType<typeof requireAdminUser>>;
  tableName: EditableTableName;
  view: ReturnType<typeof getAdminTableView>;
}) {
  return (
    <section className="relative overflow-hidden rounded-lg">
      <div inert aria-hidden className="blur-[1.5px]">
        <AdminTableSection
          actionMode="records"
          actor={actor}
          tableName={tableName}
          view={view}
        />
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/45 px-4 backdrop-blur-[2px]">
        <div className="rounded-md border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-ink shadow-sm">
          Coming Soon
        </div>
      </div>
    </section>
  );
}

function getFacilitiesTab(
  value: string | undefined,
): FacilitiesTab {
  if (value === "content") return value;
  return "bookings";
}

function getFacilitiesTableName(tab: FacilitiesTab): EditableTableName {
  switch (tab) {
    case "content":
      return "facilities";
    case "bookings":
      return "facility_bookings";
  }
}
