const POYO_API_BASE = "https://api.poyo.ai";

function getPoyoApiKey() {
  const key = String(process.env.POYO_API_KEY || "").trim();
  if (!key) {
    throw Object.assign(new Error("Configuration PoYo manquante"), {
      status: 500,
      code: "POYO_CONFIG_MISSING",
    });
  }
  return key;
}

function poyoHeaders() {
  return {
    Authorization: `Bearer ${getPoyoApiKey()}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function parsePoyoJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw Object.assign(new Error("Réponse PoYo invalide"), {
      status: 502,
      code: "POYO_BAD_RESPONSE",
    });
  }
}

/**
 * @see https://docs.poyo.ai/api-manual/video-series/wan-2-7-video
 */
async function submitWanEditVideoTask(input) {
  const body = {
    model: "wan2.7-edit-video",
    input: {
      prompt: String(input.prompt || "").slice(0, 5000),
      video_url: input.videoUrl,
      resolution: "720p",
      duration: input.durationSec,
      aspect_ratio: input.aspectRatio || "16:9",
    },
  };
  if (input.referenceImageUrl) {
    body.input.reference_image_url = input.referenceImageUrl;
  }
  if (input.callbackUrl) {
    body.callback_url = input.callbackUrl;
  }

  const response = await fetch(`${POYO_API_BASE}/api/generate/submit`, {
    method: "POST",
    headers: poyoHeaders(),
    body: JSON.stringify(body),
  });

  const parsed = await parsePoyoJson(response);
  const taskId = parsed?.data?.task_id;
  if (!response.ok || parsed.code !== 200 || !taskId) {
    const msg =
      parsed?.message ||
      parsed?.msg ||
      parsed?.data?.error_message ||
      "Échec soumission PoYo";
    throw Object.assign(new Error(msg), {
      status: response.status >= 400 ? response.status : 502,
      code: "POYO_SUBMIT_FAILED",
    });
  }

  return {
    taskId,
    status: parsed.data.status || "not_started",
  };
}

/**
 * @see https://docs.poyo.ai/api-manual/task-management/status.md
 */
async function getPoyoTaskStatus(taskId) {
  const response = await fetch(
    `${POYO_API_BASE}/api/generate/status/${encodeURIComponent(taskId)}`,
    {
      method: "GET",
      headers: poyoHeaders(),
    },
  );
  const parsed = await parsePoyoJson(response);
  if (!response.ok || parsed.code !== 200) {
    throw Object.assign(new Error("Impossible de lire le statut PoYo"), {
      status: 502,
      code: "POYO_STATUS_FAILED",
    });
  }
  return parsed.data || {};
}

function extractPoyoVideoUrl(data) {
  const files = Array.isArray(data?.files) ? data.files : [];
  const videoFile =
    files.find((f) => f?.file_type === "video" && f?.file_url) ||
    files.find((f) => String(f?.file_url || "").includes(".mp4"));
  return videoFile?.file_url ? String(videoFile.file_url).trim() : null;
}

function mapPoyoStatusToInternal(poyoStatus) {
  const s = String(poyoStatus || "").toLowerCase();
  if (s === "finished") return "completed";
  if (s === "failed") return "failed";
  if (s === "running") return "processing";
  if (s === "not_started") return "queued";
  return "processing";
}

module.exports = {
  submitWanEditVideoTask,
  getPoyoTaskStatus,
  extractPoyoVideoUrl,
  mapPoyoStatusToInternal,
};
