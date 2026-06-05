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
  getPageNumber,
  getSingleValue,
  LocalTabNav,
  StatusMessage,
  type TabLink,
} from "../AdminDataView";

type PackagesTab = "service-quantities" | "service-bookings";

type PageProps = {
  searchParams: Promise<{
    edit?: string | string[];
    error?: string | string[];
    page?: string | string[];
    success?: string | string[];
    tab?: string | string[];
  }>;
};

const PACKAGE_TABS: TabLink<PackagesTab>[] = [
  {
    label: "Service Quantities",
    value: "service-quantities",
    href: "/admin/data/packages?tab=service-quantities",
  },
  {
    label: "Bookings",
    value: "service-bookings",
    href: "/admin/data/packages?tab=service-bookings",
  },
];

const SERVICE_BOOKING_PAGE_SIZE = 10;

export default async function AdminPackagesPage({ searchParams }: PageProps) {
  const actor = await requireAdminUser();
  const query = await searchParams;
  const canManagePackages = actor.role === "superadmin";
  const tabs = canManagePackages
    ? PACKAGE_TABS
    : PACKAGE_TABS.filter((tab) => tab.value === "service-bookings");
  const activeTab = getPackagesTab(
    getSingleValue(query.tab),
    canManagePackages,
  );
  const editId = getEditId(getSingleValue(query.edit));
  const page = getPageNumber(getSingleValue(query.page));
  const tableName = getPackagesTableName(activeTab);
  const view = getAdminTableView(
    tableName,
    actor,
    activeTab === "service-bookings"
      ? { page, pageSize: SERVICE_BOOKING_PAGE_SIZE }
      : {},
  );
  const editRow = editId ? getAdminRowForEdit(tableName, editId, actor) : null;

  return (
    <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <DataEditorHeader
        title="Services"
        description={
          canManagePackages
            ? "Manage package service quantities, the Deluxe Care celebration choice rule, and guest service bookings."
            : "Create and manage guest service bookings for package services."
        }
      />
      <LocalTabNav activeTab={activeTab} tabs={tabs} />
      <StatusMessage
        error={getSingleValue(query.error)}
        success={getSingleValue(query.success)}
      />
      {activeTab === "service-bookings" && (
        <CreateFormSection
          tableName={tableName}
          view={view}
        />
      )}
      <EditFormSection
        actor={actor}
        cancelHref={getPackagesHref({
          page: view.pagination?.page ?? page,
          tab: activeTab,
        })}
        editId={editId}
        editRow={editRow}
        tableName={tableName}
        view={view}
      />
      <AdminTableSection
        actionMode="records"
        actor={actor}
        editHref={
          (rowId) =>
            getPackagesHref({
              editId: rowId,
              page: view.pagination?.page ?? page,
              tab: activeTab,
            })
        }
        paginationHref={
          activeTab === "service-bookings"
            ? (targetPage) =>
                getPackagesHref({
                  page: targetPage,
                  tab: activeTab,
                })
            : undefined
        }
        tableName={tableName}
        view={view}
      />
    </main>
  );
}

function getPackagesTab(
  value: string | undefined,
  canManagePackages: boolean,
): PackagesTab {
  if (value === "service-bookings") return value;
  return canManagePackages ? "service-quantities" : "service-bookings";
}

function getPackagesTableName(tab: PackagesTab): EditableTableName {
  return tab === "service-bookings"
    ? "guest_service_bookings"
    : "package_service_entitlements";
}

function getPackagesHref({
  editId,
  page,
  tab,
}: {
  editId?: number;
  page: number;
  tab: PackagesTab;
}): string {
  const params = new URLSearchParams();
  params.set("tab", tab);
  if (tab === "service-bookings" && page > 1) params.set("page", String(page));
  if (editId) params.set("edit", String(editId));
  return `/admin/data/packages?${params.toString()}`;
}
