/** Limites rentables — Kling Motion Control (720p), plafond 8s. */

const VIDEO_V2V_MAX_DURATION_SEC = 8;
const VIDEO_V2V_MIN_DURATION_SEC = 3;
const VIDEO_V2V_MAX_SIZE_BYTES = 20 * 1024 * 1024;

/** Prix fixe client : 1 vidéo = N crédits (3–8s, 720p). */
const VIDEO_FLAT_CREDIT_COST = 50;

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
          ? `Vidéo trop longue (max ${VIDEO_V2V_MAX_DURATION_SEC}s). Coupe ta vidéo avant de l'importer.`
          : `Video too long (max ${VIDEO_V2V_MAX_DURATION_SEC}s). Trim before upload.`,
    };
  }
  return { ok: true, durationSec: dur };
}

function computeV2VCreditCost(_durationSec, isAdmin = false) {
  if (isAdmin) return 0;
  return VIDEO_FLAT_CREDIT_COST;
}

module.exports = {
  VIDEO_V2V_MAX_DURATION_SEC,
  VIDEO_V2V_MIN_DURATION_SEC,
  VIDEO_V2V_MAX_SIZE_BYTES,
  VIDEO_I2V_OUTPUT_DURATION_SEC,
  VIDEO_FLAT_CREDIT_COST,
  validateSourceVideoDuration,
  computeV2VCreditCost,
};
