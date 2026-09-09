/** Limites rentables — alignées API Kie (Kling max 30s, on plafonne à 15s). */

const VIDEO_V2V_MAX_DURATION_SEC = 15;
const VIDEO_V2V_MIN_DURATION_SEC = 3;
const VIDEO_V2V_MAX_SIZE_BYTES = 20 * 1024 * 1024;

const VIDEO_I2V_OUTPUT_DURATION_SEC = 5;

function validateSourceVideoDuration(durationSec, uiLocale = "fr") {
  const dur = Number(durationSec);
  if (!Number.isFinite(dur) || dur <= 0) {
    return {
      ok: false,
      code: "VIDEO_DURATION_REQUIRED",
      message:
        uiLocale === "fr"
          ? "Impossible de lire la durée de la vidéo. Réessaie avec un MP4 plus court."
          : "Could not read video duration. Try a shorter MP4.",
    };
  }
  if (dur < VIDEO_V2V_MIN_DURATION_SEC) {
    return {
      ok: false,
      code: "VIDEO_TOO_SHORT",
      message:
        uiLocale === "fr"
          ? `Vidéo trop courte (minimum ${VIDEO_V2V_MIN_DURATION_SEC}s).`
          : `Video too short (minimum ${VIDEO_V2V_MIN_DURATION_SEC}s).`,
    };
  }
  if (dur > VIDEO_V2V_MAX_DURATION_SEC) {
    return {
      ok: false,
      code: "VIDEO_TOO_LONG",
      message:
        uiLocale === "fr"
          ? `Vidéo trop longue (max ${VIDEO_V2V_MAX_DURATION_SEC}s pour rester rentable). Coupe ta vidéo avant de l'importer.`
          : `Video too long (max ${VIDEO_V2V_MAX_DURATION_SEC}s). Trim before upload.`,
    };
  }
  return { ok: true, durationSec: dur };
}

function computeV2VCreditCost(durationSec, isAdmin = false) {
  if (isAdmin) return 0;
  const dur = Number(durationSec) || VIDEO_V2V_MAX_DURATION_SEC;
  if (dur <= 8) return 25;
  if (dur <= 12) return 32;
  return 38;
}

module.exports = {
  VIDEO_V2V_MAX_DURATION_SEC,
  VIDEO_V2V_MIN_DURATION_SEC,
  VIDEO_V2V_MAX_SIZE_BYTES,
  VIDEO_I2V_OUTPUT_DURATION_SEC,
  validateSourceVideoDuration,
  computeV2VCreditCost,
};
