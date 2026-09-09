const KIE_ALEPH_BASE_URL = "https://api.kie.ai/api/v1/aleph";

function getApiKey() {
  const key = process.env.KIE_AI_API_KEY;
  if (!key) {
    throw Object.assign(new Error("KIE_AI_API_KEY manquant"), { status: 503 });
  }
  return key;
}

function parseAlephResponse(text, status, context) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Kie Aleph ${context}: réponse non-JSON (${status})`);
  }
}

async function createAlephVideoTask(input) {
  const body = {
    prompt: String(input.prompt || "").slice(0, 1000),
    videoUrl: input.videoUrl,
    waterMark: "",
    aspectRatio: input.aspectRatio || "9:16",
  };
  if (input.referenceImage) {
    body.referenceImage = input.referenceImage;
  }

  const response = await fetch(`${KIE_ALEPH_BASE_URL}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  const parsed = parseAlephResponse(text, response.status, "createTask");
  const taskId = parsed?.data?.taskId;

  if (!response.ok || parsed.code !== 200 || !taskId) {
    const err = new Error(parsed.msg || "Aleph API error");
    err.status = response.status;
    err.apiCode = parsed.code;
    err.apiMsg = parsed.msg;
    throw err;
  }

  return { taskId, raw: parsed };
}

async function getAlephVideoStatus(taskId) {
  const response = await fetch(
    `${KIE_ALEPH_BASE_URL}/record-info?taskId=${encodeURIComponent(taskId)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${getApiKey()}` },
    },
  );

  const text = await response.text();
  const parsed = parseAlephResponse(text, response.status, "getStatus");

  if (!response.ok || parsed.code !== 200) {
    const err = new Error(parsed.msg || "Aleph status error");
    err.status = response.status;
    throw err;
  }

  return parsed.data || {};
}

function mapAlephState(data) {
  const successFlag = Number(data.successFlag);
  if (successFlag === 1) return "success";
  const errorCode = Number(data.errorCode);
  const errorMessage = String(data.errorMessage || "").trim();
  if (errorCode !== 0 || errorMessage) return "fail";
  return "waiting";
}

function extractAlephVideoUrl(data) {
  return data?.response?.resultVideoUrl ?? data?.resultVideoUrl ?? null;
}

module.exports = {
  createAlephVideoTask,
  getAlephVideoStatus,
  mapAlephState,
  extractAlephVideoUrl,
};
