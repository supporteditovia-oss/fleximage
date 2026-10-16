/** Miroir de shared/voice-clone-limits.ts (API Node). */

const VOICE_CLONE_MIN_SAMPLE_SEC = 15;
const VOICE_CLONE_IDEAL_MAX_SEC = 20;
const VOICE_CLONE_MAX_RECORD_SEC = VOICE_CLONE_IDEAL_MAX_SEC;
const VOICE_CLONE_MAX_IMPORT_SEC = 25;
const DURATION_TOLERANCE_SEC = 0.5;

function formatVoiceCloneDurationLabel(durationSec) {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return "0";
  const rounded = Math.round(durationSec * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function resolveVoiceCloneMinSampleSec(minSec) {
  const n = Number(minSec);
  if (!Number.isFinite(n) || n <= 0 || n > 24 || n === 30) {
    return VOICE_CLONE_MIN_SAMPLE_SEC;
  }
  return n;
}

function formatVoiceCloneSampleTooShortMessage(durationSec, options = {}) {
  const minSec = resolveVoiceCloneMinSampleSec(options.minSec);
  const source = options.source ?? "record";
  const label = source === "record" ? "Enregistrement" : "Extrait";
  const attempt = formatVoiceCloneDurationLabel(durationSec);
  return `${label} trop court (${attempt} s) — minimum ${minSec} s de voix claire. Max ${VOICE_CLONE_MAX_IMPORT_SEC} s à l'import, ${VOICE_CLONE_MAX_RECORD_SEC} s au micro.`;
}

function resolveEffectiveVoiceCloneSampleSec(measuredSec, clientHintSec) {
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

function isVoiceCloneSampleLongEnough(
  durationSec,
  minSec = VOICE_CLONE_MIN_SAMPLE_SEC,
) {
  return (
    Number.isFinite(durationSec) &&
    durationSec >= minSec - DURATION_TOLERANCE_SEC
  );
}

module.exports = {
  VOICE_CLONE_MIN_SAMPLE_SEC,
  VOICE_CLONE_IDEAL_MAX_SEC,
  VOICE_CLONE_MAX_RECORD_SEC,
  VOICE_CLONE_MAX_IMPORT_SEC,
  formatVoiceCloneDurationLabel,
  formatVoiceCloneSampleTooShortMessage,
  resolveVoiceCloneMinSampleSec,
  resolveEffectiveVoiceCloneSampleSec,
  isVoiceCloneSampleLongEnough,
};
