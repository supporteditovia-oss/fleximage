const DEEPINFRA_IMAGES_URL =
  "https://api.deepinfra.com/v1/openai/images/generations";

const { getDeepInfraApiKey } = require("./deepinfra");

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
    throw new Error(`Bria remove_background: ${detail}`);
  }
  const buffer = Buffer.from(b64, "base64");
  if (buffer.length < 256) {
    throw new Error("Bria remove_background: image invalide");
  }
  return buffer;
}

/**
 * Détourage sujet — DeepInfra Bria RMBG 2.0 (PNG avec alpha).
 * @param {string|Buffer} source URL publique ou buffer JPEG/PNG
 */
async function removeBackgroundBria(source) {
  const apiKey = getDeepInfraApiKey();
  if (!apiKey) {
    throw Object.assign(new Error("DEEPINFRA_API_KEY manquant (détourage motion)"), {
      status: 503,
      code: "BGRM_UNAVAILABLE",
    });
  }

  let imageUrl = null;
  let inputBuffer = null;
  let inputMime = "image/jpeg";

  if (Buffer.isBuffer(source)) {
    inputBuffer = source;
  } else if (typeof source === "string" && /^https?:\/\//i.test(source)) {
    imageUrl = source.trim();
  } else {
    throw new Error("removeBackgroundBria: source invalide");
  }

  if (imageUrl) {
    const response = await fetch(DEEPINFRA_IMAGES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "Bria/remove_background",
        prompt: imageUrl,
        n: 1,
        response_format: "b64_json",
      }),
    });
    const text = await response.text();
    if (!response.ok) {
      const fromUrl = text;
      const { buffer, mimeType } = await fetchHttpImageBuffer(imageUrl);
      inputBuffer = buffer;
      inputMime = mimeType;
      console.warn("[background-remove-bria] URL prompt failed, retry form", {
        status: response.status,
        preview: fromUrl.slice(0, 120),
      });
    } else {
      return parseBriaResponse(text, response.status);
    }
  }

  const form = new FormData();
  form.append("model", "Bria/remove_background");
  form.append("prompt", "remove background");
  form.append("n", "1");
  form.append("response_format", "b64_json");
  form.append(
    "image",
    new Blob([inputBuffer], { type: inputMime }),
    "input.jpg",
  );

  const response = await fetch(DEEPINFRA_IMAGES_URL, {
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
    throw new Error(`Bria remove_background: ${detail}`);
  }
  return parseBriaResponse(text, response.status);
}

module.exports = { removeBackgroundBria };
