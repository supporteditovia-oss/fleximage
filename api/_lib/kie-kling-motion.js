const KIE_JOBS_BASE_URL = "https://api.kie.ai/api/v1/jobs";

const KLING_MOTION_MODEL = "kling-3.0/motion-control";

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
    throw new Error(`Kie Kling ${context}: réponse non-JSON (${status})`);
  }
}

/**
 * Kling 3.0 Motion Control — image de référence + vidéo de mouvement.
 * @see https://docs.kie.ai (kling-3.0/motion-control)
 */
async function createKlingMotionTask(input) {
  const body = {
    model: KLING_MOTION_MODEL,
    input: {
      prompt: String(
        input.prompt ||
          "No distortion, the character's movements are consistent with the video.",
      ).slice(0, 2500),
      input_urls: input.inputUrls,
      video_urls: input.videoUrls,
      character_orientation: input.characterOrientation || "video",
      mode: input.mode === "1080p" ? "1080p" : "720p",
    },
  };

  const response = await fetch(`${KIE_JOBS_BASE_URL}/createTask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  const parsed = parseJsonResponse(text, response.status, "createTask");
  const taskId = parsed?.data?.taskId;

  if (!response.ok || parsed.code !== 200 || !taskId) {
    const err = new Error(parsed.msg || "Kling Motion Control API error");
    err.status = response.status;
    err.apiCode = parsed.code;
    err.apiMsg = parsed.msg;
    throw err;
  }

  return { taskId, raw: parsed };
}

async function getKlingMotionStatus(taskId) {
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
    const err = new Error(parsed.msg || "Kling status error");
    err.status = response.status;
    throw err;
  }

  return parsed.data || {};
}

function mapKlingMotionState(data) {
  const state = String(data.state || "waiting").toLowerCase();
  if (state === "success") return "success";
  if (state === "fail" || state === "failed") return "fail";
  return "waiting";
}

function extractKlingMotionVideoUrl(data) {
  if (!data?.resultJson) return null;
  try {
    const result = JSON.parse(data.resultJson);
    const urls = result?.resultUrls;
    if (Array.isArray(urls) && urls[0]) return urls[0];
  } catch {
    /* ignore */
  }
  return null;
}

function buildKlingMotionPrompt(userPrompt) {
  const base = String(userPrompt || "").trim();
  const lock =
    " No distortion. Keep camera movement, background, ground and reflections consistent with the reference video. If dashboard visible, preserve exact speedometer readings from source.";
  if (!base) {
    return "No distortion, the character's movements are consistent with the video.";
  }
  const combined = `${base}.${lock}`;
  return combined.length <= 2500 ? combined : base.slice(0, 2500);
}

module.exports = {
  KLING_MOTION_MODEL,
  createKlingMotionTask,
  getKlingMotionStatus,
  mapKlingMotionState,
  extractKlingMotionVideoUrl,
  buildKlingMotionPrompt,
};
