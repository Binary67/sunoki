import { getCurrentUser } from "@/src/lib/auth";
import {
  generateTableExportWorkbookBuffer,
  getTableExportWorkbookFileName,
  isExportTableName,
  type ExportTableName,
} from "@/src/lib/admin-data/table-export";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (user?.role !== "superadmin") {
    return new Response("Forbidden", { status: 403 });
  }

  const searchParams = new URL(request.url).searchParams;
  const requestedTables = searchParams.getAll("table");
  if (requestedTables.length === 0) {
    return new Response("Select at least one table to export.", {
      status: 400,
    });
  }

  if (!requestedTables.every(isExportTableName)) {
    return new Response("Invalid table selection.", { status: 400 });
  }

  const tableNames = Array.from(
    new Set(requestedTables),
  ) as ExportTableName[];
  const buffer = await generateTableExportWorkbookBuffer(tableNames);

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${getTableExportWorkbookFileName()}"`,
      "Cache-Control": "no-store",
    },
  });
}
