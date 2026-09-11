/**
 * Profil vocal pour I2V : genre + tranche d'âge depuis la photo source.
 */

const ANALYSIS_TIMEOUT_MS = 12_000;

const VOICE_PROFILE_HINT = `Return ONLY valid JSON:
{
  "presented_gender": "male" | "female" | "unknown",
  "age_band": "child" | "teen" | "adult"
}

Rules:
- child: roughly under 13 years old appearance
- teen: roughly 13-17
- adult: 18+
- Infer from face/body in the photo only.`;

function getVisionApiKey() {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    ""
  ).trim();
}

function parseJsonFromModelText(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function fetchImageAsBase64(imageUrl) {
  const res = await fetch(imageUrl, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`voice_profile_fetch_${res.status}`);
  const contentType = (res.headers.get("content-type") || "image/jpeg").split(";")[0];
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 4_000_000) throw new Error("voice_profile_image_too_large");
  return {
    mimeType: contentType || "image/jpeg",
    base64: buf.toString("base64"),
  };
}

function heuristicVoiceProfile(motionPrompt) {
  const text = String(motionPrompt || "").toLowerCase();
  let presented_gender = "unknown";
  let age_band = "adult";

  if (/\b(enfant|kid|child|bébé|baby|petit gar[çc]on|petite fille)\b/.test(text)) {
    age_band = "child";
  } else if (/\b(ado|teen|adolescent)\b/.test(text)) {
    age_band = "teen";
  }
  if (/\b(femme|fille|woman|girl|she|her)\b/.test(text)) {
    presented_gender = "female";
  } else if (/\b(homme|gar[çc]on|man|boy|he|him)\b/.test(text)) {
    presented_gender = "male";
  }

  return normalizeVoiceProfile({ presented_gender, age_band, source: "heuristic" });
}

function normalizeVoiceProfile(raw) {
  const genderRaw = String(raw?.presented_gender || "unknown").toLowerCase();
  const ageRaw = String(raw?.age_band || "adult").toLowerCase();
  const presented_gender =
    genderRaw === "female" || genderRaw === "male" ? genderRaw : "unknown";
  const age_band =
    ageRaw === "child" || ageRaw === "teen" || ageRaw === "adult"
      ? ageRaw
      : "adult";
  return {
    presented_gender,
    age_band,
    voice_category:
      age_band === "child" || age_band === "teen" ? "child" : presented_gender,
    source: raw?.source || "vision",
  };
}

async function callGeminiVoiceProfile({ apiKey, image, motionPrompt }) {
  const model =
    process.env.GEMINI_VISION_MODEL ||
    process.env.GOOGLE_VISION_MODEL ||
    "gemini-2.0-flash";
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent` +
    `?key=${encodeURIComponent(apiKey)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: `${VOICE_PROFILE_HINT}\n\nMotion context:\n${motionPrompt || "(none)"}` },
              {
                inline_data: {
                  mime_type: image.mimeType,
                  data: image.base64,
                },
              },
            ],
          },
        ],
        generationConfig: { temperature: 0.2, maxOutputTokens: 256 },
      }),
    });
    if (!response.ok) throw new Error(`gemini_voice_profile_${response.status}`);
    const payload = await response.json();
    const text =
      payload?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text)
        .filter(Boolean)
        .join("") || "";
    const parsed = parseJsonFromModelText(text);
    if (!parsed) throw new Error("empty_voice_profile");
    return normalizeVoiceProfile({ ...parsed, source: "gemini" });
  } finally {
    clearTimeout(timer);
  }
}

async function analyzeVoiceProfileFromImage({
  imageUrl,
  motionPrompt = "",
}) {
  if (!imageUrl) return heuristicVoiceProfile(motionPrompt);

  const apiKey = getVisionApiKey();
  if (!apiKey) return heuristicVoiceProfile(motionPrompt);

  try {
    const image = await fetchImageAsBase64(imageUrl);
    return await callGeminiVoiceProfile({
      apiKey,
      image,
      motionPrompt,
    });
  } catch (err) {
    console.warn("[voice-profile] vision failed:", err?.message || err);
    return heuristicVoiceProfile(motionPrompt);
  }
}

function inferVoiceLineFromPrompt(motionPrompt, userVoiceText) {
  const user = String(userVoiceText || "").trim();
  if (user.length >= 1 && user.length <= 140) return user;

  const p = String(motionPrompt || "").toLowerCase();
  if (/tombe|fall|chute|gliss|dans l['']eau|into the water/.test(p)) {
    return "Ah !";
  }
  if (/crie|scream|hurle|hurl/.test(p)) return "Aaaah !";
  if (/rire|sourit|laugh|haha/.test(p)) return "Haha !";
  if (/surprise|choqu|wow/.test(p)) return "Oh !";
  if (/courez|run|sprint/.test(p)) return "Allez !";
  return "Oh !";
}

module.exports = {
  analyzeVoiceProfileFromImage,
  inferVoiceLineFromPrompt,
  normalizeVoiceProfile,
  heuristicVoiceProfile,
};
