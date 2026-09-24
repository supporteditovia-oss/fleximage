const DEEPINFRA_IMAGES_URL =
  "https://api.deepinfra.com/v1/openai/images/generations";
/** Aligné Kie (nano-banana-2) — surcharge via DEEPINFRA_MODEL. */
const DEFAULT_MODEL = "google/nano-banana-2";

function getDeepInfraApiKey() {
  return (process.env.DEEPINFRA_API_KEY || "").trim();
}

function getDeepInfraModel() {
  return (process.env.DEEPINFRA_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
}

function isDeepInfraConfigured() {
  return Boolean(getDeepInfraApiKey());
}

function aspectRatioToSize(aspectRatio) {
  if (aspectRatio === "16:9") return "1344x768";
  if (aspectRatio === "1:1") return "1024x1024";
  return "768x1344";
}

/**
 * Génération synchrone DeepInfra (nano-banana).
 * @returns {Promise<{ buffer: Buffer, mimeType: string, revisedPrompt?: string }>}
 */
async function generateDeepInfraImage(params) {
  const apiKey = getDeepInfraApiKey();
  if (!apiKey) {
    throw new Error("DEEPINFRA_API_KEY environment variable is not set");
  }

  const prompt = String(params.prompt || "").trim();
  if (!prompt) {
    throw new Error("DeepInfra: prompt vide");
  }

  const model = getDeepInfraModel();
  const size = aspectRatioToSize(params.aspectRatio);

  const response = await fetch(DEEPINFRA_IMAGES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt,
      size,
      n: 1,
      response_format: "b64_json",
    }),
  });

  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`DeepInfra API: réponse non-JSON (${response.status})`);
  }

  if (!response.ok) {
    const detail =
      parsed?.error?.message ||
      parsed?.message ||
      text.slice(0, 280) ||
      `HTTP ${response.status}`;
    throw new Error(`DeepInfra API error: ${detail}`);
  }

  const b64 =
    parsed?.data?.[0]?.b64_json ||
    parsed?.images?.[0]?.b64_json ||
    parsed?.output?.[0]?.b64_json;

  if (!b64 || typeof b64 !== "string") {
    throw new Error("DeepInfra API: aucune image dans la réponse");
  }

  const buffer = Buffer.from(b64, "base64");
  if (buffer.length < 256) {
    throw new Error("DeepInfra API: image invalide (buffer trop petit)");
  }

  return {
    buffer,
    mimeType: "image/png",
    revisedPrompt: parsed?.data?.[0]?.revised_prompt,
  };
}

module.exports = {
  DEFAULT_DEEPINFRA_MODEL: DEFAULT_MODEL,
  getDeepInfraApiKey,
  getDeepInfraModel,
  isDeepInfraConfigured,
  aspectRatioToSize,
  generateDeepInfraImage,
};
