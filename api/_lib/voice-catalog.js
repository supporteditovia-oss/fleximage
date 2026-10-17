const {
  buildCatalogSampleLine,
  normalizeVoiceLocale,
} = require("../../shared/voice-locale-scripts.cjs");

const catalog = require("../../shared/voice-catalog.json");
const { findI2VLibraryEntryByFishId } = require("../../shared/i2v-voice-library.cjs");

const MIN_TTS_SPEED = 0.65;
const MAX_TTS_SPEED = 1.35;
const DEFAULT_TTS_SPEED = 1.02;

function isValidFishReferenceId(id) {
  return /^[a-f0-9]{32}$/i.test(String(id || "").trim());
}

/** Incrémenter quand le débit catalogue change (invalidation cache R2). */
const UNIFIED_PREVIEW_VERSION = 6;

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
 * Débit Fish Audio par voix catalogue (champ rate ou ttsSpeed).
 * Retourne null si voix hors catalogue → débit global par défaut.
 */
function resolveCatalogTtsSpeed(fishReferenceId) {
  const entry = lookupCatalogEntryByFishId(fishReferenceId);
  if (entry) {
    const raw =
      typeof entry.ttsSpeed === "number" && Number.isFinite(entry.ttsSpeed)
        ? entry.ttsSpeed
        : typeof entry.rate === "number" && Number.isFinite(entry.rate)
          ? entry.rate
          : null;
    if (raw != null) return clampTtsSpeed(raw);
  }

  const i2vEntry = findI2VLibraryEntryByFishId(fishReferenceId);
  if (i2vEntry && typeof i2vEntry.ttsSpeed === "number") {
    return clampTtsSpeed(i2vEntry.ttsSpeed);
  }

  return null;
}

/** Rappeurs au flow rapide / incisif (Mode A studio). */
function isCatalogFastDelivery(entry) {
  if (!entry) return false;
  const pace = String(entry.deliveryPace || "").trim().toLowerCase();
  if (pace === "fast") return true;
  if (pace === "steady" || pace === "slow") return false;
  if (entry.category !== "Rap") return false;
  const speed = resolveCatalogTtsSpeed(entry.fishId);
  return typeof speed === "number" && speed >= 1.04;
}

/**
 * Profil débit catalogue Mode A — vitesse Fish + flag flow rap (PLK, Jul…).
 */
function resolveCatalogDeliveryProfile(fishReferenceId) {
  const entry = lookupCatalogEntryByFishId(fishReferenceId);
  if (!entry) {
    return { ttsSpeed: null, fastFlow: false, entry: null };
  }
  return {
    ttsSpeed: resolveCatalogTtsSpeed(fishReferenceId),
    fastFlow: isCatalogFastDelivery(entry),
    entry,
  };
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
  resolveCatalogTtsSpeed,
  isCatalogFastDelivery,
  resolveCatalogDeliveryProfile,
};
