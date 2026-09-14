import { authFetch } from "@/lib/api";
import { getFunnelSessionId } from "@/lib/funnel-tracker";

/** Enregistre côté serveur la deadline du preview verrouillé (email relance si expiré). */
export async function registerPreviewLock(expiresAtMs: number): Promise<void> {
  try {
    await authFetch("/api/funnel/preview-lock", {
      method: "POST",
      body: JSON.stringify({
        expires_at_ms: expiresAtMs,
        funnel_session_id: getFunnelSessionId(),
      }),
    });
  } catch {
    /* non-bloquant */
  }
}

/** Marque le preview comme récupéré (paiement ou abandon volontaire). */
export async function markPreviewRecovered(): Promise<void> {
  try {
    await authFetch("/api/funnel/preview-recovered", {
      method: "POST",
    });
  } catch {
    /* non-bloquant */
  }
}
