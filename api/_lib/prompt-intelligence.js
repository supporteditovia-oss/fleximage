/**
 * LuxeFlexIA — Prompt Intelligence (Gemini 2.5 Flash uniquement).
 * Enrichit le prompt utilisateur avant Nano Banana (prompt-guard + génération).
 * Ne jamais utiliser Gemini Pro ni un autre modèle ici.
 */

const TIMEOUT_MS = 18_000;
const DEFAULT_MODEL = "gemini-2.5-flash";
const MAX_OUTPUT_CHARS = 2000;

const SYSTEM_INSTRUCTION_IMAGE = `You are LuxeFlexIA Prompt Intelligence (Prompt Shield + optimizer).

Task: rewrite the user's image-generation request into ONE final English prompt for a photorealistic lifestyle AI image model.

Rules:
- Preserve EXACT user intent: brands, car models, colors, objects, locations, people count.
- Do NOT invent unrelated subjects or swap requested vehicles/objects.
- Add cinematic composition, premium lighting, photorealism, natural depth of field, 35mm lens feel, ultra-realistic textures, vertical 9:16 when lifestyle/social is implied.
- No text overlays, no watermarks, no logos unless user explicitly asked.
- Output ONLY the optimized prompt plain text (no JSON, no markdown, no quotes wrapper).
- Keep under 1200 characters when possible.`;

const SYSTEM_INSTRUCTION_VIDEO_I2V = `You are LuxeFlexIA Video Prompt Intelligence for Image-to-Video (Kling I2V).

Task: rewrite the user's motion/scene request into ONE final English prompt for animating a reference photo into a short photorealistic video clip.

Rules:
- Preserve EXACT intent: subject identity, outfit, location, action, camera feel.
- Describe VISUAL motion only: body movement, expressions, environment, camera (slow pan, dolly, etc.).
- Do NOT request speech, dialogue, screams, music or sound unless the user explicitly paid for voice (ignore any voice request if voice addon is off).
- One continuous take, realistic physics, no slideshow, no morphing identity.
- Premium cinematic or UGC realism as implied by the user.
- Output ONLY plain English prompt text (no JSON, no markdown).
- Keep under 900 characters.`;

const SYSTEM_INSTRUCTION_VIDEO_V2V = `You are LuxeFlexIA Video Prompt Intelligence for Video-to-Video (Runway Aleph / Kling Motion Control).

Task: rewrite the user's transformation request into ONE final English prompt for editing their source smartphone video.

Rules:
- Preserve EXACT swap intent: what must change (vehicle, outfit, location, person) vs what must stay locked (camera path, timing, background unless user asked to change it).
- For vehicles: name REAL existing brand and model only (e.g. Lamborghini Urus Mansory, Ferrari Purosangue). Never invent fictional cars. Include exterior AND interior/key swap when driving scenes are implied.
- Match source video logic: speedometer/tachometer digits follow the source clip unless user gave an explicit km/h; screens on/off consistent with doors and driving state; same hand motion and timing.
- Do NOT request voice, dialogue, music or lip sync — output video is silent unless source audio is preserved separately.
- Photorealistic, same framing and motion as source; only transform what the user asked.
- Output ONLY plain English prompt text (no JSON, no markdown).
- Keep under 480 characters (downstream locks will append).`;

/** @param {'image'|'video_i2v'|'video_v2v'} mode */
function resolveSystemInstruction(mode, options = {}) {
  if (mode === "video_i2v") {
    const voiceNote = options.voiceEnabled
      ? " Voice addon ON: user may request spoken line — keep lip-sync wording minimal and exact if present."
      : " Voice addon OFF: strip any speech/audio requests.";
    return SYSTEM_INSTRUCTION_VIDEO_I2V + voiceNote;
  }
  if (mode === "video_v2v") return SYSTEM_INSTRUCTION_VIDEO_V2V;
  return SYSTEM_INSTRUCTION_IMAGE;
}

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

  const mode =
    options.mode === "video_i2v" || options.mode === "video_v2v"
      ? options.mode
      : "image";
  const maxOut =
    mode === "video_v2v" ? 520 : mode === "video_i2v" ? 950 : MAX_OUTPUT_CHARS;

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

  const workflowHint =
    mode === "video_v2v"
      ? "Workflow: video-to-video edit of an uploaded clip."
      : mode === "video_i2v"
        ? "Workflow: animate a still photo into video."
        : "Workflow: text-to-image or image edit.";

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent` +
    `?key=${encodeURIComponent(apiKey)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: resolveSystemInstruction(mode, options) }],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${localeHint}\n${workflowHint}\n\nUser request:\n${trimmed}`,
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
      .slice(0, maxOut);

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
  resolveSystemInstruction,
};
