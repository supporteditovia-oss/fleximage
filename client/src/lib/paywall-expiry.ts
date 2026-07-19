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

/** Start (or keep) the 5-minute preview window once the locked image is shown. */
export function ensurePaywallExpiry(now = Date.now()): number {
  const existing = getPaywallExpiresAt();
  if (existing && existing > now) return existing;

  const expiresAt = now + PAYWALL_PREVIEW_TTL_MS;
  try {
    localStorage.setItem(STORAGE_KEY, String(expiresAt));
  } catch {
    // private mode — timer still runs in-memory via returned value
  }
  return expiresAt;
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
