/**
 * Post-generation visual QA + corrective retry helpers.
 * Uses Gemini (preferred) or OpenAI vision when a key is configured.
 * If no key / VISION_QA_ENABLED=0 → skip (pass) so generations never block.
 */

/** ONE OneShot job per user action — never spawn a corrective regen (cost + duplicate logs). */
const MAX_VISION_QA_RETRIES = 0;
const MAX_VISION_QA_RETRIES_FICTIONAL = 0;
const MAX_VISION_QA_RETRIES_LIFESTYLE = 0;
const MAX_VISION_QA_RETRIES_VEHICLE_REPLACE = 0;
const VISION_QA_TIMEOUT_MS = 12_000;

const CRITICAL_CODES = new Set([
  "gibberish_text",
  "malformed_plate",
  "wrong_vehicle_interior",
  "mixed_vehicle_brands",
  "distorted_logo",
  "impossible_geometry",
  "anatomy_error",
  "severe_perspective",
  "duplicated_objects",
  "unrequested_feature",
  "identity_lost",
  "edit_not_applied",
  "pose_paste",
  "floating_person",
  "bad_physical_placement",
  "plastic_face",
  "fake_background_person",
  "door_state_contradiction",
  "speed_state_contradiction",
  "activity_implausible",
  "money_unrealistic",
  "severe_lighting_mismatch",
]);

function isVisionQaEnabled() {
  if (String(process.env.VISION_QA_ENABLED || "1").trim() === "0") return false;
  return Boolean(getVisionApiKey());
}

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

function withTimeout(promise, ms, fallback) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function fetchImageAsBase64(imageUrl) {
  const res = await fetch(imageUrl, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`vision_qa_fetch_${res.status}`);
  const contentType = (res.headers.get("content-type") || "image/jpeg").split(";")[0];
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 4_000_000) {
    throw new Error("vision_qa_image_too_large");
  }
  return {
    mimeType: contentType || "image/jpeg",
    base64: buf.toString("base64"),
  };
}

function isFictionalVehicleQaContext(userPrompt, finalPrompt) {
  return /\b(oui[\s\-]?oui|ouioui|noddy|dessin[\s\-]?anime|cartoon|toon|pixar|disney|cars\b|mcqueen|toy\s*car|voiture\s*jouet|animated|fictional|fictionn|batmobile|mario\s*kart|jeu\s*video|FICTIONAL VEHICLE|PHOTOREAL FICTIONAL)\b/i.test(
    `${userPrompt || ""} ${finalPrompt || ""}`,
  );
}

function isLifestyleNamedVehicleQaContext(userPrompt, finalPrompt) {
  const text = `${userPrompt || ""} ${finalPrompt || ""}`;
  if (!/\bLIFESTYLE RELOCATION\b/i.test(text)) return false;
  return /\bGEN LOCK:\s*[^)]+\b(urus|lamborghini|lambo|ferrari|porsche|bmw|mercedes|mansory|g63|911|cayenne|bentley|range\s*rover)\b/i.test(
    text,
  );
}

function isVehicleReplaceQaContext(userPrompt, finalPrompt) {
  const text = `${userPrompt || ""} ${finalPrompt || ""}`;
  return (
    /\bVEHICLE BODY SWAP\b/i.test(text) ||
    /\bPARK LOCK:\s*the new vehicle occupies/i.test(text)
  );
}

function sanitizeQaForFictional(qa, userPrompt, finalPrompt) {
  if (!qa || !isFictionalVehicleQaContext(userPrompt, finalPrompt)) return qa;
  const drop = new Set([
    "door_state_contradiction",
    "speed_state_contradiction",
    "wrong_vehicle_interior",
    "mixed_vehicle_brands",
  ]);
  const issues = (qa.issues || []).filter((i) => !drop.has(String(i.code || "")));
  const hasCritical = issues.some(
    (i) => i.severity === "critical" || CRITICAL_CODES.has(i.code),
  );
  return {
    ...qa,
    issues,
    critical: hasCritical,
    pass: !hasCritical,
  };
}

function buildQaSystemPrompt(userPrompt, finalPrompt) {
  const request = String(userPrompt || "").slice(0, 500);
  const finalBrief = String(finalPrompt || "").slice(0, 700);
  const cartoonAsked = isFictionalVehicleQaContext(request, finalBrief);
  const cartoonNote = cartoonAsked
    ? "FICTIONAL VEHICLE OVERRIDE (critical instructions):\n" +
      "- User wants a cartoon/animated/game/fictional vehicle design (e.g. Cars movie), possibly with photoreal materials.\n" +
      "- NEVER flag door_state_contradiction or speed_state_contradiction for these cabins.\n" +
      "- NEVER flag wrong_vehicle_interior just because it is not a Ferrari/Porsche/Lambo factory cabin.\n" +
      "- CRITICAL only if identity_lost OR edit_not_applied (generic real luxury cabin ignoring the fictional design/reference).\n" +
      "- Matching colors/shapes/decals from the reference fictional car = PASS.\n"
    : "";
  const doorBlock = cartoonAsked
    ? ""
    : "PRIORITY #1 — DOOR STATE (REAL cars only):\n" +
      "If physical doors look CLOSED → white top-down car silhouette on screens must show ALL doors closed (no red open-door). " +
      "Contradiction = CRITICAL door_state_contradiction.\n";
  return (
    "You are a strict photoreal image-edit QA inspector for a lifestyle photo AI product (Luxeflexia). " +
    "Inspect the RESULT image against the user request. Reply with JSON ONLY (no markdown).\n" +
    "Schema:\n" +
    '{"pass":boolean,"critical":boolean,"issues":[{"code":string,"detail":string,"severity":"critical"|"major"|"minor"}],"correctiveInstructions":string}\n' +
    cartoonNote +
    doorBlock +
    "Check: edit applied, identity, pose, placement, anatomy, text/logos, lighting, AI artifacts.\n" +
    "If only minor softness/noise, pass=true critical=false.\n" +
    "correctiveInstructions: short English fix for CRITICAL issues only (max 400 chars).\n" +
    `User request: ${request}\n` +
    `Edit brief: ${finalBrief}`
  );
}

