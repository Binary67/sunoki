import Link from "next/link";
import { requireAdminUser } from "@/src/lib/admin-auth";
import {
  getAdminRowForEdit,
  getAdminTableView,
  type UserAccessFilter,
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
  SetPasswordFormSection,
  StatusMessage,
  type TabLink,
} from "../AdminDataView";

type UsersTab = "accounts" | "access";

type PageProps = {
  searchParams: Promise<{
    access?: string | string[];
    edit?: string | string[];
    error?: string | string[];
    page?: string | string[];
    password?: string | string[];
    success?: string | string[];
    tab?: string | string[];
  }>;
};

const USER_PAGE_SIZE = 10;

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
  const accessFilter = getUserAccessFilter(getSingleValue(query.access));
  const page = getPageNumber(getSingleValue(query.page));
  const canManageAdminUsers = actor.role === "superadmin";
  const createMode = "admin";
  const editId =
    activeTab === "accounts" ? getEditId(getSingleValue(query.edit)) : null;
  const passwordId =
    activeTab === "accounts" ? getEditId(getSingleValue(query.password)) : null;
  const view = getAdminTableView("users", actor, {
    page,
    pageSize: USER_PAGE_SIZE,
    userAccess: accessFilter,
  });
  const editRow = editId ? getAdminRowForEdit("users", editId, actor) : null;
  const passwordRow = passwordId
    ? getAdminRowForEdit("users", passwordId, actor)
    : null;

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
          {canManageAdminUsers && (
            <CreateFormSection
              createMode={createMode}
              tableName="users"
              view={view}
            />
          )}
          <EditFormSection
            actor={actor}
            cancelHref={getUsersHref({
              accessFilter,
              page: view.pagination?.page ?? page,
              tab: "accounts",
            })}
            editId={editId}
            editRow={editRow}
            tableName="users"
            view={view}
          />
          <SetPasswordFormSection
            cancelHref={getUsersHref({
              accessFilter,
              page: view.pagination?.page ?? page,
              tab: "accounts",
            })}
            passwordId={passwordId}
            passwordRow={passwordRow}
          />
          <AdminTableSection
            actionMode="records"
            actor={actor}
            editHref={(rowId) =>
              getUsersHref({
                accessFilter,
                editId: rowId,
                page: view.pagination?.page ?? page,
                tab: "accounts",
              })
            }
            paginationHref={(targetPage) =>
              getUsersHref({
                accessFilter,
                page: targetPage,
                tab: "accounts",
              })
            }
            passwordHref={(rowId) =>
              getUsersHref({
                accessFilter,
                page: view.pagination?.page ?? page,
                passwordId: rowId,
                tab: "accounts",
              })
            }
            tableName="users"
            toolbar={
              <UserAccessFilterSegmentedControl
                activeFilter={accessFilter}
                activeTab="accounts"
              />
            }
            view={view}
          />
        </>
      ) : (
        <AdminTableSection
          actionMode="user-access"
          actor={actor}
          paginationHref={(targetPage) =>
            getUsersHref({
              accessFilter,
              page: targetPage,
              tab: "access",
            })
          }
          tableName="users"
          toolbar={
            <UserAccessFilterSegmentedControl
              activeFilter={accessFilter}
              activeTab="access"
            />
          }
          view={view}
        />
      )}
    </main>
  );
}

function getUsersTab(value: string | undefined): UsersTab {
  return value === "access" ? "access" : "accounts";
}

function getUserAccessFilter(value: string | undefined): UserAccessFilter {
  if (value === "inactive") return value;
  return "active";
}

function UserAccessFilterSegmentedControl({
  activeFilter,
  activeTab,
}: {
  activeFilter: UserAccessFilter;
  activeTab: UsersTab;
}) {
  const filters: { label: string; value: UserAccessFilter }[] = [
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
  ];

  return (
    <nav
      aria-label="User access status"
      className="inline-flex w-fit rounded-lg bg-surface p-1"
    >
      {filters.map((filter) => (
        <Link
          key={filter.value}
          href={getUsersHref({
            accessFilter: filter.value,
            page: 1,
            tab: activeTab,
          })}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            filter.value === activeFilter
              ? "border border-black/5 bg-white text-ink shadow-sm"
              : "text-ink/60 hover:text-ink"
          }`}
        >
          {filter.label}
        </Link>
      ))}
    </nav>
  );
}

function getUsersHref({
  accessFilter,
  editId,
  page,
  passwordId,
  tab,
}: {
  accessFilter: UserAccessFilter;
  editId?: number;
  page: number;
  passwordId?: number;
  tab: UsersTab;
}): string {
  const params = new URLSearchParams();
  params.set("tab", tab);
  if (accessFilter !== "active") params.set("access", accessFilter);
  if (page > 1) params.set("page", String(page));
  if (editId) params.set("edit", String(editId));
  if (passwordId) params.set("password", String(passwordId));

  return `/admin/data/users?${params.toString()}`;
}
