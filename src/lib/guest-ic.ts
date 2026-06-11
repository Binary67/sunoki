export function normalizeGuestIcNo(value: string | null | undefined): string | null {
  const normalized = (value ?? "").replace(/[^a-z0-9]/gi, "").toUpperCase();
  return normalized || null;
}
