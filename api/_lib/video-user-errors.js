/** Messages client pour erreurs provider vidéo (sans noms de modèle). */

function mapVideoProviderMessage(raw, locale = "fr") {
  const text = String(raw || "").trim();
  if (!text) return null;

  if (/no valid characters detected/i.test(text)) {
    return locale === "fr"
      ? "Ce clip POV (volant, mains seules) n’est pas compatible avec le mode mouvement personnage. Réessaie : ton prompt sera appliqué via le moteur transformation (comme Image IA). Jetons remboursés."
      : "This POV clip is not compatible with character motion mode. Retry — your prompt will run via the transform engine (like Image IA). Credits refunded.";
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
