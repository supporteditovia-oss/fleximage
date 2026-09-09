const SUBMIT_LOCK_KEY = "luxeflexia:generation-submit-lock";
/** Aligné sur GENERATION_DEDUP_WINDOW_MS côté serveur (120 s). */
const SUBMIT_LOCK_MS = 120_000;

/** Verrou cross-onglet : empêche deux POST avant le claim serveur. */
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

/** Ne libère le verrou qu'après échec — en succès, le job in-flight le protège. */
export function releaseGenerationSubmitLockOnError(): void {
  releaseGenerationSubmitLock();
}
