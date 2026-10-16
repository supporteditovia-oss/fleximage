/** Durées échantillon clone — alignées sur la consigne UX « 15–20 s » (Fish Audio). */

/** Minimum pour lancer un clone (en dessous, qualité / ASR trop faibles). Ne pas confondre avec VOICE_CLONE_CREDIT_COST (30 jetons). */
export const VOICE_CLONE_MIN_SAMPLE_SEC = 15;

/** Durée idéale max au micro (interview solo). */
export const VOICE_CLONE_IDEAL_MAX_SEC = 20;

/** Plafond enregistrement micro. */
export const VOICE_CLONE_MAX_RECORD_SEC = VOICE_CLONE_IDEAL_MAX_SEC;

/** Plafond import / trim (MP3, MP4…). */
export const VOICE_CLONE_MAX_IMPORT_SEC = 25;

const DURATION_TOLERANCE_SEC = 0.5;

export function formatVoiceCloneDurationLabel(durationSec: number): string {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return "0";
  const rounded = Math.round(durationSec * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function formatVoiceCloneSampleTooShortMessage(
  durationSec: number,
  options?: {
    minSec?: number;
    source?: "record" | "import";
  },
): string {
  const minSec = options?.minSec ?? VOICE_CLONE_MIN_SAMPLE_SEC;
  const source = options?.source ?? "record";
  const label = source === "record" ? "Enregistrement" : "Extrait";
  const attempt = formatVoiceCloneDurationLabel(durationSec);
  return `${label} trop court (${attempt} s) — minimum ${minSec} s de voix claire.`;
}

export function isVoiceCloneSampleLongEnough(
  durationSec: number,
  minSec: number = VOICE_CLONE_MIN_SAMPLE_SEC,
): boolean {
  return (
    Number.isFinite(durationSec) &&
    durationSec >= minSec - DURATION_TOLERANCE_SEC
  );
}
