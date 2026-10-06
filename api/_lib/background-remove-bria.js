const sharp = require("sharp");

const DEEPINFRA_IMAGES_URL =
  "https://api.deepinfra.com/v1/openai/images/generations";
const DEEPINFRA_IMAGES_EDITS_URL =
  "https://api.deepinfra.com/v1/openai/images/edits";

const { getDeepInfraApiKey } = require("./deepinfra");

const BRIA_MODEL = "Bria/remove_background";
const MAX_BGRM_EDGE = 1024;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableHttp(status) {
  return status === 429 || status === 500 || status === 502 || status === 503;
}

async function fetchHttpImageBuffer(url) {
  const res = await fetch(String(url).trim());
  if (!res.ok) {
    throw new Error(`Impossible de lire l'image (${res.status})`);
  }
  const mimeType = res.headers.get("content-type") || "image/jpeg";
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 256) {
    throw new Error("Image invalide (buffer trop petit)");
  }
  return { buffer, mimeType };
}

/** Réduit les gros fichiers iPhone — limite les 500 côté DeepInfra. */
async function normalizeInputForBria(buffer) {
  const meta = await sharp(buffer).metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  if (w <= MAX_BGRM_EDGE && h <= MAX_BGRM_EDGE && buffer.length < 4_000_000) {
    return { buffer, mimeType: "image/jpeg", fileName: "input.jpg" };
  }
  const jpeg = await sharp(buffer)
    .rotate()
    .resize({
      width: MAX_BGRM_EDGE,
      height: MAX_BGRM_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
  return { buffer: jpeg, mimeType: "image/jpeg", fileName: "input.jpg" };
}

function parseBriaResponse(text, status) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Bria remove_background: réponse non-JSON (${status})`);
  }
  const b64 =
    parsed?.data?.[0]?.b64_json ||
    parsed?.images?.[0]?.b64_json ||
    parsed?.output?.[0]?.b64_json;
  if (!b64 || typeof b64 !== "string") {
    const detail =
      parsed?.error?.message ||
      parsed?.message ||
      text.slice(0, 280) ||
      `HTTP ${status}`;
    const err = new Error(`Bria remove_background: ${detail}`);
    err.retryable = /internal server error|timeout|rate limit|503|502/i.test(
      detail,
    );
    throw err;
  }
  const buffer = Buffer.from(b64, "base64");
  if (buffer.length < 256) {
    throw new Error("Bria remove_background: image invalide");
  }
  return buffer;
}

async function postBriaForm(inputBuffer, inputMime, fileName, endpoint) {
  const apiKey = getDeepInfraApiKey();
  const form = new FormData();
  form.append("model", BRIA_MODEL);
  form.append("prompt", "remove background");
  form.append("n", "1");
  form.append("response_format", "b64_json");
  form.append(
    "image",
    new Blob([inputBuffer], { type: inputMime }),
    fileName || "input.jpg",
  );

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const text = await response.text();
  if (!response.ok) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      /* ignore */
    }
    const detail =
      parsed?.error?.message ||
      parsed?.message ||
      text.slice(0, 280) ||
      `HTTP ${response.status}`;
    const err = new Error(`Bria remove_background: ${detail}`);
    err.httpStatus = response.status;
    err.retryable = isRetryableHttp(response.status) || /internal server error/i.test(detail);
    throw err;
  }
  return parseBriaResponse(text, response.status);
}

async function removeBackgroundBriaOnce(source) {
  const apiKey = getDeepInfraApiKey();
  if (!apiKey) {
    throw Object.assign(new Error("DEEPINFRA_API_KEY manquant (détourage motion)"), {
      status: 503,
      code: "BGRM_UNAVAILABLE",
    });
  }

  let rawBuffer;
  if (Buffer.isBuffer(source)) {
    rawBuffer = source;
  } else if (typeof source === "string" && /^https?:\/\//i.test(source)) {
    rawBuffer = (await fetchHttpImageBuffer(source)).buffer;
  } else {
    throw new Error("removeBackgroundBria: source invalide");
  }

  const { buffer, mimeType, fileName } = await normalizeInputForBria(rawBuffer);

  try {
    return await postBriaForm(buffer, mimeType, fileName, DEEPINFRA_IMAGES_EDITS_URL);
  } catch (editsErr) {
    console.warn("[background-remove-bria] edits endpoint failed, try generations", {
      message: editsErr.message,
    });
    return postBriaForm(buffer, mimeType, fileName, DEEPINFRA_IMAGES_URL);
  }
}

/**
 * Détourage sujet — DeepInfra Bria RMBG 2.0 (PNG avec alpha).
 * @param {string|Buffer} source URL publique ou buffer JPEG/PNG
 */
async function removeBackgroundBria(source) {
  const maxAttempts = 4;
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await removeBackgroundBriaOnce(source);
    } catch (err) {
      lastErr = err;
      const retryable =
        err.retryable === true || isRetryableHttp(Number(err.httpStatus));
      if (!retryable || attempt >= maxAttempts) {
        throw err;
      }
      const delayMs = 800 * 2 ** (attempt - 1);
      console.warn("[background-remove-bria] retry", {
        attempt,
        delayMs,
        message: err.message,
      });
      await sleep(delayMs);
    }
  }
  throw lastErr || new Error("Bria remove_background failed");
}

/** Retourne null si Bria indisponible (fallback composite sans erreur bloquante). */
async function removeBackgroundBriaOptional(source, label = "image") {
  try {
    return await removeBackgroundBria(source);
  } catch (err) {
    console.warn("[background-remove-bria] optional fail", {
      label,
      message: err.message,
    });
    return null;
  }
}

module.exports = {
  removeBackgroundBria,
  removeBackgroundBriaOptional,
  normalizeInputForBria,
};
