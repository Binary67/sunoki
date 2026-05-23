import { db, type User } from "../db";
import type { AdminRow, AuditTableName, EditableTableName } from "./definitions";

export const AUDIT_OPERATIONS = ["insert", "update", "delete"] as const;

export type AuditOperation = (typeof AUDIT_OPERATIONS)[number];

export type AuditLog = {
  id: number;
  actorUserId: number;
  actorUsername: string;
  operation: AuditOperation;
  tableName: AuditTableName;
  rowId: number;
  beforeJson: string | null;
  afterJson: string | null;
  createdAt: string;
};

type AuditLogRow = {
  id: number;
  actorUserId: number;
  actorUsername: string;
  operation: AuditOperation;
  tableName: AuditTableName;
  rowId: number;
  beforeJson: string | null;
  afterJson: string | null;
  createdAt: string;
};

export function isAuditOperation(value: string): value is AuditOperation {
  return (AUDIT_OPERATIONS as readonly string[]).includes(value);
}

export function getAuditLogs(filters: {
  tableName?: AuditTableName;
  operation?: AuditOperation;
}): AuditLog[] {
  const conditions: string[] = [];
  const params: string[] = [];

  if (filters.tableName) {
    conditions.push("table_name = ?");
    params.push(filters.tableName);
  }

  if (filters.operation) {
    conditions.push("operation = ?");
    params.push(filters.operation);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = db
    .prepare(
      `
        SELECT
          id,
          actor_user_id AS actorUserId,
          actor_username AS actorUsername,
          operation,
          table_name AS tableName,
          row_id AS rowId,
          before_json AS beforeJson,
          after_json AS afterJson,
          created_at AS createdAt
        FROM audit_logs
        ${where}
        ORDER BY id DESC
        LIMIT 200
      `,
    )
    .all(...params) as AuditLogRow[];

  return rows.map((row) => ({
    id: Number(row.id),
    actorUserId: Number(row.actorUserId),
    actorUsername: row.actorUsername,
    operation: row.operation,
    tableName: row.tableName,
    rowId: Number(row.rowId),
    beforeJson: row.beforeJson,
    afterJson: row.afterJson,
    createdAt: row.createdAt,
  }));
}

export function insertAuditLog(
  actor: User,
  operation: AuditOperation,
  tableName: EditableTableName,
  rowId: number,
  before: AdminRow | null,
  after: AdminRow | null,
): void {
  db.prepare(
    `
      INSERT INTO audit_logs (
        actor_user_id,
        actor_username,
        operation,
        table_name,
        row_id,
        before_json,
        after_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    actor.id,
    actor.username,
    operation,
    tableName,
    rowId,
    before ? JSON.stringify(maskSensitiveValues(tableName, before)) : null,
    after ? JSON.stringify(maskSensitiveValues(tableName, after)) : null,
  );
}

function maskSensitiveValues(
  tableName: EditableTableName,
  row: AdminRow,
): AdminRow {
  if (tableName !== "users" || !("password" in row)) return row;
  return { ...row, password: "[hidden]" };
}
