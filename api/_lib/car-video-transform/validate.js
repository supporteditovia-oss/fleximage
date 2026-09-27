const { isOwnedR2PublicUrl } = require("../r2");
const {
  CAR_VIDEO_MIN_DURATION_SEC,
  CAR_VIDEO_MAX_DURATION_SEC,
  CAR_VIDEO_ALLOWED_MIME,
  CAR_VIDEO_MAX_SIZE_BYTES,
  CAR_VIDEO_PLAN_TYPES,
  CAR_VIDEO_VEHICLES,
  CAR_VIDEO_INTERIOR_STYLES,
} = require("./constants");

function validateDurationSeconds(durationSec) {
  const dur = Number(durationSec);
  if (!Number.isFinite(dur)) {
    return {
      ok: false,
      message: "La vidéo doit durer entre 2 et 8 secondes.",
      code: "INVALID_DURATION",
    };
  }
  if (dur < CAR_VIDEO_MIN_DURATION_SEC || dur > CAR_VIDEO_MAX_DURATION_SEC) {
    return {
      ok: false,
      message: "La vidéo doit durer entre 2 et 8 secondes.",
      code: "INVALID_DURATION",
    };
  }
  return { ok: true, durationSec: dur };
}

function validateUploadMime(contentType) {
  let mime = String(contentType || "").trim().toLowerCase();
  if (mime === "application/octet-stream") mime = "video/mp4";
  if (!CAR_VIDEO_ALLOWED_MIME.has(mime)) {
    return {
      ok: false,
      message: "Format non accepté. Utilise MP4, MOV ou WebM.",
      code: "INVALID_FORMAT",
    };
  }
  return { ok: true, mime };
}

function validateFileSizeBytes(sizeBytes) {
  const size = Number(sizeBytes);
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, message: "Taille de fichier invalide.", code: "INVALID_SIZE" };
  }
  if (size > CAR_VIDEO_MAX_SIZE_BYTES) {
    return {
      ok: false,
      message: `Fichier trop lourd (max ${Math.round(CAR_VIDEO_MAX_SIZE_BYTES / (1024 * 1024))} Mo).`,
      code: "FILE_TOO_LARGE",
    };
  }
  return { ok: true };
}

function assertOwnedInputVideoUrl(videoUrl, userId) {
  const url = String(videoUrl || "").trim();
  if (!url.startsWith("http")) {
    throw Object.assign(new Error("URL vidéo invalide"), {
      status: 422,
      code: "INVALID_VIDEO_URL",
    });
  }
  if (!isOwnedR2PublicUrl(url)) {
    throw Object.assign(
      new Error("La vidéo doit provenir de notre espace de stockage sécurisé."),
      { status: 422, code: "VIDEO_NOT_AUTHORIZED" },
    );
  }
  if (userId && !url.includes(`/inputs/${userId}/`)) {
    throw Object.assign(new Error("Accès vidéo refusé."), {
      status: 403,
      code: "VIDEO_FORBIDDEN",
    });
  }
  return url;
}

function sanitizeGenerationBody(body) {
  const planType = String(body.planType || body.plan_type || "").trim();
  const selectedVehicle = String(
    body.selectedVehicle || body.selected_vehicle || "",
  ).trim();
  const selectedInteriorStyle =
    body.selectedInteriorStyle != null || body.selected_interior_style != null
      ? String(body.selectedInteriorStyle || body.selected_interior_style || "").trim()
      : null;

  if (!CAR_VIDEO_PLAN_TYPES.has(planType)) {
    throw Object.assign(new Error("Type de plan invalide."), {
      status: 422,
      code: "INVALID_PLAN",
    });
  }
  if (!CAR_VIDEO_VEHICLES.has(selectedVehicle)) {
    throw Object.assign(new Error("Véhicule virtuel invalide."), {
      status: 422,
      code: "INVALID_VEHICLE",
    });
  }
  if (planType === "interior") {
    if (!selectedInteriorStyle || !CAR_VIDEO_INTERIOR_STYLES.has(selectedInteriorStyle)) {
      throw Object.assign(new Error("Style intérieur requis."), {
        status: 422,
        code: "INVALID_INTERIOR",
      });
    }
  }

  return {
    planType,
    selectedVehicle,
    selectedInteriorStyle: planType === "interior" ? selectedInteriorStyle : null,
  };
}

module.exports = {
  validateDurationSeconds,
  validateUploadMime,
  validateFileSizeBytes,
  assertOwnedInputVideoUrl,
  sanitizeGenerationBody,
};
