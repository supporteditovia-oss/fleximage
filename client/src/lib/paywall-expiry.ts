const STORAGE_KEY = "luxeflexia_paywall_expires_at";
export const PAYWALL_PREVIEW_TTL_MS = 5 * 60 * 1000;

/** Always start a fresh 5-minute window (leaving/returning resets the timer). */
export function startPaywallExpiry(now = Date.now()): number {
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
