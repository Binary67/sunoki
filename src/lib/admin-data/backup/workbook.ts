import ExcelJS from "exceljs";
import {
  EDITABLE_TABLE_NAMES,
  getAdminTableDefinition,
  type AdminRow,
  type AdminRowValue,
  type EditableTableName,
} from "../definitions";
import { formatDateTime, formatFileTimestamp, getColumnWidth } from "./format";
import type {
  BackupImportError,
  BackupRowsByTable,
  ParsedRowsByTable,
} from "./types";

const BACKUP_FORMAT_VERSION = "sunoki-admin-data-v1";
const METADATA_SHEET_NAME = "_sunoki_schema";

export async function generateBackupWorkbookBuffer(
  snapshot: BackupRowsByTable,
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sunoki";
  workbook.created = new Date();

  for (const tableName of EDITABLE_TABLE_NAMES) {
    const table = getAdminTableDefinition(tableName);
    const columns = table.columns.map((column) => column.name);
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

    for (const row of snapshot[tableName]) {
      worksheet.addRow(row);
    }

    for (const column of table.columns) {
      if (
        column.input !== "number" &&
        column.input !== "packageQuantity" &&
        column.name !== "id"
      ) {
        worksheet.getColumn(column.name).numFmt = "@";
      }
    }
  }

  const metadata = workbook.addWorksheet(METADATA_SHEET_NAME);
  metadata.state = "veryHidden";
  metadata.addRows([
    ["format_version", BACKUP_FORMAT_VERSION],
    ["generated_at", formatDateTime(new Date())],
    ["sheets", EDITABLE_TABLE_NAMES.join(",")],
  ]);

  const data = (await workbook.xlsx.writeBuffer()) as unknown;
  if (data instanceof ArrayBuffer) return data;

  const view = data as Uint8Array;
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  return copy.buffer;
}

export function getBackupWorkbookFileName(
  prefix = "sunoki-admin-backup",
): string {
  return `${prefix}-${formatFileTimestamp(new Date())}.xlsx`;
}

export function parseWorkbookRows(workbook: ExcelJS.Workbook): {
  rows: ParsedRowsByTable;
  errors: BackupImportError[];
} {
  const errors: BackupImportError[] = [];
  const rows = EDITABLE_TABLE_NAMES.reduce((result, tableName) => {
    result[tableName] = [];
    return result;
  }, {} as ParsedRowsByTable);
  const allowedSheetNames = new Set<string>([
    ...EDITABLE_TABLE_NAMES,
    METADATA_SHEET_NAME,
  ]);

  for (const worksheet of workbook.worksheets) {
    if (!allowedSheetNames.has(worksheet.name)) {
      errors.push({ message: `Unexpected sheet "${worksheet.name}".` });
    }
  }

  for (const tableName of EDITABLE_TABLE_NAMES) {
    const worksheet = workbook.getWorksheet(tableName);
    if (!worksheet) {
      errors.push({
        tableName,
        message: `Missing required sheet "${tableName}".`,
      });
      continue;
    }

    const table = getAdminTableDefinition(tableName);
    const expectedColumns = table.columns.map((column) => column.name);
    if (!hasExactHeader(worksheet, tableName, expectedColumns, errors)) {
      continue;
    }

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);
      const values: AdminRow = {};
      let hasValue = false;

      expectedColumns.forEach((columnName, columnIndex) => {
        const value = readCellValue(
          row.getCell(columnIndex + 1),
          tableName,
          rowNumber,
          columnName,
          errors,
        );
        values[columnName] = value;
        if (!isEmptyCellValue(value)) hasValue = true;
      });

      row.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
        if (columnNumber <= expectedColumns.length) return;
        const value = readCellValue(
          cell,
          tableName,
          rowNumber,
          `column ${columnNumber}`,
          errors,
        );
        if (!isEmptyCellValue(value)) {
          errors.push({
            tableName,
            rowNumber,
            message: `Unexpected value in column ${columnNumber}.`,
          });
          hasValue = true;
        }
      });

      if (hasValue) rows[tableName].push({ rowNumber, values });
    }
  }

  return { rows, errors };
}

function hasExactHeader(
  worksheet: ExcelJS.Worksheet,
  tableName: EditableTableName,
  expectedColumns: string[],
  errors: BackupImportError[],
): boolean {
  const header = worksheet.getRow(1);
  let ok = true;

  expectedColumns.forEach((columnName, columnIndex) => {
    const value = readCellValue(
      header.getCell(columnIndex + 1),
      tableName,
      1,
      columnName,
      errors,
    );
    if (value !== columnName) {
      errors.push({
        tableName,
        rowNumber: 1,
        columnName,
        message: `Expected header "${columnName}" in column ${columnIndex + 1}.`,
      });
      ok = false;
    }
  });

  header.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
    if (columnNumber <= expectedColumns.length) return;
    const value = readCellValue(
      cell,
      tableName,
      1,
      `column ${columnNumber}`,
      errors,
    );
    if (!isEmptyCellValue(value)) {
      errors.push({
        tableName,
        rowNumber: 1,
        message: `Unexpected header in column ${columnNumber}.`,
      });
      ok = false;
    }
  });

  return ok;
}

function readCellValue(
  cell: ExcelJS.Cell,
  tableName: EditableTableName,
  rowNumber: number,
  columnName: string,
  errors: BackupImportError[],
): AdminRowValue {
  if (cell.type === ExcelJS.ValueType.Formula) {
    errors.push({
      tableName,
      rowNumber,
      columnName,
      message: "Formula cells are not allowed.",
    });
    return null;
  }

  const value = cell.value;
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number") return value;

  errors.push({
    tableName,
    rowNumber,
    columnName,
    message: "Cell must contain plain text or a number.",
  });
  return null;
}

function isEmptyCellValue(value: AdminRowValue): boolean {
  return value === null || value === "";
}
