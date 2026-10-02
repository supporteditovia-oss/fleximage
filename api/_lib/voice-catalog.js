const {
  buildCatalogSampleLine,
  normalizeVoiceLocale,
} = require("../../shared/voice-locale-scripts.cjs");

const catalog = require("../../shared/voice-catalog.json");

const MIN_TTS_SPEED = 0.65;
const MAX_TTS_SPEED = 1.35;
const DEFAULT_TTS_SPEED = 1.02;

function isValidFishReferenceId(id) {
  return /^[a-f0-9]{32}$/i.test(String(id || "").trim());
}

/** Incrémenter quand le débit catalogue change (invalidation cache R2). */
const UNIFIED_PREVIEW_VERSION = 9;

function unifiedPreviewCacheKey(fishReferenceId, localeLike) {
  const locale = normalizeVoiceLocale(localeLike);
  return `voice-catalog/unified/v${UNIFIED_PREVIEW_VERSION}/${locale}/${String(fishReferenceId).toLowerCase()}.mp3`;
}

function clampTtsSpeed(speed) {
  return Math.min(MAX_TTS_SPEED, Math.max(MIN_TTS_SPEED, Number(speed)));
}

function lookupCatalogEntryByFishId(fishReferenceId) {
  const id = String(fishReferenceId || "").trim().toLowerCase();
  if (!id) return null;
  return (
    catalog.entries.find(
      (entry) => String(entry.fishId || "").trim().toLowerCase() === id,
    ) ?? null
  );
}

/**
 * Débit Fish Audio par voix catalogue.
 * `pitch` (UI / Web Speech) × `rate` → vitesse Fish : plus grave = plus lent (Gazo, Booba…).
 * Retourne null si voix hors catalogue.
 */
function resolveCatalogTtsSpeed(fishReferenceId) {
  const entry = lookupCatalogEntryByFishId(fishReferenceId);
  if (!entry) return null;

  const rate =
    typeof entry.ttsSpeed === "number" && Number.isFinite(entry.ttsSpeed)
      ? entry.ttsSpeed
      : typeof entry.rate === "number" && Number.isFinite(entry.rate)
        ? entry.rate
        : DEFAULT_TTS_SPEED;
  const pitch =
    typeof entry.pitch === "number" && Number.isFinite(entry.pitch)
      ? entry.pitch
      : 1;

  return clampTtsSpeed(rate * pitch);
}

function isCatalogFishReferenceId(fishReferenceId) {
  return Boolean(lookupCatalogEntryByFishId(fishReferenceId));
}

module.exports = {
  buildCatalogSampleLine,
  normalizeVoiceLocale,
  DEFAULT_TTS_SPEED,
  MIN_TTS_SPEED,
  MAX_TTS_SPEED,
  clampTtsSpeed,
  isValidFishReferenceId,
  unifiedPreviewCacheKey,
  lookupCatalogEntryByFishId,
  isCatalogFishReferenceId,
  resolveCatalogTtsSpeed,
};
