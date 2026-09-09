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
  getRunwayVideoStatus,
  isRunwayConfigured,
};
