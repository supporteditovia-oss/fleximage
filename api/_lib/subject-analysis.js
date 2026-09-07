/**
 * Analyse invisible avant génération lifestyle : photo + contexte scène/prompt.
 * Gemini/OpenAI vision si clé dispo, sinon heuristiques texte.
 */

const ANALYSIS_TIMEOUT_MS = 14_000;

const ANALYSIS_SCHEMA_HINT = `Return ONLY valid JSON with these keys (strings, concise English values):
subject_presentation, apparent_age, outfit_style, pose_direction, mood, activity, location_context, camera_style

Rules:
- Infer from the reference photo AND scene/prompt context.
- Describe presentation, styling, attitude and pose direction only.
- NEVER instruct to change identity, face, skin tone, hair, apparent age or body proportions.
- Avoid stereotypes, caricature and sexualization.
- camera_style should imply friend-taken smartphone: slight grain, imperfect framing, natural perspective.`;

function getVisionApiKey() {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    ""
  ).trim();
}

function getVisionProvider() {
  if (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY
  ) {
    return "gemini";
  }
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
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
  if (!res.ok) throw new Error(`subject_analysis_fetch_${res.status}`);
  const contentType = (res.headers.get("content-type") || "image/jpeg").split(";")[0];
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 4_000_000) throw new Error("subject_analysis_image_too_large");
  return {
    mimeType: contentType || "image/jpeg",
    base64: buf.toString("base64"),
  };
}

async function callGeminiAnalysis({ apiKey, image, promptText }) {
  const model =
    process.env.GEMINI_VISION_MODEL ||
    process.env.GOOGLE_VISION_MODEL ||
    "gemini-2.0-flash";
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent` +
    `?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: promptText },
            {
              inline_data: {
                mime_type: image.mimeType,
                data: image.base64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.15,
        maxOutputTokens: 700,
        responseMimeType: "application/json",
      },
    }),
    signal: AbortSignal.timeout(ANALYSIS_TIMEOUT_MS),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`gemini_analysis_${res.status}:${errText.slice(0, 120)}`);
  }
  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("\n") ||
    "";
  return parseJsonFromModelText(text);
}

async function callOpenAiAnalysis({ apiKey, image, promptText }) {
  const model = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.15,
      max_tokens: 700,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: promptText },
            {
              type: "image_url",
              image_url: {
                url: `data:${image.mimeType};base64,${image.base64}`,
              },
            },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(ANALYSIS_TIMEOUT_MS),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`openai_analysis_${res.status}:${errText.slice(0, 120)}`);
  }
  const data = await res.json();
  return parseJsonFromModelText(data?.choices?.[0]?.message?.content || "");
}

function normalizeAnalysis(raw = {}) {
  const pick = (key, fallback) => {
    const v = String(raw[key] || "").trim();
    return v || fallback;
  };
  return {
    subject_presentation: pick("subject_presentation", "person from reference photo"),
    apparent_age: pick("apparent_age", "consistent with reference photo"),
    outfit_style: pick("outfit_style", "casual everyday"),
    pose_direction: pick(
      "pose_direction",
      "natural believable posture adapted to the scene",
    ),
    mood: pick("mood", "confident and authentic"),
    activity: pick("activity", "lifestyle moment in scene"),
    location_context: pick("location_context", "matches user scene or prompt"),
    camera_style: pick(
      "camera_style",
      "friend-taken smartphone photo, slight grain, imperfect framing, natural skin pores",
    ),
    source: raw.source || "heuristic",
  };
}

function heuristicAnalysis(userPrompt = "", sceneContext = "") {
  const text = `${userPrompt} ${sceneContext}`.toLowerCase();
  const analysis = normalizeAnalysis({ source: "heuristic" });

  if (
    /\b(luxe|luxury|hôtel|hotel|yacht|designer|tuxedo|costume|cravate|gala|chanel|dior|lv|gucci|prada|hermes|lamborghini|ferrari|jet|business class|first class)\b/.test(
      text,
    )
  ) {
    analysis.outfit_style = "elegant luxury";
    analysis.pose_direction =
      "charismatic assured refined natural attitude, posture matching upscale location";
    analysis.mood = "confident refined";
    analysis.location_context = "upscale luxury setting";
  } else if (
    /\b(street|streetwear|rap|urbain|urban|hood|sneaker|nike|jordan|trap|drill|skate)\b/.test(
      text,
    )
  ) {
    analysis.outfit_style = "streetwear urban";
    analysis.pose_direction =
      "relaxed credible confident authentic urban attitude without caricature or cliché";
    analysis.mood = "confident authentic";
  } else if (
    /\b(sport|gym|fitness|run|running|football|basket|tennis|training|workout)\b/.test(
      text,
    )
  ) {
    analysis.outfit_style = "athletic sportswear";
    analysis.pose_direction = "dynamic athletic posture suited to the activity";
    analysis.mood = "energetic focused";
    analysis.activity = "sport or fitness activity";
  } else if (/\b(plage|beach|pool|piscine|vacances|resort)\b/.test(text)) {
    analysis.outfit_style = "resort casual";
    analysis.pose_direction = "relaxed spontaneous vacation posture";
    analysis.mood = "easygoing";
  }

  if (/\b(nuit|night|soir|evening|sunset|golden hour)\b/.test(text)) {
    analysis.location_context = `${analysis.location_context}; evening or night lighting`;
  }
  if (/\b(parapluie|rain|pluie|météo|weather)\b/.test(text)) {
    analysis.location_context = `${analysis.location_context}; weather-aware scene`;
  }

  return analysis;
}

