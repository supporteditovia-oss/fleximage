/** Miroir Node de video-ultra-pricing.ts */
const VIDEO_ULTRA_CREDIT_GRID = {
  3: { "720p": 36, "1080p": 48, "4k": 120 },
  4: { "720p": 48, "1080p": 64, "4k": 160 },
  5: { "720p": 60, "1080p": 80, "4k": 200 },
  6: { "720p": 72, "1080p": 96, "4k": 240 },
  7: { "720p": 84, "1080p": 112, "4k": 280 },
  8: { "720p": 96, "1080p": 128, "4k": 320 },
};

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

function computeV2VStudioCreditCost(params) {
  const duration = normalizeVideoUltraDuration(
    params.sourceVideoDurationSec ?? 5,
  );
  let cost = computeVideoUltraCreditCost({
    durationSec: duration,
    resolution: params.resolution,
  });
  const voiceExtra = params.voiceExtraCredit ?? 5;
  if (params.preserveSourceAudio) cost += voiceExtra;
  return cost;
}

module.exports = {
  VIDEO_ULTRA_CREDIT_GRID,
  normalizeVideoUltraDuration,
  normalizeVideoUltraResolution,
  computeVideoUltraCreditCost,
  computeV2VStudioCreditCost,
};
