/**
 * Analyse invisible avant génération lifestyle : photo + contexte scène/prompt.
 * Gemini/OpenAI vision si clé dispo, sinon heuristiques texte.
 */

const {
  enrichAnalysisWithContextPose,
  buildContextPosePromptBlock,
  matchContextPosePlan,
  POSE_FORBIDDEN_GLOBAL,
  COMFORT_RULE,
} = require("./context-pose-library");

const ANALYSIS_TIMEOUT_MS = 14_000;

const ANALYSIS_SCHEMA_HINT = `Return ONLY valid JSON with these keys (strings, concise English values):
subject_presentation, apparent_age, outfit_style, pose_direction, mood, activity, location_context, camera_style

Rules:
- Choose pose from OUTFIT + ACTIVITY + FURNITURE + LOCATION CONTEXT — NOT from apparent gender alone.
- Infer from the reference photo AND scene/prompt context (yacht, restaurant, street, sport field, beach, hotel, etc.).
- Pose must look comfortable, stable, natural and occupied — believable interaction with seats, railings, tables, bags.
- NEVER fashion-campaign mannequin poses: no rigid frontal stance, legs too wide, arms without purpose, props like ads.
- Describe presentation, styling, attitude and pose direction only.
- NEVER instruct to change identity, face, skin tone, hair, apparent age or body proportions.
- Avoid stereotypes, caricature and sexualization.
- camera_style: friend-taken smartphone — slight grain, imperfect framing, natural perspective, candid not studio.`;

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
      "natural believable posture adapted to outfit, furniture and scene",
    ),
    mood: pick("mood", "confident and authentic"),
    activity: pick("activity", "lifestyle moment in scene"),
    location_context: pick("location_context", "matches user scene or prompt"),
    furniture_context: pick("furniture_context", "use visible seating, railing or props naturally"),
    pose_scenario: pick("pose_scenario", ""),
    pose_forbidden: pick("pose_forbidden", POSE_FORBIDDEN_GLOBAL),
    camera_style: pick(
      "camera_style",
      "friend-taken smartphone photo, slight grain, imperfect framing, natural skin pores, candid not campaign",
    ),
    source: raw.source || "heuristic",
  };
}

function finalizeAnalysis(analysis, userPrompt = "", sceneContext = "") {
  const enriched = enrichAnalysisWithContextPose(
    normalizeAnalysis(analysis),
    userPrompt,
    sceneContext,
  );
  if (!enriched.pose_forbidden) {
    enriched.pose_forbidden = POSE_FORBIDDEN_GLOBAL;
  }
  return enriched;
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

  return finalizeAnalysis(analysis, userPrompt, sceneContext);
}

function buildAnalysisPromptBlock(analysis, userPrompt = "", sceneContext = "") {
  const a = finalizeAnalysis(analysis, userPrompt, sceneContext);
  const contextPlan = matchContextPosePlan(userPrompt, sceneContext);
  const contextBlock = buildContextPosePromptBlock(contextPlan);

  return (
    "AUTO SUBJECT & POSE ANALYSIS (mandatory — identity unchanged). " +
    "POSE PRIORITY ORDER: (1) reference identity locked, (2) outfit + activity + furniture + location, (3) gender presentation only if it affects natural gesture — never stereotype. " +
    "Analyze reference image 1 and scene context; adapt ONLY pose, attitude, and body-language coherence. " +
    "IDENTITY LOCK: never alter face, skin tone, hair, apparent age, ethnicity or body proportions from reference image 1. " +
    `${contextBlock} ` +
    `subject_presentation: ${a.subject_presentation}. ` +
    `apparent_age: keep ${a.apparent_age}. ` +
    `outfit_style: ${a.outfit_style}. ` +
    `pose_direction: ${a.pose_direction}. ` +
    `mood: ${a.mood}. ` +
    `activity: ${a.activity}. ` +
    `location_context: ${a.location_context}. ` +
    `furniture_context: ${a.furniture_context}. ` +
    `camera_style: ${a.camera_style}. ` +
    `${a.pose_forbidden}. ` +
    `${COMFORT_RULE} ` +
    "Yacht + elegant dress/gown: three-quarter banquette seat, legs same side, dress folds natural, hands on cushion/seat/bag strap, gaze to sea or friend — NEVER catalog mannequin. " +
    "Evening + restaurant: seated relaxed at table, hands on glass or table edge. " +
    "Streetwear + city: walk or light lean, hands in pockets or phone. " +
    "Sport + field: active equipment-appropriate stance. " +
    "Beach + boat: casual seated, legs naturally bent, look to water. " +
    "Render like a real friend-taken smartphone photo: natural skin pores, correct hands, coherent light, realistic clothing folds, plausible background, slight grain, imperfect candid framing."
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
      "Look at the reference photo. Infer outfit elegance, accessories, furniture (seats, railing, table), activity and the most physically credible candid pose for this scene — not a fashion campaign.";

    const raw =
      provider === "gemini"
        ? await callGeminiAnalysis({ apiKey, image, promptText })
        : await callOpenAiAnalysis({ apiKey, image, promptText });

    if (!raw || typeof raw !== "object") {
      return heuristicAnalysis(userPrompt, sceneContext);
    }
    return finalizeAnalysis({ ...raw, source: provider }, userPrompt, sceneContext);
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
