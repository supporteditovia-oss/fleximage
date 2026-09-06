/**
 * Post-generation visual QA + corrective retry helpers.
 * Uses Gemini (preferred) or OpenAI vision when a key is configured.
 * If no key / VISION_QA_ENABLED=0 → skip (pass) so generations never block.
 */

/** Original + 1 corrective regen max — extra passes rarely help and feel stuck. */
const MAX_VISION_QA_RETRIES = 1;
/** Fictional/cartoon cars: 1 retry max — more retries eat the poll budget and feel stuck. */
const MAX_VISION_QA_RETRIES_FICTIONAL = 1;
/** Lifestyle + named luxury car: 1 retry — wrong-brand cabins rarely fix on pass 2+. */
const MAX_VISION_QA_RETRIES_LIFESTYLE = 1;
/** Parked-car body swap: 1 retry — pass 2+ rarely fixes pose/background drift. */
const MAX_VISION_QA_RETRIES_VEHICLE_REPLACE = 1;
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
 * While retries remain: CRITICAL results are NOT returned to the customer.
 * After max retries: best-effort accept (cost control).
 */
async function maybeRetryAfterVisionQa({
  supabase,
  larp,
  resultUrls,
  uploadImageUrlsToOneshot,
  createOneshotJob,
  buildVisionQaRetryPrompt,
  aspectRatio,
  modelVariant,
} = {}) {
  const meta =
    larp && larp.metadata && typeof larp.metadata === "object"
      ? { ...larp.metadata }
      : {};
  const retryCount = Number(meta.vision_qa_retry_count || 0);
  const fictional = isFictionalVehicleQaContext(
    larp && larp.prompt,
    larp && larp.final_prompt,
  );
  const lifestyleVehicle = isLifestyleNamedVehicleQaContext(
    larp && larp.prompt,
    larp && larp.final_prompt,
  );
  const vehicleReplace = isVehicleReplaceQaContext(
    larp && larp.prompt,
    larp && larp.final_prompt,
  );
  // Vehicle body swap: deliver first pass — QA retries add ~60s for little gain.
  if (vehicleReplace) {
    return { action: "accept", qa: { skipped: true, reason: "vehicle_replace_fast" } };
  }
  const maxRetries = fictional
    ? MAX_VISION_QA_RETRIES_FICTIONAL
    : lifestyleVehicle
      ? MAX_VISION_QA_RETRIES_LIFESTYLE
      : vehicleReplace
        ? MAX_VISION_QA_RETRIES_VEHICLE_REPLACE
        : MAX_VISION_QA_RETRIES;
  const atMaxRetries = retryCount >= maxRetries;

  if (!isVisionQaEnabled()) {
    return { action: "accept", qa: { skipped: true } };
  }

  const imageUrl =
    Array.isArray(resultUrls) && resultUrls[0] ? resultUrls[0] : null;
  const qa = await inspectGenerationResult({
    imageUrl,
    userPrompt: larp.prompt,
    finalPrompt: larp.final_prompt,
  });

  if (!qa || qa.skipped || !qa.critical) {
    return { action: "accept", qa };
  }

  // Critical but no retries left — deliver best effort (cost limit).
  if (atMaxRetries) {
    console.warn("[vision-qa] critical after max retries — accepting", {
      larpId: larp && larp.id,
      issues: (qa.issues || []).map((i) => i.code),
    });
    return { action: "accept", qa: { ...qa, reason: "max_retries" } };
  }

  const oneshotTaskId = String(larp.provider_task_id || "");
  const claimMarker = `${oneshotTaskId},__vision_qa_claim__`;
  const { data: claimedRows, error: claimErr } = await supabase
    .from("generations")
    .update({
      provider_task_id: claimMarker,
      updated_at: new Date().toISOString(),
      metadata: {
        ...meta,
        vision_qa_pending: true,
        vision_qa_last_issues: (qa.issues || []).slice(0, 8),
      },
    })
    .eq("id", larp.id)
    .eq("provider_task_id", oneshotTaskId)
    .select("id");

  if (claimErr) {
    console.error("[vision-qa] claim failed", claimErr);
    return { action: "accept", qa };
  }
  if (!claimedRows || claimedRows.length === 0) {
    return { action: "busy", qa };
  }

  try {
    const issuePayload =
      qa.issues && qa.issues.length > 0
        ? qa.issues
        : qa.correctiveInstructions
          ? [qa.correctiveInstructions]
          : [];
    const retryPrompt = buildVisionQaRetryPrompt(
      larp.final_prompt || larp.prompt || "",
      issuePayload,
    );
    const imageUrls = Array.isArray(larp.input_assets) ? larp.input_assets : [];
    const referenceFileIds =
      imageUrls.length > 0 ? await uploadImageUrlsToOneshot(imageUrls) : [];
    const oneshotResponse = await createOneshotJob(retryPrompt, {
      aspectRatio: aspectRatio || "9:16",
      modelVariant: modelVariant || "fast",
      ...(referenceFileIds.length > 0 ? { referenceFileIds } : {}),
    });
    if (!oneshotResponse || !oneshotResponse.id) {
      throw new Error("Invalid response from OneshotAPI (vision QA retry)");
    }
    const newTaskId = `custom_${oneshotResponse.id}`;
    const prevEstimate = Number(meta.estimated_seconds);
    const nextMeta = {
      ...meta,
      vision_qa_pending: false,
      vision_qa_retry_count: retryCount + 1,
      vision_qa_last_issues: (qa.issues || []).slice(0, 8),
      vision_qa_rejected_assets: Array.isArray(resultUrls)
        ? resultUrls.slice(0, 4)
        : [],
      oneshot_model_variant:
        modelVariant || meta.oneshot_model_variant || "fast",
      estimated_seconds:
        Number.isFinite(prevEstimate) && prevEstimate > 0
          ? prevEstimate + 55
          : meta.estimated_seconds,
    };
    await supabase
      .from("generations")
      .update({
        status: "processing",
        provider: "oneshot",
        provider_task_id: `${oneshotTaskId},${newTaskId}`,
        final_prompt: retryPrompt,
        metadata: nextMeta,
        updated_at: new Date().toISOString(),
        completed_at: null,
      })
      .eq("id", larp.id);

    console.info("[vision-qa] critical fail → corrective retry", {
      larpId: larp.id,
      retryCount: retryCount + 1,
      issues: (qa.issues || []).map((i) => i.code),
      newTaskId,
    });
    return { action: "retry", qa, newTaskId };
  } catch (err) {
    console.error("[vision-qa] retry spawn failed — accepting original", err);
    await supabase
      .from("generations")
      .update({
        provider_task_id: oneshotTaskId,
        metadata: {
          ...meta,
          vision_qa_pending: false,
          vision_qa_retry_error: String(
            err && err.message ? err.message : err,
          ).slice(0, 200),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", larp.id);
    return { action: "accept", qa };
  }
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
