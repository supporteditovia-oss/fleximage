const OUTPUT_ASPECT_RATIO = "9:16";
const LANDSCAPE_ASPECT_RATIO = "16:9";

function normalizeGenerationAspectRatio(value) {
  return value === LANDSCAPE_ASPECT_RATIO
    ? LANDSCAPE_ASPECT_RATIO
    : OUTPUT_ASPECT_RATIO;
}

/** Renfort prompt — le provider doit respecter le bouton 9:16 / 16:9. */
function buildAspectRatioPromptSuffix(aspectRatio) {
  const normalized = normalizeGenerationAspectRatio(aspectRatio);
  if (normalized === LANDSCAPE_ASPECT_RATIO) {
    return (
      "\n\n[FORMAT DE SORTIE OBLIGATOIRE : image PAYSAGE 16:9 horizontale, cadre large. " +
      "Interdit : portrait vertical, 9:16, format téléphone grand écran.]"
    );
  }
  return (
    "\n\n[FORMAT DE SORTIE OBLIGATOIRE : image PORTRAIT 9:16 verticale, plein écran téléphone (grand écran). " +
    "Interdit : paysage horizontal, 16:9, format wide.]"
  );
}

module.exports = {
  OUTPUT_ASPECT_RATIO,
  LANDSCAPE_ASPECT_RATIO,
  buildAspectRatioPromptSuffix,
  normalizeGenerationAspectRatio,
};
