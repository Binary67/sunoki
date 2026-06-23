import Link from "next/link";
import { requireAdminUser } from "@/src/lib/admin-auth";
import type { EditableTableName } from "@/src/lib/admin-data/definitions";
import {
  getAdminFormSelectOptions,
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

type PackagesTab = "service-quantities" | "booking-limits" | "service-bookings";

type PageProps = {
  searchParams: Promise<{
    edit?: string | string[];
    error?: string | string[];
    new?: string | string[];
    page?: string | string[];
    q?: string | string[];
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
    label: "Booking Limits",
    value: "booking-limits",
    href: "/admin/data/packages?tab=booking-limits",
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
  const guestNameSearch =
    activeTab === "service-bookings"
      ? getSearchQuery(getSingleValue(query.q))
      : "";
  const showCreate =
    activeTab === "service-bookings" && getSingleValue(query.new) === "1";
  const view = getAdminTableView(
    tableName,
    actor,
    activeTab === "service-bookings"
      ? { guestNameSearch, page, pageSize: SERVICE_BOOKING_PAGE_SIZE }
      : {},
  );
  const editRow = editId ? getAdminRowForEdit(tableName, editId, actor) : null;
  const formSelectOptions =
    showCreate || editId ? getAdminFormSelectOptions(tableName) : undefined;

  return (
    <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <DataEditorHeader
        title="Services"
        description={
          canManagePackages
            ? "Manage package service quantities, booking limits, the Deluxe Care celebration choice rule, and guest service bookings."
            : "Create and manage guest service bookings for package services."
        }
      />
      <LocalTabNav activeTab={activeTab} tabs={tabs} />
      <StatusMessage
        error={getSingleValue(query.error)}
        success={getSingleValue(query.success)}
      />
      {showCreate ? (
        <CreateFormSection
          cancelHref={getPackagesHref({
            guestNameSearch,
            page: view.pagination?.page ?? page,
            tab: activeTab,
          })}
          formSelectOptions={formSelectOptions}
          tableName={tableName}
          view={view}
        />
      ) : (
        activeTab === "service-bookings" && (
          <div className="mb-7 flex justify-end">
            <Link
              href={getPackagesHref({
                create: true,
                guestNameSearch,
                page: view.pagination?.page ?? page,
                tab: activeTab,
              })}
              className="inline-flex h-9 items-center justify-center rounded-md bg-brand px-3 text-sm font-medium text-white hover:bg-brand/90"
            >
              New Booking
            </Link>
          </div>
        )
      )}
      <EditFormSection
        actor={actor}
        cancelHref={getPackagesHref({
          guestNameSearch,
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
            getPackagesHref({
              editId: rowId,
              guestNameSearch,
              page: view.pagination?.page ?? page,
              tab: activeTab,
            })
        }
        filters={
          activeTab === "service-bookings" ? (
            <ServiceBookingSearchForm searchQuery={guestNameSearch} />
          ) : undefined
        }
        paginationHref={
          activeTab === "service-bookings"
            ? (targetPage) =>
                getPackagesHref({
                  guestNameSearch,
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
  if (value === "booking-limits" && canManagePackages) return value;
  return canManagePackages ? "service-quantities" : "service-bookings";
}

function getPackagesTableName(tab: PackagesTab): EditableTableName {
  if (tab === "service-bookings") return "guest_service_bookings";
  if (tab === "booking-limits") return "service_booking_limits";
  return "package_service_entitlements";
}

function getSearchQuery(value: string | undefined): string {
  return value?.trim() ?? "";
}

function ServiceBookingSearchForm({
  searchQuery,
}: {
  searchQuery: string;
}) {
  return (
    <form
      action="/admin/data/packages"
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
    >
      <input type="hidden" name="tab" value="service-bookings" />
      <label className="sr-only" htmlFor="service-booking-guest-search">
        Search guest name
      </label>
      <input
        className="h-9 w-full rounded-md border border-black/10 px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink/40 focus:border-brand sm:max-w-xs"
        defaultValue={searchQuery}
        id="service-booking-guest-search"
        name="q"
        placeholder="Search guest name"
        type="search"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          className="inline-flex h-9 items-center justify-center rounded-md bg-brand px-3 text-sm font-medium text-white hover:bg-brand/90"
        >
          Search
        </button>
        {searchQuery && (
          <Link
            href={getPackagesHref({ page: 1, tab: "service-bookings" })}
            className="inline-flex h-9 items-center justify-center rounded-md border border-black/10 px-3 text-sm font-medium text-ink/70 hover:bg-surface"
          >
            Clear
          </Link>
        )}
      </div>
    </form>
  );
}

function getPackagesHref({
  create,
  editId,
  guestNameSearch,
  page,
  tab,
}: {
  create?: boolean;
  editId?: number;
  guestNameSearch?: string;
  page: number;
  tab: PackagesTab;
}): string {
  const params = new URLSearchParams();
  params.set("tab", tab);
  if (tab === "service-bookings" && guestNameSearch) {
    params.set("q", guestNameSearch);
  }
  if (tab === "service-bookings" && page > 1) params.set("page", String(page));
  if (create) params.set("new", "1");
  if (editId) params.set("edit", String(editId));
  return `/admin/data/packages?${params.toString()}`;
}
