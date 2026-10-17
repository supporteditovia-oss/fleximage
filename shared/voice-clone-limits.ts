/** Durées échantillon clone — alignées sur la consigne UX « 15–20 s » (Fish Audio). */

/** Minimum pour lancer un clone (en dessous, qualité / ASR trop faibles). Ne pas confondre avec VOICE_CLONE_CREDIT_COST (30 jetons). */
export const VOICE_CLONE_MIN_SAMPLE_SEC = 15;

/** Durée idéale max au micro (interview solo). */
export const VOICE_CLONE_IDEAL_MAX_SEC = 20;

/** Plafond enregistrement micro. */
export const VOICE_CLONE_MAX_RECORD_SEC = VOICE_CLONE_IDEAL_MAX_SEC;

/** Plafond import / trim (MP3, MP4…). */
export const VOICE_CLONE_MAX_IMPORT_SEC = 25;

/** Mode C — avertissement UX non bloquant (extrait très court). */
export const VOICE_CLONE_IMPORT_SHORT_WARN_SEC = 4;

/** Conseil fidélité Mode C (copy UI). */
export const VOICE_CLONE_IMPORT_IDEAL_HINT_SEC = 10;

const DURATION_TOLERANCE_SEC = 0.5;

export function formatVoiceCloneDurationLabel(durationSec: number): string {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return "0";
  const rounded = Math.round(durationSec * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** Évite toute confusion avec VOICE_CLONE_CREDIT_COST (30 jetons). */
export function resolveVoiceCloneMinSampleSec(minSec?: number): number {
  const n = Number(minSec);
  if (!Number.isFinite(n) || n <= 0 || n > 24 || n === 30) {
    return VOICE_CLONE_MIN_SAMPLE_SEC;
  }
  return n;
}

export function formatVoiceCloneSampleTooShortMessage(
  durationSec: number,
  options?: {
    minSec?: number;
    source?: "record" | "import";
  },
): string {
  const minSec = resolveVoiceCloneMinSampleSec(options?.minSec);
  const source = options?.source ?? "record";
  const label = source === "record" ? "Enregistrement" : "Extrait";
  const attempt = formatVoiceCloneDurationLabel(durationSec);
  return `${label} trop court (${attempt} s) — minimum ${minSec} s de voix claire. Max ${VOICE_CLONE_MAX_IMPORT_SEC} s à l'import, ${VOICE_CLONE_MAX_RECORD_SEC} s au micro.`;
}

export function formatVoiceCloneSampleTooLongMessage(
  durationSec: number,
  options?: {
    maxSec?: number;
    source?: "record" | "import";
  },
): string {
  const maxSec =
    options?.maxSec === VOICE_CLONE_MAX_RECORD_SEC ||
    options?.maxSec === VOICE_CLONE_MAX_IMPORT_SEC
      ? options.maxSec
      : options?.source === "record"
        ? VOICE_CLONE_MAX_RECORD_SEC
        : VOICE_CLONE_MAX_IMPORT_SEC;
  const source = options?.source ?? "import";
  const label = source === "record" ? "Enregistrement" : "Extrait";
  const attempt = formatVoiceCloneDurationLabel(durationSec);
  return `${label} trop long (${attempt} s) — maximum ${maxSec} s pour le clonage.`;
}

/** Durée effective : mesure WAV + chrono client (WebM mobile ment souvent). */
export function resolveEffectiveVoiceCloneSampleSec(
  measuredSec: number,
  clientHintSec?: number | null,
): number {
  const measured = Number(measuredSec) || 0;
  const hint = Number(clientHintSec) || 0;
  if (measured <= 0) return hint;
  if (hint <= 0) return measured;
  if (
    hint >= VOICE_CLONE_MIN_SAMPLE_SEC - 1 &&
    measured < VOICE_CLONE_MIN_SAMPLE_SEC - 0.5 &&
    hint >= measured + 1.5
  ) {
    return hint;
  }
  return Math.max(measured, hint);
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

export function shouldWarnVoiceImportSampleShort(
  durationSec: number,
  thresholdSec: number = VOICE_CLONE_IMPORT_SHORT_WARN_SEC,
): boolean {
  return (
    Number.isFinite(durationSec) &&
    durationSec > 0 &&
    durationSec < thresholdSec
  );
}

export function formatVoiceImportShortSampleWarning(
  idealSec: number = VOICE_CLONE_IMPORT_IDEAL_HINT_SEC,
): string {
  return `Extrait très court : le clonage sera plus fidèle avec une source de ${idealSec}s+.`;
}
