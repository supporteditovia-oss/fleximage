/** PoYo wan2.7-edit-video — produit « Transforme ta voiture » */

const CAR_VIDEO_MODEL = "wan2.7-edit-video";
const CAR_VIDEO_RESOLUTION = "720p";
const CAR_VIDEO_MIN_DURATION_SEC = 2;
const CAR_VIDEO_MAX_DURATION_SEC = 8;
const CAR_VIDEO_MAX_SIZE_BYTES =
  Number(process.env.CAR_VIDEO_MAX_UPLOAD_BYTES) > 0
    ? Number(process.env.CAR_VIDEO_MAX_UPLOAD_BYTES)
    : 200 * 1024 * 1024;
const CAR_VIDEO_CREDITS_PER_SECOND = 12;
const CAR_VIDEO_POYO_POLL_MIN_MS = 4000;
const CAR_VIDEO_RETENTION_DAYS =
  Number(process.env.CAR_VIDEO_RETENTION_DAYS) > 0
    ? Number(process.env.CAR_VIDEO_RETENTION_DAYS)
    : 14;

const CAR_VIDEO_ALLOWED_MIME = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

const CAR_VIDEO_PLAN_TYPES = new Set(["exterior", "interior"]);

const CAR_VIDEO_VEHICLES = new Set([
  "luxury_black_suv",
  "premium_black_sedan",
  "red_sports",
  "premium_white_suv",
]);

const CAR_VIDEO_INTERIOR_STYLES = new Set([
  "black_leather",
  "beige_leather",
  "carbon_sport",
]);

function estimateCarVideoCredits(durationSec) {
  const sec = Math.min(
    CAR_VIDEO_MAX_DURATION_SEC,
    Math.max(CAR_VIDEO_MIN_DURATION_SEC, Math.ceil(Number(durationSec) || 0)),
  );
  return sec * CAR_VIDEO_CREDITS_PER_SECOND;
}

module.exports = {
  CAR_VIDEO_MODEL,
  CAR_VIDEO_RESOLUTION,
  CAR_VIDEO_MIN_DURATION_SEC,
  CAR_VIDEO_MAX_DURATION_SEC,
  CAR_VIDEO_MAX_SIZE_BYTES,
  CAR_VIDEO_CREDITS_PER_SECOND,
  CAR_VIDEO_POYO_POLL_MIN_MS,
  CAR_VIDEO_RETENTION_DAYS,
  CAR_VIDEO_ALLOWED_MIME,
  CAR_VIDEO_PLAN_TYPES,
  CAR_VIDEO_VEHICLES,
  CAR_VIDEO_INTERIOR_STYLES,
  estimateCarVideoCredits,
};
