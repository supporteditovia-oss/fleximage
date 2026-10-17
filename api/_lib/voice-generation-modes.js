const { lookupCatalogEntryByFishId } = require("./voice-catalog");

/**
 * Modes clonage / TTS LuxeFlexIA.
 * A — catalogue studio (reference_id stable, pas de warmth ni prep destructive)
 * B — clone micro perso (voiceCloneId + source record)
 * C — import / vidéo externe (prep FFmpeg + Fish sans enhance)
 */
function resolveVoiceGenerationMode({
  voiceCloneId,
  fishReferenceId,
  sourceType,
} = {}) {
  const fish = String(fishReferenceId || "").trim();
  const catalogEntry = fish ? lookupCatalogEntryByFishId(fish) : null;

  if (catalogEntry && !voiceCloneId) {
    return { mode: "A", catalogEntry, isCatalogPresetVoice: true };
  }

  if (voiceCloneId) {
    const mode = sourceType === "record" ? "B" : "C";
    return { mode, catalogEntry: null, isCatalogPresetVoice: false };
  }

  return { mode: "C", catalogEntry: null, isCatalogPresetVoice: false };
}

function shouldApplyCloneWarmthPostprocess({ isCatalogPresetVoice }) {
  return !isCatalogPresetVoice;
}

module.exports = {
  resolveVoiceGenerationMode,
  shouldApplyCloneWarmthPostprocess,
};