function normalizeQaResult(raw) {
  const empty = {
    pass: true,
    critical: false,
    issues: [],
    correctiveInstructions: "",
    skipped: false,
  };
  if (!raw || typeof raw !== "object") return empty;
  const issues = Array.isArray(raw.issues)
    ? raw.issues
        .map((item) => {
          if (!item) return null;
          if (typeof item === "string") {
            return { code: "other", detail: item, severity: "major" };
          }
          const code = String(item.code || "other").trim();
          const detail = String(item.detail || item.message || "").trim();
          const severity = String(item.severity || "").toLowerCase();
          return {
            code,
            detail,
            severity:
              severity === "critical" || CRITICAL_CODES.has(code)
                ? "critical"
                : severity === "minor"
                  ? "minor"
                  : "major",
          };
        })
        .filter(Boolean)
    : [];
  const hasCritical =
    Boolean(raw.critical) ||
    issues.some((i) => i.severity === "critical" || CRITICAL_CODES.has(i.code));
  return {
    pass: hasCritical ? false : raw.pass !== false,
    critical: hasCritical,
    issues,
    correctiveInstructions: String(raw.correctiveInstructions || "").slice(0, 500),
    skipped: false,
  };
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

async function callGeminiVision({ apiKey, image, promptText }) {
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
        temperature: 0.1,
        maxOutputTokens: 800,
        responseMimeType: "application/json",
      },
    }),
    signal: AbortSignal.timeout(VISION_QA_TIMEOUT_MS),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`gemini_qa_${res.status}:${errText.slice(0, 160)}`);
  }
  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("\n") ||
    "";
  return parseJsonFromModelText(text);
}

async function callOpenAiVision({ apiKey, image, promptText }) {
  const model = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 800,
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
    signal: AbortSignal.timeout(VISION_QA_TIMEOUT_MS),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`openai_qa_${res.status}:${errText.slice(0, 160)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || "";
  return parseJsonFromModelText(text);
}

/**
 * Inspect a generated image. Never throws to callers — returns skipped/pass on errors.
 */
async function inspectGenerationResult({
  imageUrl,
  userPrompt,
  finalPrompt,
} = {}) {
  if (!imageUrl) {
    return {
      pass: true,
      critical: false,
      issues: [],
      correctiveInstructions: "",
      skipped: true,
    };
  }
  if (!isVisionQaEnabled()) {
    return {
      pass: true,
      critical: false,
      issues: [],
      correctiveInstructions: "",
      skipped: true,
    };
  }

  const provider = getVisionProvider();
  const apiKey = getVisionApiKey();
  const promptText = buildQaSystemPrompt(userPrompt, finalPrompt);

  try {
    const image = await withTimeout(fetchImageAsBase64(imageUrl), 10_000, null);
    if (!image) {
      console.warn("[vision-qa] image fetch timeout — skipping");
      return {
        pass: true,
        critical: false,
        issues: [],
        correctiveInstructions: "",
        skipped: true,
      };
    }

    const raw =
      provider === "openai"
        ? await callOpenAiVision({ apiKey, image, promptText })
        : await callGeminiVision({ apiKey, image, promptText });

    if (!raw) {
      console.warn("[vision-qa] empty/unparseable model response — skipping");
      return {
        pass: true,
        critical: false,
        issues: [],
        correctiveInstructions: "",
        skipped: true,
      };
    }
    return sanitizeQaForFictional(
      normalizeQaResult(raw),
      userPrompt,
      finalPrompt,
    );
  } catch (err) {
    console.warn(
      "[vision-qa] inspect failed — skipping",
      err && err.message ? err.message : err,
    );
    return {
      pass: true,
      critical: false,
      issues: [],
      correctiveInstructions: "",
      skipped: true,
    };
  }
}

/**
 * After a successful store, optionally claim + spawn a corrective OneShot job.
 * Returns { action: "accept"|"retry"|"busy", qa, newTaskId? }
 *
 * Policy: ONE OneShot job per generation — inspect for logs only, never retry.
 */
async function maybeRetryAfterVisionQa({
  supabase,
  larp,
  resultUrls,
  buildVisionQaRetryPrompt,
  aspectRatio,
  modelVariant,
} = {}) {
  void supabase;
  void resultUrls;
  void buildVisionQaRetryPrompt;
  void aspectRatio;
  void modelVariant;

  if (!isVisionQaEnabled()) {
    return { action: "accept", qa: { skipped: true } };
  }

  const imageUrl =
    Array.isArray(resultUrls) && resultUrls[0] ? resultUrls[0] : null;
  const qa = await inspectGenerationResult({
    imageUrl,
    userPrompt: larp && larp.prompt,
    finalPrompt: larp && larp.final_prompt,
  });

  return {
    action: "accept",
    qa: qa || { skipped: true, reason: "single_oneshot_policy" },
  };
}

module.exports = {
  MAX_VISION_QA_RETRIES,
  MAX_VISION_QA_RETRIES_FICTIONAL,
  isVisionQaEnabled,
  inspectGenerationResult,
  maybeRetryAfterVisionQa,
  normalizeQaResult,
  CRITICAL_CODES,
};
