import ExcelJS from "exceljs";
import { getCurrentUser } from "@/src/lib/auth";
import { listPackageEntitlementOptions } from "@/src/lib/package-entitlement-options";
import { isAdminRole } from "@/src/lib/roles";
import type { GuestProfileColumn } from "@/src/lib/guest-profiles";

type ImportedGuestProfile = Record<GuestProfileColumn, string>;

type GuestImportMatch = {
  row: ExcelJS.Row;
  rowNumber: number;
  timestamp: number;
};

const GUEST_IMPORT_COLUMNS = [
  ["name", 3],
  ["ic_no", 4],
  ["handphone_no", 5],
  ["email", 6],
  ["hospital_of_delivery", 8],
  ["mode_of_delivery", 9],
  ["child_count", 10],
  ["special_note", 11],
  ["husband_name", 12],
  ["husband_ic_no", 13],
  ["husband_handphone_no", 14],
  ["husband_email", 15],
  ["address", 16],
  ["occupation", 17],
  ["occupation_2", 18],
  ["package_special_note", 23],
  ["consultant_name", 24],
  ["medical_food_notes", 25],
] as const satisfies readonly [GuestProfileColumn, number][];

export async function POST(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role)) {
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const icNo = readImportText(formData.get("icNo"));
  const normalizedIcNo = normalizeIcNo(icNo);

  if (!file || !(file instanceof File) || file.size === 0) {
    return Response.json({ message: "Upload an .xlsx file." }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return Response.json(
      { message: "Upload a .xlsx workbook." },
      { status: 400 },
    );
  }
  if (!normalizedIcNo) {
    return Response.json({ message: "Enter an IC number." }, { status: 400 });
  }

  let workbook: ExcelJS.Workbook;
  try {
    const buffer = await file.arrayBuffer();
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as Parameters<ExcelJS.Xlsx["load"]>[0]);
  } catch {
    return Response.json(
      { message: "Upload a valid .xlsx workbook." },
      { status: 400 },
    );
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return Response.json(
      { message: "Workbook does not contain a worksheet." },
      { status: 400 },
    );
  }

  const matches: GuestImportMatch[] = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    if (normalizeIcNo(readCellText(row.getCell(4))) !== normalizedIcNo) {
      continue;
    }

    matches.push({
      row,
      rowNumber,
      timestamp: getTimestamp(row.getCell(1)),
    });
  }

  if (matches.length === 0) {
    return Response.json(
      { message: "No guest found for this IC number." },
      { status: 404 },
    );
  }

  matches.sort(
    (left, right) =>
      right.timestamp - left.timestamp || right.rowNumber - left.rowNumber,
  );

  return Response.json({ profile: buildImportedProfile(matches[0].row) });
}

function buildImportedProfile(row: ExcelJS.Row): ImportedGuestProfile {
  const profile = {
    room_number: "",
    expected_delivery_date: readDateCell(row.getCell(7)),
    check_in_date: "",
    package_type: readPackageTypeCell(row.getCell(19)),
    package_payable_amount: "",
    deposit_to_pay: "",
    balance_to_pay: "",
  } as ImportedGuestProfile;

  for (const [fieldName, columnNumber] of GUEST_IMPORT_COLUMNS) {
    profile[fieldName] = readCellText(row.getCell(columnNumber));
  }

  return profile;
}

function readPackageTypeCell(cell: ExcelJS.Cell): string {
  const importedPackageName = readCellText(cell)
    .replace(/\s+28\s+days?$/i, "")
    .trim()
    .toUpperCase();
  if (!importedPackageName || importedPackageName === "-") return "";

  const matchedPackage = listPackageEntitlementOptions().find((option) => {
    const packageName = option.packageName.toUpperCase();
    return (
      packageName === importedPackageName ||
      packageName.startsWith(`${importedPackageName} `)
    );
  });

  return matchedPackage?.packageName ?? "";
}

function readImportText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function readCellText(cell: ExcelJS.Cell): string {
  const text = cell.text.trim();
  if (!text) return "-";

  const upperText = text.toUpperCase();
  return upperText === "N/A" || upperText === "NA" || upperText === "NIL"
    ? "-"
    : text;
}

function readDateCell(cell: ExcelJS.Cell): string {
  if (cell.value instanceof Date) return formatDateInputValue(cell.value);

  const text = cell.text.trim();
  if (!text) return "";

  const parsedDate = new Date(text);
  return Number.isNaN(parsedDate.getTime())
    ? ""
    : formatDateInputValue(parsedDate);
}

function formatDateInputValue(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeIcNo(value: string): string {
  return value.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

function getTimestamp(cell: ExcelJS.Cell): number {
  if (cell.value instanceof Date) return cell.value.getTime();

  const timestamp = Date.parse(cell.text.trim());
  return Number.isNaN(timestamp) ? 0 : timestamp;
}
