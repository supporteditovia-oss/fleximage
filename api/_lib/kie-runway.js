const KIE_RUNWAY_BASE_URL = "https://api.kie.ai/api/v1/runway";

function getApiKey() {
  const key = process.env.KIE_AI_API_KEY;
  if (!key) {
    throw Object.assign(new Error("KIE_AI_API_KEY manquant"), { status: 503 });
  }
  return key;
}

function parseRunwayResponse(text, status, context) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Kie Runway ${context}: réponse non-JSON (${status})`);
  }
}

async function createRunwayVideoTask(input) {
  const body = {
    prompt: String(input.prompt || "").slice(0, 2000),
    duration: input.durationSec === 10 ? 10 : 5,
    quality: input.quality === "high" ? "1080p" : "720p",
    aspectRatio: input.aspectRatio || "9:16",
    waterMark: "",
  };
  if (input.image) {
    body.imageUrl = input.image;
  }

  const response = await fetch(`${KIE_RUNWAY_BASE_URL}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  const parsed = parseRunwayResponse(text, response.status, "createTask");
  const taskId = parsed?.data?.task_id ?? parsed?.data?.taskId;

  if (!response.ok || parsed.code !== 200 || !taskId) {
    const err = new Error(parsed.msg || "Runway API error");
    err.status = response.status;
    err.apiCode = parsed.code;
    err.apiMsg = parsed.msg;
    throw err;
  }

  return { taskId, raw: parsed };
}

function normalizeRunwayExtendQuality(quality) {
  const q = String(quality || "").toLowerCase();
  if (q === "high" || q === "1080p") return "1080p";
  return "720p";
}

/**
 * Task ID Runway Kie (sans préfixe video_) pour /runway/extend.
 */
function extractRunwayTaskIdFromGeneration(row) {
  if (!row || typeof row !== "object") return null;
  const meta = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  if (meta.runway_task_id) {
    return String(meta.runway_task_id).trim() || null;
  }
  const providerTaskId = String(row.provider_task_id || "").trim();
  if (providerTaskId.startsWith("video_")) {
    return providerTaskId.slice("video_".length) || null;
  }
  return null;
}

/**
 * Extend AI Video — POST https://api.kie.ai/api/v1/runway/extend
 * @see https://kieai.mintlify.app/runway-api/extend-ai-video
 */
async function createRunwayExtendVideoTask(input) {
  const taskId = String(input.taskId || "").trim();
  const prompt = String(input.prompt || "").trim().slice(0, 2000);
  if (!taskId) {
    throw Object.assign(new Error("taskId Runway requis pour extension"), {
      status: 400,
    });
  }
  if (prompt.length < 10) {
    throw Object.assign(new Error("Prompt extension trop court (min 10 car.)"), {
      status: 400,
    });
  }

  const body = {
    taskId,
    prompt,
    quality: normalizeRunwayExtendQuality(input.quality),
    waterMark: "",
  };
  if (input.callBackUrl) {
    body.callBackUrl = String(input.callBackUrl);
  }

  const response = await fetch(`${KIE_RUNWAY_BASE_URL}/extend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  const parsed = parseRunwayResponse(text, response.status, "extend");
  const newTaskId = parsed?.data?.taskId ?? parsed?.data?.task_id;

  if (!response.ok || parsed.code !== 200 || !newTaskId) {
    const err = new Error(parsed.msg || "Runway extend API error");
    err.status = response.status;
    err.apiCode = parsed.code;
    err.apiMsg = parsed.msg;
    throw err;
  }

  return { taskId: newTaskId, parentTaskId: taskId, raw: parsed };
}

async function getRunwayVideoStatus(taskId) {
  const response = await fetch(
    `${KIE_RUNWAY_BASE_URL}/record-detail?taskId=${encodeURIComponent(taskId)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${getApiKey()}` },
    },
  );

  const text = await response.text();
  const parsed = parseRunwayResponse(text, response.status, "getStatus");

  if (!response.ok || parsed.code !== 200) {
    const err = new Error(parsed.msg || "Runway status error");
    err.status = response.status;
    throw err;
  }

  return parsed.data || {};
}

function isRunwayConfigured() {
  return Boolean(process.env.KIE_AI_API_KEY);
}

module.exports = {
  createRunwayVideoTask,
  createRunwayExtendVideoTask,
  getRunwayVideoStatus,
  isRunwayConfigured,
  normalizeRunwayExtendQuality,
  extractRunwayTaskIdFromGeneration,
};
