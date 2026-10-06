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
  const backgroundSource =
    input.backgroundSource === "input_image" ? "input_image" : "input_video";
  const characterOrientation =
    input.characterOrientation === "image" ? "image" : "video";

  const body = {
    model: KLING_MOTION_MODEL,
    input: {
      prompt: String(
        input.prompt ||
          "No distortion, the character's movements are consistent with the video.",
      ).slice(0, 2500),
      input_urls: input.inputUrls,
      video_urls: input.videoUrls,
      character_orientation: characterOrientation,
      background_source: backgroundSource,
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

function extractKlingFailMessage(data) {
  const direct = String(data?.failMsg || data?.errorMessage || "").trim();
  if (direct) return direct;
  if (data?.resultJson) {
    try {
      const parsed = JSON.parse(data.resultJson);
      const fromJson = String(parsed?.failMsg || parsed?.errorMessage || "").trim();
      if (fromJson) return fromJson;
    } catch {
      /* ignore */
    }
  }
  return "";
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

function normalizeMotionUserPromptForKling(userPrompt) {
  const s = String(userPrompt || "").trim();
  if (!s) {
    return "Replace the dancer in the reference video with the person from the reference image.";
  }
  if (
    /remplace.*(?:personne|danseur|danseuse).*?(?:photo|image)|par celle de ma photo|par ma photo|body swap|même mouvement/i.test(
      s,
    )
  ) {
    return (
      "In the reference VIDEO clip, replace the moving person with the person from the reference IMAGE. " +
      "Keep the video room, background, lighting and camera exactly. " +
      "The IMAGE is identity only — never animate on the photo or use the photo as the scene."
    );
  }
  return s;
}

function buildKlingMotionPrompt(userPrompt) {
  const locks =
    "CRITICAL FULL-BODY MOTION CONTROL (must follow): " +
    "Replace the ENTIRE performer in the video — full body, clothes, hair, skin, morphology from reference IMAGE. " +
    "Video clip = skeleton / choreography / camera / room ONLY — never copy the original dancer outfit, ponytail, or body. " +
    "FORBIDDEN: face-swap; head on original body; keeping source dancer t-shirt, dress, or hairstyle. " +
    "FORBIDDEN: dancing on the static photo backdrop; I2V-style animation of the photo file alone. " +
    "When input IMAGE is a composite of the person already standing in the video room, preserve that room and the full-body subject.";
  const userLine = normalizeMotionUserPromptForKling(userPrompt);
  const combined = `${locks} User intent: ${userLine}`;
  return combined.slice(0, 2500);
}

module.exports = {
  KLING_MOTION_MODEL,
  createKlingMotionTask,
  getKlingMotionStatus,
  mapKlingMotionState,
  extractKlingMotionVideoUrl,
  extractKlingFailMessage,
  buildKlingMotionPrompt,
};
