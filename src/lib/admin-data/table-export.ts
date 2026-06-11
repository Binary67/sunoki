import ExcelJS from "exceljs";
import { db } from "../db";
import type { AdminRow } from "./definitions";

export const EXPORT_TABLE_NAMES = [
  "guest_profiles",
  "guest_profile_addons",
  "facility_bookings",
  "guest_service_bookings",
  "facilities",
  "package_service_entitlements",
] as const;

export type ExportTableName = (typeof EXPORT_TABLE_NAMES)[number];

export type ExportTableSummary = {
  tableName: ExportTableName;
  label: string;
  rowCount: number;
  columns: string[];
  previewRows: AdminRow[];
};

const EXPORT_TABLE_LABELS: Record<ExportTableName, string> = {
  guest_profiles: "Guest Profiles",
  guest_profile_addons: "Guest Profile Add-ons",
  facility_bookings: "Facility Bookings",
  guest_service_bookings: "Guest Service Bookings",
  facilities: "Facilities",
  package_service_entitlements: "Package Service Entitlements",
};

export function isExportTableName(value: string): value is ExportTableName {
  return (EXPORT_TABLE_NAMES as readonly string[]).includes(value);
}

export function getExportTableSummaries(
  previewLimit: number,
): ExportTableSummary[] {
  return EXPORT_TABLE_NAMES.map((tableName) => {
    const columns = getTableColumns(tableName);
    return {
      tableName,
      label: EXPORT_TABLE_LABELS[tableName],
      rowCount: getTableRowCount(tableName),
      columns,
      previewRows: getTableRows(tableName, columns, previewLimit),
    };
  });
}

export async function generateTableExportWorkbookBuffer(
  tableNames: ExportTableName[],
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sunoki";
  workbook.created = new Date();

  for (const tableName of tableNames) {
    const columns = getTableColumns(tableName);
    const worksheet = workbook.addWorksheet(tableName);
    worksheet.columns = columns.map((columnName) => ({
      header: columnName,
      key: columnName,
      width: getColumnWidth(columnName),
    }));
    worksheet.views = [{ state: "frozen", ySplit: 1 }];
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length },
    };

    const header = worksheet.getRow(1);
    header.font = { bold: true };
    header.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEFF3F6" },
    };

    for (const row of getTableRows(tableName, columns)) {
      worksheet.addRow(row);
    }
  }

  const data = (await workbook.xlsx.writeBuffer()) as unknown;
  if (data instanceof ArrayBuffer) return data;

  const view = data as Uint8Array;
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  return copy.buffer;
}

export function getTableExportWorkbookFileName(): string {
  return `sunoki-table-export-${formatFileTimestamp(new Date())}.xlsx`;
}

function getTableColumns(tableName: ExportTableName): string[] {
  const rows = db
    .prepare(`PRAGMA table_info(${quoteIdentifier(tableName)})`)
    .all() as { name: string }[];
  return rows
    .map((row) => row.name)
    .filter((columnName) => isExportedColumn(tableName, columnName));
}

function getTableRowCount(tableName: ExportTableName): number {
  const result = db
    .prepare(`SELECT COUNT(*) AS rowCount FROM ${quoteIdentifier(tableName)}`)
    .get() as { rowCount: number };
  return result.rowCount;
}

function getTableRows(
  tableName: ExportTableName,
  columns: string[],
  limit?: number,
): AdminRow[] {
  if (columns.length === 0) return [];

  const selectColumns = columns.map(quoteIdentifier).join(", ");
  const limitSql =
    typeof limit === "number" ? ` LIMIT ${Math.max(0, Math.floor(limit))}` : "";
  return db
    .prepare(
      `SELECT ${selectColumns} FROM ${quoteIdentifier(tableName)} ORDER BY id ASC${limitSql}`,
    )
    .all() as AdminRow[];
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function isExportedColumn(
  tableName: ExportTableName,
  columnName: string,
): boolean {
  return tableName !== "guest_profiles" || columnName !== "ic_no_normalized";
}

function formatFileTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}-${hour}${minute}${second}`;
}

function getColumnWidth(columnName: string): number {
  if (columnName.endsWith("_at")) return 22;
  if (columnName.endsWith("_date")) return 14;
  if (columnName.includes("tagline")) return 18;
  return Math.max(12, columnName.length + 4);
}
