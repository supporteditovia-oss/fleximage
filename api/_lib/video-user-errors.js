/** Messages client pour erreurs provider vidéo (sans noms de modèle). */

function mapVideoProviderMessage(raw, locale = "fr", options = {}) {
  const text = String(raw || "").trim();
  if (!text) return null;
  const afterAlephFallback = Boolean(options.afterAlephFallback);

  if (/no valid characters detected/i.test(text)) {
    if (afterAlephFallback) {
      return locale === "fr"
        ? "Transformation impossible sur ce clip (POV sans personnage visible). Essaie un autre angle ou un clip où le corps apparaît. Jetons remboursés."
        : "Transform failed on this clip (POV with no visible character). Try another angle or a clip showing the body. Credits refunded.";
    }
    return locale === "fr"
      ? "Ce clip POV (volant, mains seules) n’est pas compatible avec le mode mouvement personnage. Bascule automatique vers transformation en cours…"
      : "This POV clip is not compatible with character motion mode. Switching automatically to the transform engine…";
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

function resolveKlingCharacterOrientation(_prompt, hasReferenceImage) {
  return hasReferenceImage ? "image" : "video";
}

function resolveKlingBackgroundSource(prompt) {
  const p = String(prompt || "").toLowerCase();
  if (
    /int[ée]rieur|interior|habitacle|cockpit|dashboard|d[ée]cor|background|voiture|vehicle|swap|remplace/.test(
      p,
    )
  ) {
    return "input_video";
  }
  return "input_video";
}

module.exports = {
  mapVideoProviderMessage,
  resolveKlingCharacterOrientation,
  resolveKlingBackgroundSource,
};
