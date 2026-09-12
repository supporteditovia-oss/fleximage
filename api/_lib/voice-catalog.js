/** Phrase unique pour tous les aperçus catalogue — identique à la génération Fish. */
const CATALOG_SAMPLE_LINE =
  "Ce soir, direction Dubai Marina. La suite est réservée, la soirée aussi.";

const catalog = require("../../shared/voice-catalog.json");

const MIN_TTS_SPEED = 0.65;
const MAX_TTS_SPEED = 1.35;
const DEFAULT_TTS_SPEED = 1.02;

function isValidFishReferenceId(id) {
  return /^[a-f0-9]{32}$/i.test(String(id || "").trim());
}

/** Incrémenter quand le débit catalogue change (invalidation cache R2). */
const UNIFIED_PREVIEW_VERSION = 2;

function unifiedPreviewCacheKey(fishReferenceId) {
  return `voice-catalog/unified/v${UNIFIED_PREVIEW_VERSION}/${String(fishReferenceId).toLowerCase()}.mp3`;
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
 * Débit Fish Audio par voix catalogue (champ rate ou ttsSpeed).
 * Retourne null si voix hors catalogue → débit global par défaut.
 */
function resolveCatalogTtsSpeed(fishReferenceId) {
  const entry = lookupCatalogEntryByFishId(fishReferenceId);
  if (!entry) return null;

  const raw =
    typeof entry.ttsSpeed === "number" && Number.isFinite(entry.ttsSpeed)
      ? entry.ttsSpeed
      : typeof entry.rate === "number" && Number.isFinite(entry.rate)
        ? entry.rate
        : null;

  if (raw == null) return null;
  return clampTtsSpeed(raw);
}

module.exports = {
  CATALOG_SAMPLE_LINE,
  DEFAULT_TTS_SPEED,
  MIN_TTS_SPEED,
  MAX_TTS_SPEED,
  clampTtsSpeed,
  isValidFishReferenceId,
  unifiedPreviewCacheKey,
  lookupCatalogEntryByFishId,
  resolveCatalogTtsSpeed,
};
