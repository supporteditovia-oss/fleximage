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

  /** Fish catalogue prioritaire (ex. Niska) même si un voiceCloneId résiduel est envoyé. */
  if (catalogEntry && fish) {
    return { mode: "A", catalogEntry, isCatalogPresetVoice: true };
  }

  if (voiceCloneId) {
    const mode = sourceType === "record" ? "B" : "C";
    return { mode, catalogEntry: null, isCatalogPresetVoice: false };
  }

  return { mode: "C", catalogEntry: null, isCatalogPresetVoice: false };
}

/**
 * Warmth post-TTS uniquement quand utile (coffre / identité Mode C).
 * Mode A catalogue et Mode B micro : aucun filtre FFmpeg destructif en sortie.
 */
function shouldApplyCloneWarmthPostprocess({
  isCatalogPresetVoice,
  generationMode,
  incisiveClone,
  deepChestClone,
  inlineIdentityClone,
} = {}) {
  if (isCatalogPresetVoice || generationMode === "A") return false;
  if (generationMode === "B") return false;
  if (incisiveClone === true) return false;
  if (generationMode === "C") {
    return deepChestClone === true || inlineIdentityClone === true;
  }
  return false;
}

/** Mode C / import vidéo — profil Fish inline orienté identité timbrale. */
function shouldUseInlineIdentityClone({
  generationMode,
  cloneSourceType,
  hasInstantImport,
} = {}) {
  if (generationMode === "C") return true;
  if (hasInstantImport) return true;
  if (cloneSourceType === "import") return true;
  return false;
}

module.exports = {
  resolveVoiceGenerationMode,
  shouldApplyCloneWarmthPostprocess,
  shouldUseInlineIdentityClone,
};
