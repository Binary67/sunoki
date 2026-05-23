import { getCurrentUser } from "@/src/lib/auth";
import {
  generateBackupWorkbookBuffer,
  getBackupWorkbookFileName,
} from "@/src/lib/admin-data/backup";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const user = await getCurrentUser();
  if (user?.role !== "superadmin") {
    return new Response("Forbidden", { status: 403 });
  }

  const buffer = await generateBackupWorkbookBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${getBackupWorkbookFileName()}"`,
      "Cache-Control": "no-store",
    },
  });
}
