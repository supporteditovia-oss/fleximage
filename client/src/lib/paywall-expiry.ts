const STORAGE_KEY = "luxeflexia_paywall_expires_at";
export const PAYWALL_PREVIEW_TTL_MS = 5 * 60 * 1000;

export function getPaywallExpiresAt(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

/**
 * Keep the existing deadline across refresh / return visits.
 * Only starts a fresh 5:00 when none exists (or the previous one already expired).
 */
export function ensurePaywallExpiry(now = Date.now()): number {
  const existing = getPaywallExpiresAt();
  if (existing && existing > now) {
    return existing;
  }

  const expiresAt = now + PAYWALL_PREVIEW_TTL_MS;
  try {
    localStorage.setItem(STORAGE_KEY, String(expiresAt));
  } catch {
    // private mode — timer still runs in-memory via returned value
  }
  return expiresAt;
}

/** Force a brand-new 5:00 window (call when a new locked preview is created). */
export function resetPaywallExpiry(now = Date.now()): number {
  clearPaywallExpiry();
  return ensurePaywallExpiry(now);
}

export function clearPaywallExpiry(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function getPaywallMsRemaining(
  expiresAt: number | null,
  now = Date.now(),
): number {
  if (!expiresAt) return 0;
  return Math.max(0, expiresAt - now);
}

export function formatPaywallCountdown(msRemaining: number): string {
  const totalSeconds = Math.ceil(msRemaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function isPaywallExpired(
  expiresAt: number | null,
  now = Date.now(),
): boolean {
  return Boolean(expiresAt && expiresAt <= now);
}
