/** Messages client pour erreurs provider vidéo (sans noms de modèle). */

function mapVideoProviderMessage(raw, locale = "fr", options = {}) {
  const text = String(raw || "").trim();
  if (!text) return null;
  const afterAlephFallback = Boolean(options.afterAlephFallback);
  const v2vExhausted = Boolean(options.v2vExhausted);

  if (v2vExhausted && afterAlephFallback) {
    return locale === "fr"
      ? "Le studio n’a pas pu transformer ce clip après plusieurs tentatives (POV habitacle). Réessaie en MP4 720p, 5 s, mains + volant bien visibles. Jetons remboursés."
      : "The studio could not transform this clip after several attempts. Try MP4 720p, 5 s, with hands and wheel clearly visible. Credits refunded.";
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
