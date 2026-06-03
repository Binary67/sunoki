import { requireAdminUser } from "@/src/lib/admin-auth";
import {
  getAdminTableDefinition,
  type EditableTableName,
} from "@/src/lib/admin-data/definitions";
import { getAdminSelectOptions } from "@/src/lib/admin-data/options";
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

type PackagesTab = "service-quantities" | "service-bookings";

type PageProps = {
  searchParams: Promise<{
    edit?: string | string[];
    error?: string | string[];
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
    label: "Service Bookings",
    value: "service-bookings",
    href: "/admin/data/packages?tab=service-bookings",
  },
];

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
  const tableName = getPackagesTableName(activeTab);
  const showRecordsTable = activeTab === "service-quantities";
  const view = showRecordsTable
    ? getAdminTableView(tableName, actor)
    : {
        table: getAdminTableDefinition(tableName),
        rows: [],
        selectOptions: getAdminSelectOptions(),
      };
  const editRow =
    showRecordsTable && editId
      ? getAdminRowForEdit(tableName, editId, actor)
      : null;

  return (
    <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <DataEditorHeader
        title="Packages"
        description={
          canManagePackages
            ? "Manage package service quantities, the Deluxe Care celebration choice rule, and create guest service bookings."
            : "Create guest service bookings for package services."
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
        cancelHref={`/admin/data/packages?tab=${activeTab}`}
        editId={activeTab === "service-quantities" ? editId : null}
        editRow={editRow}
        tableName={tableName}
        view={view}
      />
      {showRecordsTable && (
        <AdminTableSection
          actionMode="records"
          actor={actor}
          editHref={
            (rowId) => `/admin/data/packages?tab=service-quantities&edit=${rowId}`
          }
          tableName={tableName}
          view={view}
        />
      )}
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
