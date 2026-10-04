const KIE_JOBS_BASE_URL = "https://api.kie.ai/api/v1/jobs";

const SEEDANCE_MODEL_25 = "bytedance/seedance-2-5";
const SEEDANCE_MODEL_20 = "bytedance/seedance-2";

function getApiKey() {
  const key = process.env.KIE_AI_API_KEY;
  if (!key) {
    throw Object.assign(new Error("KIE_AI_API_KEY manquant"), { status: 503 });
  }
  return key;
}

function parseJsonResponse(text, status, context) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Kie Seedance ${context}: réponse non-JSON (${status})`);
  }
}

/**
 * 2.5 : 480p/720p/1080p. 2.0 requis pour 4k (enum doc Kie).
 */
function resolveSeedanceModelAndResolution(requestedResolution) {
  const res = String(requestedResolution || "720p").toLowerCase();
  if (res === "4k") {
    return { model: SEEDANCE_MODEL_20, resolution: "4k" };
  }
  if (res === "1080p") {
    return { model: SEEDANCE_MODEL_25, resolution: "1080p" };
  }
  if (res === "480p") {
    return { model: SEEDANCE_MODEL_25, resolution: "480p" };
  }
  return { model: SEEDANCE_MODEL_25, resolution: "720p" };
}

function clampSeedanceOutputDurationSec(durationSec) {
  const n = Math.round(Number(durationSec));
  if (!Number.isFinite(n) || n < 3) return 5;
  if (n > 8) return 8;
  return n;
}

function buildSeedanceTransformCreateTaskBody({
  prompt,
  videoUrl,
  resolution = "720p",
  durationSec,
  preserveSourceAudio = false,
}) {
  const video = String(videoUrl || "").trim();
  if (!video.startsWith("http")) {
    throw Object.assign(new Error("Vidéo source requise."), { status: 422 });
  }

  const { model, resolution: apiResolution } =
    resolveSeedanceModelAndResolution(resolution);
  const duration = clampSeedanceOutputDurationSec(durationSec);

  return {
    model,
    input: {
      prompt: String(prompt || "").trim().slice(0, 12000),
      reference_video_urls: [video],
      generate_audio: preserveSourceAudio === true,
      resolution: apiResolution,
      aspect_ratio: "adaptive",
      /** -1 = match input video length (doc 2.5 video-editing) */
      duration: -1,
    },
    _durationFallbackSec: duration,
  };
}

function stripInternalSeedanceBody(body) {
  const { _durationFallbackSec, ...rest } = body;
  return { payload: rest, durationFallbackSec: _durationFallbackSec };
}

async function createSeedanceTransformTask(input) {
  const built = buildSeedanceTransformCreateTaskBody(input);
  const { payload: initialPayload, durationFallbackSec } =
    stripInternalSeedanceBody(built);
  let body = initialPayload;
  let response = await fetch(`${KIE_JOBS_BASE_URL}/createTask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify(body),
  });

  let text = await response.text();
  let parsed = parseJsonResponse(text, response.status, "createTask");

  if (
    (!response.ok || parsed.code !== 200) &&
    body.input.duration === -1 &&
    Number.isFinite(durationFallbackSec)
  ) {
    body = {
      ...body,
      input: { ...body.input, duration: durationFallbackSec },
    };
    response = await fetch(`${KIE_JOBS_BASE_URL}/createTask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify(body),
    });
    text = await response.text();
    parsed = parseJsonResponse(text, response.status, "createTask-retry");
  }

  const taskId = parsed?.data?.taskId;
  if (!response.ok || parsed.code !== 200 || !taskId) {
    const err = new Error(parsed.msg || "Kie Seedance API error");
    err.status = response.status;
    err.apiCode = parsed.code;
    err.apiMsg = parsed.msg;
    throw err;
  }

  return { taskId, model: body.model, raw: parsed };
}

async function getSeedanceTransformStatus(taskId) {
  const response = await fetch(
    `${KIE_JOBS_BASE_URL}/recordInfo?taskId=${encodeURIComponent(taskId)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${getApiKey()}` },
    },
  );

  const text = await response.text();
  const parsed = parseJsonResponse(text, response.status, "recordInfo");

  if (!response.ok || parsed.code !== 200) {
    const err = new Error(parsed.msg || "Kie Seedance status error");
    err.status = response.status;
    throw err;
  }

  return parsed.data || {};
}

function mapSeedanceTransformState(data) {
  const state = String(data.state || "waiting").toLowerCase();
  if (state === "success") return "success";
  if (state === "fail" || state === "failed") return "fail";
  return "waiting";
}

function extractSeedanceTransformVideoUrl(data) {
  if (!data?.resultJson) return null;
  try {
    const result = JSON.parse(data.resultJson);
    const urls = result?.resultUrls;
    if (Array.isArray(urls) && urls[0]) return urls[0];
    if (typeof result?.video_url === "string") return result.video_url;
  } catch {
    /* ignore */
  }
  return null;
}

function extractSeedanceTransformFailMessage(data) {
  return String(data?.failMsg || data?.errorMessage || "").trim();
}

function isSeedanceTransformConfigured() {
  return Boolean(process.env.KIE_AI_API_KEY && process.env.KIE_AI_API_KEY.trim());
}

module.exports = {
  SEEDANCE_MODEL_25,
  SEEDANCE_MODEL_20,
  resolveSeedanceModelAndResolution,
  buildSeedanceTransformCreateTaskBody,
  createSeedanceTransformTask,
  getSeedanceTransformStatus,
  mapSeedanceTransformState,
  extractSeedanceTransformVideoUrl,
  extractSeedanceTransformFailMessage,
  isSeedanceTransformConfigured,
};
