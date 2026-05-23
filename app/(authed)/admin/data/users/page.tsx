import { requireAdminUser } from "@/src/lib/admin-auth";
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
  getUserCreateMode,
  LocalTabNav,
  StatusMessage,
  type TabLink,
} from "../AdminDataView";

type UsersTab = "accounts" | "access";

type PageProps = {
  searchParams: Promise<{
    create?: string | string[];
    edit?: string | string[];
    error?: string | string[];
    success?: string | string[];
    tab?: string | string[];
  }>;
};

const USER_TABS: TabLink<UsersTab>[] = [
  {
    label: "Accounts",
    value: "accounts",
    href: "/admin/data/users?tab=accounts",
  },
  {
    label: "Access",
    value: "access",
    href: "/admin/data/users?tab=access",
  },
];

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const actor = await requireAdminUser();
  const query = await searchParams;
  const activeTab = getUsersTab(getSingleValue(query.tab));
  const canManageAdminUsers = actor.role === "superadmin";
  const createMode = getUserCreateMode(
    getSingleValue(query.create),
    canManageAdminUsers,
  );
  const editId =
    activeTab === "accounts" ? getEditId(getSingleValue(query.edit)) : null;
  const view = getAdminTableView("users", actor);
  const editRow = editId ? getAdminRowForEdit("users", editId, actor) : null;

  return (
    <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <DataEditorHeader
        title="Users"
        description="Manage guest and admin accounts through validated forms. Access controls stay grouped with each user."
      />
      <LocalTabNav activeTab={activeTab} tabs={USER_TABS} />
      <StatusMessage
        error={getSingleValue(query.error)}
        success={getSingleValue(query.success)}
      />

      {activeTab === "accounts" ? (
        <>
          <CreateFormSection
            canManageAdminUsers={canManageAdminUsers}
            createMode={createMode}
            tableName="users"
            view={view}
          />
          <EditFormSection
            actor={actor}
            cancelHref="/admin/data/users?tab=accounts"
            editId={editId}
            editRow={editRow}
            tableName="users"
            view={view}
          />
          <AdminTableSection
            actionMode="records"
            actor={actor}
            editHref={(rowId) => `/admin/data/users?tab=accounts&edit=${rowId}`}
            tableName="users"
            view={view}
          />
        </>
      ) : (
        <AdminTableSection
          actionMode="user-access"
          actor={actor}
          tableName="users"
          view={view}
        />
      )}
    </main>
  );
}

function getUsersTab(value: string | undefined): UsersTab {
  return value === "access" ? "access" : "accounts";
}
