import { randomBytes } from "node:crypto";
import { db, type User } from "../../db";
import { formatDateTime } from "./format";
import type { BackupImportDraft, BackupImportDraftPayload } from "./types";

const BACKUP_DRAFT_TTL_MINUTES = 30;

type DraftRow = {
  token: string;
  actorUserId: number;
  actorUsername: string;
  payloadJson: string;
  createdAt: string;
  expiresAt: string;
};

export function getBackupImportDraft(
  token: string,
  actor: User,
): BackupImportDraft | null {
  pruneExpiredBackupDrafts();
  if (!isValidDraftToken(token)) return null;

  const row = db
    .prepare(
      `
        SELECT
          token,
          actor_user_id AS actorUserId,
          actor_username AS actorUsername,
          payload_json AS payloadJson,
          created_at AS createdAt,
          expires_at AS expiresAt
        FROM admin_import_drafts
        WHERE token = ?
          AND actor_user_id = ?
          AND expires_at > ?
      `,
    )
    .get(token, actor.id, formatDateTime(new Date())) as DraftRow | undefined;

  if (!row) return null;

  try {
    return {
      token: row.token,
      actorUserId: Number(row.actorUserId),
      actorUsername: row.actorUsername,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      payload: JSON.parse(row.payloadJson) as BackupImportDraftPayload,
    };
  } catch {
    return null;
  }
}

export function saveBackupDraft(
  actor: User,
  payload: BackupImportDraftPayload,
): string {
  const token = randomBytes(24).toString("hex");
  updateBackupDraft(actor, token, payload);
  return token;
}

export function updateBackupDraft(
  actor: User,
  token: string,
  payload: BackupImportDraftPayload,
): void {
  pruneExpiredBackupDrafts();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + BACKUP_DRAFT_TTL_MINUTES * 60_000);
  db.prepare(
    `
      INSERT INTO admin_import_drafts (
        token,
        actor_user_id,
        actor_username,
        payload_json,
        created_at,
        expires_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(token) DO UPDATE SET
        payload_json = excluded.payload_json,
        expires_at = excluded.expires_at
    `,
  ).run(
    token,
    actor.id,
    actor.username,
    JSON.stringify(payload),
    formatDateTime(now),
    formatDateTime(expiresAt),
  );
}

export function deleteBackupDraft(token: string): void {
  db.prepare("DELETE FROM admin_import_drafts WHERE token = ?").run(token);
}

function pruneExpiredBackupDrafts(): void {
  db.prepare("DELETE FROM admin_import_drafts WHERE expires_at <= ?").run(
    formatDateTime(new Date()),
  );
}

function isValidDraftToken(token: string): boolean {
  return /^[a-f0-9]{48}$/.test(token);
}
