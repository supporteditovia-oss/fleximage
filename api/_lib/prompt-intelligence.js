/**
 * LuxeFlexIA — Prompt Intelligence (Gemini 2.5 Flash uniquement).
 * Enrichit le prompt utilisateur avant Nano Banana (prompt-guard + génération).
 * Ne jamais utiliser Gemini Pro ni un autre modèle ici.
 */

const TIMEOUT_MS = 18_000;
const DEFAULT_MODEL = "gemini-2.5-flash";
const MAX_OUTPUT_CHARS = 2000;

const SYSTEM_INSTRUCTION = `You are LuxeFlexIA Prompt Intelligence (Prompt Shield + optimizer).

Task: rewrite the user's image-generation request into ONE final English prompt for a photorealistic lifestyle AI image model.

Rules:
- Preserve EXACT user intent: brands, car models, colors, objects, locations, people count.
- Do NOT invent unrelated subjects or swap requested vehicles/objects.
- Add cinematic composition, premium lighting, photorealism, natural depth of field, 35mm lens feel, ultra-realistic textures, vertical 9:16 when lifestyle/social is implied.
- No text overlays, no watermarks, no logos unless user explicitly asked.
- Output ONLY the optimized prompt plain text (no JSON, no markdown, no quotes wrapper).
- Keep under 1200 characters when possible.`;

function getGeminiApiKey() {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    ""
  ).trim();
}

/** @returns {string} */
function resolvePromptModel() {
  const raw = (process.env.GEMINI_PROMPT_MODEL || DEFAULT_MODEL).trim();
  const lower = raw.toLowerCase();
  if (!lower.startsWith("gemini-2.5-flash")) {
    throw new Error(
      "GEMINI_PROMPT_MODEL must be gemini-2.5-flash (Gemini 2.5 Flash only)",
    );
  }
  if (/pro|ultra|exp/i.test(lower) && !lower.includes("flash")) {
    throw new Error("Gemini Pro / Ultra models are forbidden for prompt intelligence");
  }
  return raw;
}

/**
 * @param {string} input
 * @param {{ locale?: string }} [options]
 * @returns {Promise<string>}
 */
async function enrichPromptForGeneration(input, options = {}) {
  const trimmed = String(input || "").trim();
  if (!trimmed) return trimmed;

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return trimmed;
  }

  let model;
  try {
    model = resolvePromptModel();
  } catch (err) {
    console.warn("[prompt-intelligence] model config:", err.message);
    return trimmed;
  }

  const localeHint =
    options.locale === "es"
      ? "User may write in Spanish; keep entities, output English prompt."
      : options.locale === "en"
        ? "User writes in English."
        : "User may write in French; keep entities, output English prompt.";

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent` +
    `?key=${encodeURIComponent(apiKey)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${localeHint}\n\nUser request:\n${trimmed}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 1024,
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(
        "[prompt-intelligence] gemini_http",
        res.status,
        errText.slice(0, 160),
      );
      return trimmed;
    }

    const data = await res.json();
    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text)
        .filter(Boolean)
        .join("\n")
        .trim() || "";

    if (!text) return trimmed;

    const cleaned = text
      .replace(/^["'`]+|["'`]+$/g, "")
      .trim()
      .slice(0, MAX_OUTPUT_CHARS);

    return cleaned.length >= 8 ? cleaned : trimmed;
  } catch (err) {
    console.warn("[prompt-intelligence] failed, using raw prompt:", err?.message);
    return trimmed;
  }
}

module.exports = {
  DEFAULT_GEMINI_PROMPT_MODEL: DEFAULT_MODEL,
  enrichPromptForGeneration,
  getGeminiApiKey,
  resolvePromptModel,
};
