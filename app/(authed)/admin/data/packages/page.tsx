import { requireSuperAdminUser } from "@/src/lib/admin-auth";
import {
  getAdminRowForEdit,
  getAdminTableView,
} from "@/src/lib/admin-data/queries";
import {
  AdminTableSection,
  DataEditorHeader,
  EditFormSection,
  getEditId,
  getSingleValue,
  LocalTabNav,
  StatusMessage,
  type TabLink,
} from "../AdminDataView";

type PackagesTab = "service-quantities";

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
];

export default async function AdminPackagesPage({ searchParams }: PageProps) {
  const actor = await requireSuperAdminUser();
  const query = await searchParams;
  const activeTab = getPackagesTab(getSingleValue(query.tab));
  const editId = getEditId(getSingleValue(query.edit));
  const tableName = "package_service_entitlements";
  const view = getAdminTableView(tableName, actor);
  const editRow = editId ? getAdminRowForEdit(tableName, editId, actor) : null;

  return (
    <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <DataEditorHeader
        title="Packages"
        description="Manage package service quantities and the Deluxe Care celebration choice rule."
      />
      <LocalTabNav activeTab={activeTab} tabs={PACKAGE_TABS} />
      <StatusMessage
        error={getSingleValue(query.error)}
        success={getSingleValue(query.success)}
      />
      <EditFormSection
        actor={actor}
        cancelHref="/admin/data/packages?tab=service-quantities"
        editId={editId}
        editRow={editRow}
        tableName={tableName}
        view={view}
      />
      <AdminTableSection
        actionMode="records"
        actor={actor}
        editHref={(rowId) =>
          `/admin/data/packages?tab=service-quantities&edit=${rowId}`
        }
        tableName={tableName}
        view={view}
      />
    </main>
  );
}

function getPackagesTab(value: string | undefined): PackagesTab {
  return value === "service-quantities" ? value : "service-quantities";
}
