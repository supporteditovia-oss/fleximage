const KIE_JOBS_BASE_URL = "https://api.kie.ai/api/v1/jobs";
/** Vidéo → vidéo (Scène & luxe) : route Kie « transformation », pas reference-to-video (duration 422). */
const OMNI_REF2V_MODEL = "kling-3.0-omni/transformation";

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
    throw new Error(`Kie Omni Ref2V ${context}: réponse non-JSON (${status})`);
  }
}

function normalizeOmniTransformPrompt(userPrompt) {
  const p = String(userPrompt || "").trim();
  if (!p) {
    return "Premium cinematic video transformation. Preserve camera motion and timing.";
  }
  if (p.length <= 3072) return p;
  return p.slice(0, 3072);
}

/** @deprecated reference-to-video — conservé pour tests / legacy */
function buildOmniReferencePrompt(userPrompt) {
  const p = String(userPrompt || "").trim();
  if (!p) {
    return "Transform @Video1 with premium cinematic realism. Preserve identity, body motion and original audio from the reference.";
  }
  if (/@Video1\b/i.test(p)) return p.slice(0, 3072);
  return `Transform @Video1: ${p}`.slice(0, 3072);
}

async function createKlingOmniRef2VTask(input) {
  const videoUrl = String(input.videoUrl || "").trim();
  if (!videoUrl.startsWith("http")) {
    throw Object.assign(new Error("Vidéo source requise."), { status: 422 });
  }

  const resolution = input.resolution === "1080p" || input.resolution === "4k"
    ? input.resolution
    : "720p";

  /** Kie rejette `duration` (422) dès qu’une vidéo de référence est fournie : la durée suit le clip. */
  const body = {
    model: OMNI_REF2V_MODEL,
    input: {
      prompt: normalizeOmniTransformPrompt(input.prompt),
      video_urls: [videoUrl],
      resolution,
      aspect_ratio: "auto",
      audio: false,
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
    const err = new Error(parsed.msg || "Kling Omni Ref2V API error");
    err.status = response.status;
    err.apiCode = parsed.code;
    err.apiMsg = parsed.msg;
    throw err;
  }

  return { taskId, raw: parsed };
}

async function getKlingOmniRef2VStatus(taskId) {
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
    const err = new Error(parsed.msg || "Kling Omni status error");
    err.status = response.status;
    throw err;
  }

  return parsed.data || {};
}

function mapKlingOmniRef2VState(data) {
  const state = String(data.state || "waiting").toLowerCase();
  if (state === "success") return "success";
  if (state === "fail" || state === "failed") return "fail";
  return "waiting";
}

function extractKlingOmniRef2VVideoUrl(data) {
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

function extractKlingOmniRef2VFailMessage(data) {
  return String(data?.failMsg || data?.errorMessage || "").trim();
}

function isKlingOmniRef2VConfigured() {
  return Boolean(process.env.KIE_AI_API_KEY && process.env.KIE_AI_API_KEY.trim());
}

module.exports = {
  OMNI_REF2V_MODEL,
  createKlingOmniRef2VTask,
  getKlingOmniRef2VStatus,
  mapKlingOmniRef2VState,
  extractKlingOmniRef2VVideoUrl,
  extractKlingOmniRef2VFailMessage,
  buildOmniReferencePrompt,
  normalizeOmniTransformPrompt,
  isKlingOmniRef2VConfigured,
};
