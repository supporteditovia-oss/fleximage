/** Messages client pour erreurs provider vidéo (sans noms de modèle). */

function mapVideoProviderMessage(raw, locale = "fr") {
  const text = String(raw || "").trim();
  if (!text) return null;

  if (/no valid characters detected/i.test(text)) {
    return locale === "fr"
      ? "Le moteur vidéo doit voir une personne ou des mains visibles (ex. toi au volant). Filme un plan où ton corps ou tes mains apparaissent, puis réessaie. Jetons remboursés."
      : "The video engine needs a visible person or hands (e.g. you at the wheel). Refilm with yourself in frame and try again. Credits refunded.";
  }

  if (/file type not supported/i.test(text)) {
    return locale === "fr"
      ? "Format vidéo incompatible. Réessaie avec un clip 3–8 s (720p). Jetons remboursés."
      : "Unsupported video format. Try a 3–8 s clip (720p). Credits refunded.";
  }

  return null;
}

function resolveKlingCharacterOrientation(prompt, hasReferenceImage) {
  if (!hasReferenceImage) return "video";
  const p = String(prompt || "").toLowerCase();
  const vehicleOrSwap =
    /voiture|véhicule|vehicle|volant|steering|condu|driving|urus|porsche|lamborghini|g-class|swap|remplace|car/i.test(
      p,
    );
  return vehicleOrSwap ? "image" : "video";
}

module.exports = { mapVideoProviderMessage, resolveKlingCharacterOrientation };
