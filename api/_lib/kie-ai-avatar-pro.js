const KIE_JOBS_BASE_URL = "https://api.kie.ai/api/v1/jobs";
const {
  extractKieJobsVideoUrl,
  extractKieJobsFailMessage,
} = require("./kie-jobs-result");

const AI_AVATAR_PRO_MODEL = "kling/ai-avatar-pro";

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
    throw new Error(`Kie Ai Avatar Pro ${context}: réponse non-JSON (${status})`);
  }
}

async function createAiAvatarProTask(input) {
  const imageUrl = String(input.imageUrl || "").trim();
  const audioUrl = String(input.audioUrl || "").trim();
  const prompt = String(input.prompt || "").trim().slice(0, 5000);

  if (!imageUrl.startsWith("http")) {
    throw Object.assign(new Error("Image requise pour la vidéo avatar."), {
      status: 422,
    });
  }
  if (!audioUrl.startsWith("http")) {
    throw Object.assign(new Error("Piste audio requise pour la vidéo avatar."), {
      status: 422,
    });
  }

  const body = {
    model: AI_AVATAR_PRO_MODEL,
    input: {
      image_url: imageUrl,
      audio_url: audioUrl,
      prompt:
        prompt ||
        "Natural cinematic motion, subtle expression, premium photorealistic look.",
    },
  };

  console.info("[kie-ai-avatar-pro] createTask", {
    model: AI_AVATAR_PRO_MODEL,
    imageHost: imageUrl.split("/").slice(-1)[0],
    audioHost: audioUrl.split("/").slice(-1)[0],
    promptChars: prompt.length,
  });

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
    console.error("[kie-ai-avatar-pro] createTask rejected", {
      httpStatus: response.status,
      apiCode: parsed?.code,
      apiMsg: parsed?.msg,
      bodyPreview: text.slice(0, 400),
    });
    const err = new Error(parsed.msg || "Ai Avatar Pro API error");
    err.status = response.status;
    err.apiCode = parsed.code;
    err.apiMsg = parsed.msg;
    throw err;
  }

  return { taskId, raw: parsed };
}

async function getAiAvatarProStatus(taskId) {
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
    const err = new Error(parsed.msg || "Ai Avatar Pro status error");
    err.status = response.status;
    throw err;
  }

  return parsed.data || {};
}

function mapAiAvatarProState(data) {
  const state = String(data.state || "waiting").toLowerCase();
  if (state === "success") return "success";
  if (state === "fail" || state === "failed") return "fail";
  return "waiting";
}

function extractAiAvatarProFailMessage(data) {
  return extractKieJobsFailMessage(data);
}

function extractAiAvatarProVideoUrl(data) {
  return extractKieJobsVideoUrl(data);
}

function isAiAvatarProConfigured() {
  return Boolean(process.env.KIE_AI_API_KEY && process.env.KIE_AI_API_KEY.trim());
}

module.exports = {
  AI_AVATAR_PRO_MODEL,
  createAiAvatarProTask,
  getAiAvatarProStatus,
  mapAiAvatarProState,
  extractAiAvatarProFailMessage,
  extractAiAvatarProVideoUrl,
  isAiAvatarProConfigured,
};
