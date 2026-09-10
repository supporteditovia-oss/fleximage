export const GENERATION_RETENTION_DAYS = 7;
export const GENERATION_RETENTION_MS =
  GENERATION_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export function resolveGenerationExpiresAtMs(input: {
  expiresAt?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
}): number | null {
  if (input.expiresAt) {
    const ms = new Date(input.expiresAt).getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  const baseIso = input.completedAt || input.createdAt;
  if (!baseIso) return null;
  const baseMs = new Date(baseIso).getTime();
  if (!Number.isFinite(baseMs)) return null;
  return baseMs + GENERATION_RETENTION_MS;
}

export function getGenerationRetentionMsRemaining(
  expiresAtMs: number | null,
  now = Date.now(),
): number {
  if (!expiresAtMs) return 0;
  return Math.max(0, expiresAtMs - now);
}

/** Affichage pro : « Expire dans 5j », « 12h 04m », « 04:32 » */
export function formatGenerationRetentionCountdown(
  msRemaining: number,
  locale = "fr",
): string {
  if (msRemaining <= 0) return locale.startsWith("en") ? "Expired" : "Expiré";

  const totalMinutes = Math.ceil(msRemaining / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days >= 1) {
    return locale.startsWith("en")
      ? `Expires in ${days}d`
      : `Expire dans ${days}j`;
  }
  if (hours >= 1) {
    return locale.startsWith("en")
      ? `Expires in ${hours}h ${String(minutes).padStart(2, "0")}m`
      : `Expire dans ${hours}h ${String(minutes).padStart(2, "0")}m`;
  }

  const totalSeconds = Math.ceil(msRemaining / 1000);
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return locale.startsWith("en")
    ? `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
    : `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
