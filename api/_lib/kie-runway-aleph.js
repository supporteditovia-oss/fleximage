const KIE_JOBS_BASE_URL = "https://api.kie.ai/api/v1/jobs";
/** Nouvelle API KIE (2025+) — l’ancien POST /api/v1/aleph/generate renvoie des erreurs. */
const ALEPH_MODEL = "runway/gen4-aleph";

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

async function createAlephVideoTaskJobs(input) {
  const aspectRatio = input.aspectRatio || "9:16";
  const body = {
    model: ALEPH_MODEL,
    input: {
      prompt: String(input.prompt || "").slice(0, 2000),
      video_url: input.videoUrl,
      watermark: "",
      upload_cn: false,
      aspect_ratio: aspectRatio,
    },
  };
  if (input.referenceImage) {
    body.input.reference_image = input.referenceImage;
  }

  const response = await fetch(`${KIE_JOBS_BASE_URL}/createTask`, {
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

  return { taskId, raw: parsed, transport: "jobs" };
}

async function createAlephVideoTaskLegacy(input) {
  const aspectRatio = input.aspectRatio || "9:16";
  const payload = {
    prompt: String(input.prompt || "").slice(0, 2000),
    videoUrl: input.videoUrl,
    waterMark: "",
    uploadCn: false,
    aspectRatio,
  };
  if (input.referenceImage) {
    payload.referenceImage = input.referenceImage;
  }

  const response = await fetch("https://api.kie.ai/api/v1/aleph/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  const parsed = parseAlephResponse(text, response.status, "legacyGenerate");
  const taskId = parsed?.data?.taskId;

  if (!response.ok || parsed.code !== 200 || !taskId) {
    const err = new Error(parsed.msg || "Aleph API error");
    err.status = response.status;
    err.apiCode = parsed.code;
    err.apiMsg = parsed.msg;
    throw err;
  }

  return { taskId, raw: parsed, transport: "legacy" };
}

async function createAlephVideoTask(input) {
  try {
    return await createAlephVideoTaskJobs(input);
  } catch (jobsErr) {
    if (!/internal error|please try again/i.test(String(jobsErr.apiMsg || jobsErr.message))) {
      throw jobsErr;
    }
    return createAlephVideoTaskLegacy(input);
  }
}

async function getAlephVideoStatus(taskId) {
  const response = await fetch(
    `${KIE_JOBS_BASE_URL}/recordInfo?taskId=${encodeURIComponent(taskId)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${getApiKey()}` },
    },
  );

  const text = await response.text();
  const parsed = parseAlephResponse(text, response.status, "recordInfo");

  if (!response.ok || parsed.code !== 200) {
    const err = new Error(parsed.msg || "Aleph status error");
    err.status = response.status;
    throw err;
  }

  return parsed.data || {};
}

function mapAlephState(data) {
  const state = String(data.state || "").toLowerCase();
  if (state === "success") return "success";
  if (state === "fail" || state === "failed") return "fail";

  const successFlag = Number(data.successFlag);
  if (successFlag === 1) return "success";
  const errorCode = Number(data.errorCode);
  if (Number.isFinite(errorCode) && errorCode !== 0) return "fail";
  return "waiting";
}

function extractAlephFailMessage(data) {
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

function extractAlephVideoUrl(data) {
  if (data?.resultJson) {
    try {
      const result = JSON.parse(data.resultJson);
      if (Array.isArray(result.resultUrls) && result.resultUrls[0]) {
        return result.resultUrls[0];
      }
      if (typeof result.resultVideoUrl === "string" && result.resultVideoUrl) {
        return result.resultVideoUrl;
      }
      if (typeof result.video_url === "string" && result.video_url) {
        return result.video_url;
      }
    } catch {
      /* ignore */
    }
  }
  return (
    data?.response?.resultVideoUrl ??
    data?.resultVideoUrl ??
    data?.videoInfo?.videoUrl ??
    null
  );
}

module.exports = {
  ALEPH_MODEL,
  createAlephVideoTask,
  createAlephVideoTaskJobs,
  createAlephVideoTaskLegacy,
  getAlephVideoStatus,
  mapAlephState,
  extractAlephVideoUrl,
  extractAlephFailMessage,
};
