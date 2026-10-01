/** Miroir Node de video-ultra-pricing.ts */
const VIDEO_ULTRA_CREDIT_GRID = {
  3: { "720p": 36, "1080p": 48, "4k": 120 },
  4: { "720p": 48, "1080p": 64, "4k": 160 },
  5: { "720p": 60, "1080p": 80, "4k": 200 },
  6: { "720p": 72, "1080p": 96, "4k": 240 },
  7: { "720p": 84, "1080p": 112, "4k": 280 },
  8: { "720p": 96, "1080p": 128, "4k": 320 },
};

const V2V_MOTION_8S_720P_CREDITS = 95;
const V2V_MOTION_1080P_FACTOR = 1.5;

function normalizeVideoUltraDuration(raw) {
  const n = Math.round(Number(raw));
  if (n >= 3 && n <= 8) return n;
  return 5;
}

function normalizeVideoUltraResolution(raw) {
  const s = String(raw || "").toLowerCase();
  if (s === "1080p") return "1080p";
  if (s === "4k") return "4k";
  return "720p";
}

function computeVideoUltraCreditCost(params) {
  const duration = normalizeVideoUltraDuration(params.durationSec);
  const resolution = normalizeVideoUltraResolution(params.resolution);
  return VIDEO_ULTRA_CREDIT_GRID[duration][resolution];
}

function v2vEngineFamilyFromProvider(provider) {
  return provider === "kling_motion" ? "motion" : "transform";
}

function computeV2VMotionCreditCost(params) {
  const duration = normalizeVideoUltraDuration(params.durationSec ?? 5);
  let resolution = normalizeVideoUltraResolution(params.resolution);
  if (resolution === "4k") resolution = "1080p";
  let credits = Math.round(V2V_MOTION_8S_720P_CREDITS * (duration / 8));
  credits = Math.max(36, credits);
  if (resolution === "1080p") {
    credits = Math.ceil(credits * V2V_MOTION_1080P_FACTOR);
  }
  return credits;
}

function computeV2VTransformCreditCost(params) {
  return computeVideoUltraCreditCost({
    durationSec: params.durationSec,
    resolution: params.resolution,
  });
}

function v2vResolutionsForEngineFamily(family) {
  return family === "motion" ? ["720p", "1080p"] : ["720p", "1080p", "4k"];
}

function computeV2VStudioCreditCost(params) {
  const duration = normalizeVideoUltraDuration(
    params.sourceVideoDurationSec ?? 5,
  );
  const family =
    params.engineFamily ??
    v2vEngineFamilyFromProvider(params.v2vProvider ?? null);
  let cost =
    family === "motion"
      ? computeV2VMotionCreditCost({
          durationSec: duration,
          resolution: params.resolution,
        })
      : computeV2VTransformCreditCost({
          durationSec: duration,
          resolution: params.resolution,
        });
  const voiceExtra = params.voiceExtraCredit ?? 5;
  if (params.preserveSourceAudio) cost += voiceExtra;
  return cost;
}

module.exports = {
  VIDEO_ULTRA_CREDIT_GRID,
  V2V_MOTION_8S_720P_CREDITS,
  normalizeVideoUltraDuration,
  normalizeVideoUltraResolution,
  computeVideoUltraCreditCost,
  computeV2VMotionCreditCost,
  computeV2VTransformCreditCost,
  computeV2VStudioCreditCost,
  v2vEngineFamilyFromProvider,
  v2vResolutionsForEngineFamily,
};
