/**
 * Synthèse catalogue — une seule pipeline pour l’aperçu (play) et la génération payante.
 */
const { synthesizeSpeech } = require("./fish-audio");
const { prepareVoiceTtsForFish } = require("./voice-humanize");
const {
  lookupCatalogEntryByFishId,
  resolveCatalogTtsSpeed,
} = require("./voice-catalog");

function resolveCatalogVoiceName(fishReferenceId, voiceName) {
  const trimmed = typeof voiceName === "string" ? voiceName.trim() : "";
  if (trimmed) return trimmed;
  return lookupCatalogEntryByFishId(fishReferenceId)?.name ?? null;
}

/**
 * @param {{ fishReferenceId: string; text: string; voiceName?: string | null }} params
 * @returns {Promise<Buffer>}
 */
async function synthesizeCatalogArtistSpeech(params) {
  const fishReferenceId = String(params.fishReferenceId || "").trim();
  const rawText = String(params.text || "").trim();
  if (!fishReferenceId || !rawText) {
    throw Object.assign(new Error("Voix catalogue et texte requis"), {
      status: 400,
      code: "missing_catalog_input",
    });
  }

  const voiceName = resolveCatalogVoiceName(fishReferenceId, params.voiceName);
  const fishText = prepareVoiceTtsForFish(rawText, { voiceName });
  const speed = resolveCatalogTtsSpeed(fishReferenceId);

  return synthesizeSpeech({
    text: fishText,
    referenceId: fishReferenceId,
    speed: speed ?? undefined,
    cloneFidelity: false,
  });
}

module.exports = {
  synthesizeCatalogArtistSpeech,
  resolveCatalogVoiceName,
};
