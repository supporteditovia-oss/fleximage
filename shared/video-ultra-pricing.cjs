/** Miroir Node de video-ultra-pricing.ts */
const V2V_TRANSFORM_720P_FIXED_CREDITS = 85;

const VIDEO_ULTRA_CREDIT_GRID = {
  3: { "720p": V2V_TRANSFORM_720P_FIXED_CREDITS, "1080p": 90, "4k": 120 },
  4: { "720p": V2V_TRANSFORM_720P_FIXED_CREDITS, "1080p": 100, "4k": 160 },
  5: { "720p": V2V_TRANSFORM_720P_FIXED_CREDITS, "1080p": 110, "4k": 200 },
  6: { "720p": V2V_TRANSFORM_720P_FIXED_CREDITS, "1080p": 120, "4k": 240 },
  7: { "720p": V2V_TRANSFORM_720P_FIXED_CREDITS, "1080p": 130, "4k": 280 },
  8: { "720p": V2V_TRANSFORM_720P_FIXED_CREDITS, "1080p": 140, "4k": 320 },
};

const V2V_MOTION_CREDIT_GRID = {
  3: { "720p": 55, "1080p": 85 },
  4: { "720p": 55, "1080p": 85 },
  5: { "720p": 60, "1080p": 90 },
  6: { "720p": 70, "1080p": 110 },
  7: { "720p": 80, "1080p": 120 },
  8: { "720p": 90, "1080p": 135 },
};

const V2V_MOTION_8S_720P_CREDITS = 90;

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
  return V2V_MOTION_CREDIT_GRID[duration][resolution];
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
  V2V_TRANSFORM_720P_FIXED_CREDITS,
  V2V_MOTION_CREDIT_GRID,
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
