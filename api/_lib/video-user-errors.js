/** Messages client pour erreurs provider vidéo (sans noms de modèle). */

function mapVideoProviderMessage(raw, locale = "fr", options = {}) {
  const text = String(raw || "").trim();
  if (!text) return null;
  const afterAlephFallback = Boolean(options.afterAlephFallback);
  const v2vExhausted = Boolean(options.v2vExhausted);

  if (v2vExhausted && afterAlephFallback) {
    const motionJob =
      options.v2vIntent === "motion" ||
      options.v2vProvider === "kling_motion" ||
      options.v2vEngineFamily === "motion";
    if (motionJob) {
      return locale === "fr"
        ? "Le studio n’a pas pu animer ce clip après plusieurs tentatives. Réessaie avec un clip de 3 à 8 s (danse ou mouvement visible), une photo nette du visage/corps, filmé d’une traite (pas un export WhatsApp/Instagram). Jetons remboursés."
        : "The studio could not animate this clip after several attempts. Try a 3–8 s clip with clear body motion, a sharp face/body photo, shot in one take (not a WhatsApp/Instagram export). Credits refunded.";
    }
    const { isVehicleDrivingPrompt } = require("./video-studio");
    if (isVehicleDrivingPrompt(options.prompt)) {
      return locale === "fr"
        ? "Le studio n’a pas pu transformer ce clip après plusieurs tentatives. Réessaie avec un clip de 4 à 8 s filmé d’une traite (pas un export WhatsApp/Instagram), volant et tableau de bord bien visibles. Jetons remboursés."
        : "The studio could not transform this clip after several attempts. Try a 4–8 s clip shot in one take (not a WhatsApp/Instagram export) with the wheel and dashboard clearly visible. Credits refunded.";
    }
    return locale === "fr"
      ? "Le studio n’a pas pu transformer ce clip après plusieurs tentatives. Réessaie avec un clip de 4 à 8 s filmé d’une traite, sujet bien visible. Jetons remboursés."
      : "The studio could not transform this clip after several attempts. Try a 4–8 s clip shot in one take with the subject clearly visible. Credits refunded.";
  }

  if (/no valid characters detected/i.test(text)) {
    if (afterAlephFallback) {
      return locale === "fr"
        ? "Transformation impossible sur ce clip POV. Essaie un angle où plus de corps est visible, ou un clip légèrement plus long. Jetons remboursés."
        : "Transform failed on this POV clip. Try an angle with more visible body or a slightly longer clip. Credits refunded.";
    }
    return locale === "fr"
      ? "Le studio adapte automatiquement ton clip POV — la génération continue…"
      : "The studio is adapting your POV clip — generation continues…";
  }

  if (/internal error|please try again later/i.test(text)) {
    return locale === "fr"
      ? "Le moteur vidéo a eu un incident temporaire. Réessaie dans 1–2 minutes — jetons remboursés si la génération a échoué."
      : "The video engine had a temporary issue. Try again in 1–2 minutes — credits refunded if generation failed.";
  }

  if (/file type not supported/i.test(text)) {
    return locale === "fr"
      ? "Format vidéo incompatible. Réessaie avec un clip 3–8 s (720p). Jetons remboursés."
      : "Unsupported video format. Try a 3–8 s clip (720p). Credits refunded.";
  }

  return null;
}

/**
 * Kie Motion Control — « image » = corps / tenue / cheveux depuis la photo ;
 * « video » garde trop la silhouette vestimentaire de la clip (face-swap).
 */
function resolveKlingCharacterOrientation(_prompt, hasReferenceImage) {
  if (hasReferenceImage) return "image";
  return "video";
}

function resolveKlingBackgroundSource(options = {}) {
  if (options.motionCompositeApplied === true) return "input_image";
  return "input_video";
}

module.exports = {
  mapVideoProviderMessage,
  resolveKlingCharacterOrientation,
  resolveKlingBackgroundSource,
};
