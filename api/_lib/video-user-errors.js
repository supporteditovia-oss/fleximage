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

  const motionJob =
    options.v2vIntent === "motion" ||
    options.v2vProvider === "kling_motion" ||
    options.v2vEngineFamily === "motion";
  if (motionJob && !options.v2vExhausted) {
    return locale === "fr"
      ? "L’animation n’a pas abouti cette fois (incident côté moteur). Relance la même génération — le studio réessaie automatiquement. Jetons remboursés si l’échec est confirmé."
      : "Animation did not complete (engine issue). Launch again — the studio retries automatically. Credits refunded if it still fails.";
  }

  if (/file type not supported/i.test(text)) {
    return locale === "fr"
      ? "Format vidéo incompatible. Réessaie avec un clip 3–8 s (720p). Jetons remboursés."
      : "Unsupported video format. Try a 3–8 s clip (720p). Credits refunded.";
  }

  return null;
}

/**
 * Kie Motion Control — photo uploadée : « video » (A/B prod — génère + ancrage mouvement).
 * « image » réservé aux overrides / tests.
 */
function resolveKlingCharacterOrientation(
  _prompt,
  hasReferenceImage,
  override = null,
) {
  if (override === "video" || override === "image") return override;
  if (hasReferenceImage) return "video";
  return "video";
}

/**
 * Kling 3.0 Motion : `input_image` quand l'image composite = frame vidéo nette + personnage.
 * `input_video` seulement sans composite (frame auto).
 */
function resolveKlingBackgroundSource(options = {}) {
  if (options.motionCleanCompositeApplied === true) return "input_image";
  return "input_video";
}

function inferMotionReferenceSource(referenceImageUrl, clientMotionRef) {
  if (clientMotionRef === "uploaded" || clientMotionRef === "auto_frame") {
    return clientMotionRef;
  }
  const url = String(referenceImageUrl || "").trim();
  if (!url) return "auto_frame";
  if (/-motion-ref\.jpg/i.test(url)) return "auto_frame";
  return "uploaded";
}

/** Message utilisateur quand le composite Mouvement échoue (photo uploadée). */
function mapMotionCompositeUserMessage(compositeErr, locale = "fr") {
  const code =
    compositeErr?.code ||
    compositeErr?.cause?.code ||
    compositeErr?.cause?.cause?.code;
  if (
    code === "VIDEO_FRAME_EXTRACT_FAILED" ||
    code === "FFMPEG_UNAVAILABLE" ||
    code === "VIDEO_SOURCE_FETCH_FAILED"
  ) {
    return locale === "fr"
      ? "Impossible de lire ta vidéo pour préparer le remplacement. Réessaie avec un clip de 3 à 8 s en 720p, filmé d'une traite (évite les exports WhatsApp / Instagram)."
      : "Could not read your video to prepare the replacement. Try a 3–8 s 720p clip shot in one take (avoid WhatsApp/Instagram exports).";
  }
  if (code === "BGRM_UNAVAILABLE" || code === "DEEPINFRA") {
    return locale === "fr"
      ? "Le détourage est indisponible pour l'instant. Réessaie dans 1–2 minutes."
      : "Background removal is temporarily unavailable. Try again in 1–2 minutes.";
  }
  if (code === "MOTION_COMPOSITE_SCALE") {
    return locale === "fr"
      ? "Ta photo ne permet pas un remplacement corps entier. Utilise une photo debout, pieds à tête, bien nette."
      : "Your photo cannot fill a full-body replacement. Use a sharp full-body standing photo.";
  }
  return locale === "fr"
    ? "Impossible de préparer le corps entier sur la scène — réessaie avec une photo nette (corps visible, pieds à tête)."
    : "Could not prepare a full-body replacement on the scene — retry with a sharp full-body photo.";
}

module.exports = {
  mapVideoProviderMessage,
  mapMotionCompositeUserMessage,
  inferMotionReferenceSource,
  resolveKlingCharacterOrientation,
  resolveKlingBackgroundSource,
};