function buildAnalysisPromptBlock(analysis) {
  const a = normalizeAnalysis(analysis);
  return (
    "AUTO SUBJECT & POSE ANALYSIS (mandatory guidance — identity unchanged). " +
    "Analyze reference image 1 and scene context; adapt ONLY pose, attitude, styling coherence and body language. " +
    "IDENTITY LOCK: never alter face, skin tone, hair, apparent age, ethnicity or body proportions from reference image 1. " +
    `subject_presentation: ${a.subject_presentation}. ` +
    `apparent_age: keep ${a.apparent_age}. ` +
    `outfit_style: ${a.outfit_style} — keep clothing level consistent with reference unless user explicitly requests outfit change. ` +
    `pose_direction: ${a.pose_direction}. ` +
    `mood: ${a.mood}. ` +
    `activity: ${a.activity}. ` +
    `location_context: ${a.location_context}. ` +
    `camera_style: ${a.camera_style}. ` +
    "Elegant or well-dressed subject → charismatic assured refined natural attitude. " +
    "Streetwear/urban → relaxed credible confident authentic, no caricature. " +
    "Sportswear → dynamic activity-appropriate posture. " +
    "Casual → spontaneous simple pose. " +
    "Match pose to full context: place, time, weather, clothes, accessories and activity — a suited person at a luxury hotel must not share the same pose as someone in sportswear on a field. " +
    "Render like a real friend-taken smartphone photo: natural skin with pores, correct hands, coherent light, realistic clothing folds, plausible background, slight grain and imperfect framing."
  );
}

function buildAnalysisSummaryFr(analysis) {
  const a = normalizeAnalysis(analysis);
  const styleLabel = a.outfit_style.includes("luxury") || a.outfit_style.includes("elegant")
    ? "Style élégant détecté"
    : a.outfit_style.includes("street")
      ? "Style streetwear détecté"
      : a.outfit_style.includes("athletic") || a.outfit_style.includes("sport")
        ? "Style sportif détecté"
        : "Style décontracté détecté";
  const moodLabel =
    a.mood.includes("refined") || a.mood.includes("charism")
      ? "attitude charismatique"
      : a.mood.includes("authentic") || a.mood.includes("confident")
        ? "attitude confiante et naturelle"
        : "attitude adaptée";
  const poseLabel = "pose naturelle adaptée au lieu";
  return `${styleLabel} · ${moodLabel} · ${poseLabel}`;
}

async function analyzeSubjectContext({
  imageUrl,
  imageBase64,
  mimeType = "image/jpeg",
  userPrompt = "",
  sceneContext = "",
}) {
  const provider = getVisionProvider();
  const apiKey = getVisionApiKey();
  const contextText = [userPrompt, sceneContext].filter(Boolean).join("\nScene: ");

  if (!provider || !apiKey) {
    return heuristicAnalysis(userPrompt, sceneContext);
  }

  try {
    let image;
    if (imageBase64) {
      const raw = String(imageBase64).replace(/^data:[^;]+;base64,/, "");
      image = { mimeType, base64: raw };
    } else if (imageUrl) {
      image = await fetchImageAsBase64(imageUrl);
    } else {
      return heuristicAnalysis(userPrompt, sceneContext);
    }
    const promptText =
      `${ANALYSIS_SCHEMA_HINT}\n\nScene/prompt context:\n${contextText || "(none)"}\n\n` +
      "Look at the reference photo. Infer presentation, outfit elegance, accessories, and the most coherent pose direction for the requested scene.";

    const raw =
      provider === "gemini"
        ? await callGeminiAnalysis({ apiKey, image, promptText })
        : await callOpenAiAnalysis({ apiKey, image, promptText });

    if (!raw || typeof raw !== "object") {
      return heuristicAnalysis(userPrompt, sceneContext);
    }
    return normalizeAnalysis({ ...raw, source: provider });
  } catch (err) {
    console.warn("[subject-analysis] vision failed, using heuristic:", err?.message || err);
    return heuristicAnalysis(userPrompt, sceneContext);
  }
}

module.exports = {
  analyzeSubjectContext,
  buildAnalysisPromptBlock,
  buildAnalysisSummaryFr,
  heuristicAnalysis,
  normalizeAnalysis,
};
