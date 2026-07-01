import Link from "next/link";
import { requireAdminUser } from "@/src/lib/admin-auth";
import type { EditableTableName } from "@/src/lib/admin-data/definitions";
import {
  getAdminFormSelectOptions,
  getAdminRowForEdit,
  getAdminTableView,
} from "@/src/lib/admin-data/queries";
import { waitForSkeletonLoadingDelay } from "@/src/lib/loading-delay";
import {
  AdminTableSection,
  CreateFormSection,
  DataEditorHeader,
  EditFormSection,
  getEditId,
  getPageNumber,
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
    new?: string | string[];
    page?: string | string[];
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
const BOOKING_PAGE_SIZE = 10;

export default async function AdminFacilitiesPage({ searchParams }: PageProps) {
  const actor = await requireAdminUser();
  await waitForSkeletonLoadingDelay();

  const query = await searchParams;
  const activeTab = getFacilitiesTab(getSingleValue(query.tab));
  const tableName = getFacilitiesTableName(activeTab);
  const editId = getEditId(getSingleValue(query.edit));
  const page = getPageNumber(getSingleValue(query.page));
  const createOpen = activeTab === "bookings" && getSingleValue(query.new) === "1";
  const showCreate = activeTab !== "bookings" || createOpen;
  const view = getAdminTableView(
    tableName,
    actor,
    activeTab === "bookings"
      ? { page, pageSize: BOOKING_PAGE_SIZE }
      : {},
  );
  const contentDisabled =
    activeTab === "content" && !FACILITY_CONTENT_ENABLED;
  const editRow =
    editId && !contentDisabled
      ? getAdminRowForEdit(tableName, editId, actor)
      : null;
  const formSelectOptions =
    !contentDisabled && (showCreate || editId)
      ? getAdminFormSelectOptions(tableName)
      : undefined;

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
          {showCreate ? (
            <CreateFormSection
              cancelHref={
                activeTab === "bookings"
                  ? getFacilitiesHref({
                      page: view.pagination?.page ?? page,
                      tab: activeTab,
                    })
                  : undefined
              }
              formSelectOptions={formSelectOptions}
              tableName={tableName}
              view={view}
            />
          ) : (
            <div className="mb-7 flex justify-end">
              <Link
                href={getFacilitiesHref({
                  create: true,
                  page: view.pagination?.page ?? page,
                  tab: activeTab,
                })}
                className="inline-flex h-9 items-center justify-center rounded-md bg-brand px-3 text-sm font-medium text-white hover:bg-brand/90"
              >
                New Booking
              </Link>
            </div>
          )}
          <EditFormSection
            actor={actor}
            cancelHref={getFacilitiesHref({
              page: view.pagination?.page ?? page,
              tab: activeTab,
            })}
            editId={editId}
            editRow={editRow}
            formSelectOptions={formSelectOptions}
            tableName={tableName}
            view={view}
          />
          <AdminTableSection
            actionMode="records"
            actor={actor}
            editHref={
              (rowId) =>
                getFacilitiesHref({
                  editId: rowId,
                  page: view.pagination?.page ?? page,
                  tab: activeTab,
                })
            }
            paginationHref={
              activeTab === "bookings"
                ? (targetPage) =>
                    getFacilitiesHref({
                      page: targetPage,
                      tab: activeTab,
                    })
                : undefined
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

function getFacilitiesHref({
  create,
  editId,
  page,
  tab,
}: {
  create?: boolean;
  editId?: number;
  page: number;
  tab: FacilitiesTab;
}): string {
  const params = new URLSearchParams();
  params.set("tab", tab);
  if (tab === "bookings" && page > 1) params.set("page", String(page));
  if (create) params.set("new", "1");
  if (editId) params.set("edit", String(editId));
  return `/admin/data/facilities?${params.toString()}`;
}
