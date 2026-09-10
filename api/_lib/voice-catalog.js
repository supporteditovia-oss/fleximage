/** Phrase unique pour tous les aperçus catalogue — identique à la génération Fish. */
const CATALOG_SAMPLE_LINE =
  "Personne ne croyait en moi, alors j'ai arrêté d'expliquer.";

function isValidFishReferenceId(id) {
  return /^[a-f0-9]{32}$/i.test(String(id || "").trim());
}

function unifiedPreviewCacheKey(fishReferenceId) {
  return `voice-catalog/unified/${String(fishReferenceId).toLowerCase()}.mp3`;
}

module.exports = {
  CATALOG_SAMPLE_LINE,
  isValidFishReferenceId,
  unifiedPreviewCacheKey,
};
