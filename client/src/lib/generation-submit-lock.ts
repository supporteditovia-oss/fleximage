const SUBMIT_LOCK_KEY = "luxeflexia:generation-submit-lock";
/** Anti double-tap / double-clic (pas de blocage pendant toute la génération). */
const SUBMIT_LOCK_MS = 2_500;

/** Verrou cross-onglet : empêche deux POST simultanés (< 2,5 s). */
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

/** Libère un verrou périmé (génération terminée, plus de job in-flight). */
export function tryAcquireGenerationSubmitLockOrRecover(
  hasActiveInFlight: boolean,
): boolean {
  if (tryAcquireGenerationSubmitLock()) return true;
  if (hasActiveInFlight) return false;
  releaseGenerationSubmitLock();
  return tryAcquireGenerationSubmitLock();
}
