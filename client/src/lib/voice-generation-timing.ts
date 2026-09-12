/** Durée du faux loader voix (invité / non-abonné) — compte à rebours aligné. */
export const VOICE_FAKE_GEN_MS = 12_000;

/** Estimation génération réelle Clonage IA (Fish : entraînement + synthèse). */
export const VOICE_GEN_ESTIMATE_SEC = 35;

export function voiceFakeEstimateSeconds(durationMs = VOICE_FAKE_GEN_MS): number {
  return Math.max(8, Math.round(durationMs / 1000));
}
