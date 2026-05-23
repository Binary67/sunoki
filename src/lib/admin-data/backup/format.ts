export function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

export function formatFileTimestamp(date: Date): string {
  return formatDateTime(date).replace(" ", "-").replaceAll(":", "");
}

export function getColumnWidth(columnName: string): number {
  if (columnName === "password") return 24;
  if (columnName.endsWith("_at")) return 22;
  if (columnName.endsWith("_date")) return 14;
  if (columnName.includes("tagline")) return 18;
  return Math.max(12, columnName.length + 4);
}
