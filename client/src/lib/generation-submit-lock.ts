const SUBMIT_LOCK_KEY = "luxeflexia:generation-submit-lock";
const SUBMIT_LOCK_MS = 120_000;

/** Verrou court cross-onglet pour éviter deux POST simultanés avant le dedup serveur. */
export function tryAcquireGenerationSubmitLock(): boolean {
  try {
    const raw = sessionStorage.getItem(SUBMIT_LOCK_KEY);
    if (raw) {
      const ts = Number(raw);
      if (Number.isFinite(ts) && Date.now() - ts < SUBMIT_LOCK_MS) {
        return false;
      }
    }
    sessionStorage.setItem(SUBMIT_LOCK_KEY, String(Date.now()));
    return true;
  } catch {
    return true;
  }
}

export function releaseGenerationSubmitLock(): void {
  try {
    sessionStorage.removeItem(SUBMIT_LOCK_KEY);
  } catch {
    /* ignore */
  }
}

export function releaseGenerationSubmitLockOnError(): void {
  releaseGenerationSubmitLock();
}
