const { analyzeSubjectContext } = require("./subject-analysis");

const MOTION_SUBJECT_SCHEMA = `Return ONLY valid JSON:
{
  "full_body_description": "one English sentence describing the entire person visible in the photo (body build, skin, hair, outfit or shirtless, accessories)",
  "forbidden_from_video": "list clothing/hair traits that must NOT be copied from the dance video (e.g. white t-shirt, ponytail)"
}

Rules:
- Describe ONLY what is visible in the reference photo (full body if visible).
- Be concrete: shirtless, muscular, dreadlocks, dress color, etc.
- Never invent brands unless visible.`;

async function fetchImageAsBase64(imageUrl) {
  const res = await fetch(String(imageUrl).trim(), {
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`motion_subject_fetch_${res.status}`);
  const mimeType = (res.headers.get("content-type") || "image/jpeg").split(";")[0];
  const buf = Buffer.from(await res.arrayBuffer());
  return { mimeType, base64: buf.toString("base64") };
}

async function callGeminiMotionSubject({ apiKey, image, userPrompt }) {
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
            {
              text:
                `${MOTION_SUBJECT_SCHEMA}\n\nUser intent:\n${String(userPrompt || "").slice(0, 800)}`,
            },
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
        temperature: 0.1,
        maxOutputTokens: 400,
        responseMimeType: "application/json",
      },
    }),
    signal: AbortSignal.timeout(14_000),
  });
  if (!res.ok) {
    throw new Error(`gemini_motion_subject_${res.status}`);
  }
  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("\n") ||
    "";
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    return null;
  }
}

function heuristicMotionSubjectLock(userPrompt = "") {
  const text = String(userPrompt || "").toLowerCase();
  let desc =
    "the complete person from the reference photo with exact body shape, skin tone, hairstyle and clothing (or bare torso) as shown in the photo";
  if (/\b(torse nu|shirtless|bare chest|torse)\b/.test(text)) {
    desc =
      "a shirtless person matching the reference photo body build, skin tone and long hair exactly as in the photo";
  }
  return (
    `FULL BODY REPLACEMENT LOCK: ${desc}. ` +
    "Transfer ONLY dance skeleton/pose timing from the video. " +
    "The original dancer must be fully erased — no ghost body parts. " +
    "Stay at the same place and depth in the room as the original performer (same screen position, never move toward the camera). " +
    "FORBIDDEN: face-swap, keeping the original dancer outfit, ponytail, body shape or skin from the video clip; any background blur."
  );
}

/**
 * Verrou prompt Kling — corps entier + tenue photo, pas face-swap sur la danseuse.
 */
async function buildMotionFullBodyPromptLock({ imageUrl, userPrompt }) {
  const apiKey = (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    ""
  ).trim();

  if (!apiKey || !imageUrl) {
    return heuristicMotionSubjectLock(userPrompt);
  }

  try {
    const image = await fetchImageAsBase64(imageUrl);
    const raw = await callGeminiMotionSubject({
      apiKey,
      image,
      userPrompt,
    });
    const bodyDesc = String(raw?.full_body_description || "").trim();
    const forbidden = String(raw?.forbidden_from_video || "").trim();
    if (bodyDesc.length >= 12) {
      return (
        `FULL BODY REPLACEMENT LOCK: ${bodyDesc}. ` +
        "Use the reference IMAGE for entire body, clothes, hair and physique — NOT a face overlay on the video dancer. " +
        "Video clip supplies motion/choreography and room only. " +
        (forbidden
          ? `Do NOT copy from the source dancer: ${forbidden}. `
          : "Do NOT copy the source dancer outfit, hairstyle or body shape. ") +
        "Realistic lighting matching the corridor/room in the video."
      );
    }
  } catch (err) {
    console.warn("[motion-subject-prompt] vision lock failed", err?.message || err);
  }

  try {
    const analysis = await analyzeSubjectContext({
      imageUrl,
      userPrompt,
      sceneContext: "full body motion control dance replacement",
    });
    const presentation = analysis?.subject_presentation || "person from reference photo";
    const outfit = analysis?.outfit_style || "exact outfit as reference photo";
    return (
      `FULL BODY REPLACEMENT LOCK: ${presentation}; outfit and body: ${outfit}; ` +
      "complete hairstyle and morphology from reference IMAGE only. " +
      "FORBIDDEN: face-swap onto the original video performer; keep video motion only."
    );
  } catch {
    return heuristicMotionSubjectLock(userPrompt);
  }
}

module.exports = {
  buildMotionFullBodyPromptLock,
  heuristicMotionSubjectLock,
};
