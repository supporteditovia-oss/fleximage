/**
 * Image→Vidéo — détection ambiance + SFX depuis le prompt (Gemini 2.5 Flash + heuristique).
 */
const { getGeminiApiKey, resolvePromptModel } = require("./prompt-intelligence");
const { normalizeI2VAmbience } = require("../../shared/i2v-ambience.cjs");
const {
  normalizeI2VSfx,
  normalizeI2VSfxMoment,
} = require("../../shared/i2v-sfx.cjs");

const CONFIDENCE_MIN = 0.6;
const TIMEOUT_MS = 12_000;

const SYSTEM_INSTRUCTION = `You are LuxeFlexIA I2V Sound Auto. Given a video motion/scene prompt (English) and optional image description, pick background ambience and one optional sound effect for post-mix under AI voice.

Output ONLY valid JSON (no markdown):
{
  "ambiance": "street" | "crowd_protest" | "none",
  "sfx": "explosion" | "fuite_eau" | "coup_sourd" | "verre_brise" | "sirene_police" | "foule_applaudit" | "tonnerre" | "klaxon" | "porte_claque" | "alarme" | null,
  "sfx_moment": "start" | "middle" | "end",
  "confidence": number between 0 and 1,
  "label_fr": "short French label for UI e.g. Sirène police + foule",
  "suggested_voice_filter": "homme" | "femme" | "all"
}

Mapping hints:
- police arrest / handcuffs / riot → sfx sirene_police, ambiance crowd_protest
- explosion / fire / bomb → sfx explosion
- water leak / pipe / flooding → sfx fuite_eau
- punch / fight / brawl → sfx coup_sourd
- glass break → sfx verre_brise
- thunderstorm → sfx tonnerre
- car horn / traffic stress → sfx klaxon (ambiance street only if urban traffic bed fits)
- door slam → sfx porte_claque
- alarm / emergency buzzer → sfx alarme
- applause / crowd cheer → sfx foule_applaudit

Rules:
- Prefer silence: if scene is calm, nature, portrait, eating, office without action → confidence below 0.5, ambiance "none", sfx null.
- Never invent sounds not supported by the scene.
- One sfx max. confidence must reflect certainty (0.9 = obvious, 0.4 = guess).`;

/** @typedef {{ ambiance: string, sfx: string|null, sfx_moment: string, confidence: number, label_fr: string, source?: string }} SoundAutoDetection */

/**
 * @param {Partial<SoundAutoDetection>} raw
 * @returns {SoundAutoDetection}
 */
function normalizeSuggestedVoiceFilter(value) {
  const v = String(value || "").trim().toLowerCase();
  if (v === "homme" || v === "male" || v === "m") return "homme";
  if (v === "femme" || v === "female" || v === "f") return "femme";
  return "all";
}

function detectSuggestedVoiceFilterHeuristic(promptText, imageDescription = "") {
  const blob = `${promptText} ${imageDescription}`.toLowerCase();
  const fem =
    /\b(woman|women|female|she|her|girl|lady|femme|elle|actrice|mère|madame)\b/i.test(
      blob,
    );
  const hom =
    /\b(man|men|male|he|him|boy|guy|homme|il|lui|acteur|père|monsieur)\b/i.test(
      blob,
    );
  if (fem && !hom) return "femme";
  if (hom && !fem) return "homme";
  if (fem && hom) {
    const fCount = (blob.match(/\b(woman|female|she|her|femme|elle)\b/gi) || [])
      .length;
    const hCount = (blob.match(/\b(man|male|he|him|homme|il|lui)\b/gi) || [])
      .length;
    if (fCount > hCount) return "femme";
    if (hCount > fCount) return "homme";
  }
  return "all";
}

function normalizeDetection(raw = {}) {
  let confidence = Number(raw.confidence);
  if (!Number.isFinite(confidence)) confidence = 0;
  confidence = Math.max(0, Math.min(1, confidence));

  let ambiance = normalizeI2VAmbience(raw.ambiance);
  let sfx = normalizeI2VSfx(raw.sfx === null ? "none" : raw.sfx);
  const sfx_moment = normalizeI2VSfxMoment(raw.sfx_moment);
  let label_fr = String(raw.label_fr || "").trim().slice(0, 120);

  if (confidence < CONFIDENCE_MIN) {
    ambiance = "none";
    sfx = "none";
    if (!label_fr) label_fr = "Aucun son (scène calme ou incertaine)";
  } else {
    if (sfx === "none" && ambiance === "none" && !label_fr) {
      label_fr = "Aucun son";
    }
  }

  if (sfx !== "none" && sfx === "foule_applaudit" && ambiance === "none") {
    /* ok */
  }

  return {
    ambiance,
    sfx: sfx === "none" ? null : sfx,
    sfx_moment,
    confidence,
    label_fr: label_fr || "Son adapté à la scène",
    suggested_voice_filter: normalizeSuggestedVoiceFilter(raw.suggested_voice_filter),
    source: raw.source || "normalized",
  };
}

/**
 * Heuristique conservative (tests + fallback sans Gemini).
 * @param {string} promptText
 * @param {string} [imageDescription]
 * @returns {SoundAutoDetection}
 */
function detectI2VSoundHeuristic(promptText, imageDescription = "") {
  const blob = `${promptText} ${imageDescription}`.toLowerCase();
  const voiceFilter = detectSuggestedVoiceFilterHeuristic(
    promptText,
    imageDescription,
  );
  const norm = (partial) =>
    normalizeDetection({
      ...partial,
      suggested_voice_filter: voiceFilter,
      source: "heuristic",
    });

  const calm =
    /\b(calm|peaceful|quiet|serene|paysage calme|montagne|mountain|nature|sunset|portrait|meditation|yoga|sleep|silence)\b/i.test(
      blob,
    ) &&
    !/\b(explosion|police|siren|fight|alarm|thunder|horn|riot|arrest)\b/i.test(
      blob,
    );

  if (calm) {
    return norm({
      ambiance: "none",
      sfx: null,
      sfx_moment: "middle",
      confidence: 0.25,
      label_fr: "Aucun son (scène calme)",
    });
  }

  if (
    /\b(police|arrestation|arrest|handcuff|menottes|cop|swat|riot|manifestation|gendarme)\b/i.test(
      blob,
    )
  ) {
    return norm({
      ambiance: "crowd_protest",
      sfx: "sirene_police",
      sfx_moment: "middle",
      confidence: 0.88,
      label_fr: "Sirène police + foule",
    });
  }

  if (/\b(explosion|explose|bomb|fire|incendie|detonation|blast)\b/i.test(blob)) {
    return norm({
      ambiance: "none",
      sfx: "explosion",
      sfx_moment: "middle",
      confidence: 0.85,
      label_fr: "Explosion",
    });
  }

  if (/\b(fuite|leak|pipe|tuyau|inond|water leak|plumbing)\b/i.test(blob)) {
    return norm({
      ambiance: "none",
      sfx: "fuite_eau",
      sfx_moment: "middle",
      confidence: 0.8,
      label_fr: "Fuite d'eau",
    });
  }

  if (/\b(fight|bagarre|punch|coups?|brawl|boxe)\b/i.test(blob)) {
    return norm({
      ambiance: "none",
      sfx: "coup_sourd",
      sfx_moment: "middle",
      confidence: 0.78,
      label_fr: "Coup / bagarre",
    });
  }

  if (/\b(verre|glass break|window smash)\b/i.test(blob)) {
    return norm({
      ambiance: "none",
      sfx: "verre_brise",
      sfx_moment: "middle",
      confidence: 0.82,
      label_fr: "Verre brisé",
    });
  }

  if (/\b(thunder|tonnerre|storm|orage|lightning)\b/i.test(blob)) {
    return norm({
      ambiance: "none",
      sfx: "tonnerre",
      sfx_moment: "middle",
      confidence: 0.8,
      label_fr: "Tonnerre",
    });
  }

  if (/\b(klaxon|honk|horn|beep traffic)\b/i.test(blob)) {
    return norm({
      ambiance: "street",
      sfx: "klaxon",
      sfx_moment: "middle",
      confidence: 0.75,
      label_fr: "Klaxon + rue",
    });
  }

  if (/\b(door slam|porte|slamming door|door close)\b/i.test(blob)) {
    return norm({
      ambiance: "none",
      sfx: "porte_claque",
      sfx_moment: "middle",
      confidence: 0.76,
      label_fr: "Porte qui claque",
    });
  }

  if (/\b(alarm|alarme|buzzer|emergency alert)\b/i.test(blob)) {
    return norm({
      ambiance: "none",
      sfx: "alarme",
      sfx_moment: "start",
      confidence: 0.77,
      label_fr: "Alarme",
    });
  }

  if (/\b(applause|applaud|cheer|crowd cheer|public)\b/i.test(blob)) {
    return norm({
      ambiance: "none",
      sfx: "foule_applaudit",
      sfx_moment: "middle",
      confidence: 0.74,
      label_fr: "Applaudissements",
    });
  }

  return norm({
    ambiance: "none",
    sfx: null,
    sfx_moment: "middle",
    confidence: 0.35,
    label_fr: "Aucun son détecté",
  });
}

function extractJsonObject(text) {
  const raw = String(text || "").trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1].trim() : raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * @param {{ motionPrompt: string, imageDescription?: string, locale?: string }} params
 * @returns {Promise<SoundAutoDetection>}
 */
async function detectI2VSoundWithGemini(params) {
  const motionPrompt = String(params.motionPrompt || "").trim();
  const imageDescription = String(params.imageDescription || "").trim();
  if (!motionPrompt && !imageDescription) {
    return detectI2VSoundHeuristic("", "");
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey || process.env.I2V_SOUND_AUTO_HEURISTIC_ONLY === "1") {
    return detectI2VSoundHeuristic(motionPrompt, imageDescription);
  }

  let model;
  try {
    model = resolvePromptModel();
  } catch {
    return detectI2VSoundHeuristic(motionPrompt, imageDescription);
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent` +
    `?key=${encodeURIComponent(apiKey)}`;

  const userText = [
    imageDescription ? `Image description:\n${imageDescription}` : "",
    `Video motion/scene prompt:\n${motionPrompt}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ role: "user", parts: [{ text: userText }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 512,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      console.warn("[i2v-sound-auto] gemini_http", res.status);
      return detectI2VSoundHeuristic(motionPrompt, imageDescription);
    }

    const data = await res.json();
    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text)
        .filter(Boolean)
        .join("\n") || "";
    const parsed = extractJsonObject(text);
    if (!parsed) {
      return detectI2VSoundHeuristic(motionPrompt, imageDescription);
    }
    return normalizeDetection({ ...parsed, source: "gemini_flash" });
  } catch (err) {
    console.warn("[i2v-sound-auto] gemini_failed", err?.message);
    return detectI2VSoundHeuristic(motionPrompt, imageDescription);
  }
}

/**
 * Résolution finale pour generate-video.
 * @returns {Promise<{ ambience: string, sfx: string, sfxMoment: string, soundAutoMeta: object }>}
 */
async function resolveI2VSoundForGeneration(opts) {
  const {
    motionPrompt,
    imageDescription = "",
    soundAutoEnabled = true,
    manualOverride = false,
    clientAmbience,
    clientSfx,
    clientSfxMoment,
  } = opts;

  const detection = await detectI2VSoundWithGemini({
    motionPrompt,
    imageDescription,
  });

  const clientAmb = normalizeI2VAmbience(clientAmbience);
  const clientFx = normalizeI2VSfx(clientSfx);
  const clientMoment = normalizeI2VSfxMoment(clientSfxMoment);

  let ambience = "none";
  let sfx = "none";
  let sfxMoment = "middle";
  let overridden = false;

  if (!soundAutoEnabled) {
    ambience = clientAmb;
    sfx = clientFx;
    sfxMoment = clientMoment;
    overridden = manualOverride;
  } else if (manualOverride) {
    ambience = clientAmb;
    sfx = clientFx;
    sfxMoment = clientMoment;
    overridden = true;
  } else {
    ambience = detection.ambiance;
    sfx = detection.sfx ? detection.sfx : "none";
    sfxMoment = detection.sfx_moment;
    overridden = false;
  }

  const soundAutoMeta = {
    enabled: soundAutoEnabled,
    detection: {
      ambiance: detection.ambiance,
      sfx: detection.sfx,
      moment: detection.sfx_moment,
      confidence: detection.confidence,
      label_fr: detection.label_fr,
      source: detection.source,
    },
    applied: {
      ambiance: ambience,
      sfx: sfx === "none" ? null : sfx,
      moment: sfxMoment,
    },
    overridden,
  };

  return {
    ambience,
    sfx,
    sfxMoment,
    soundAutoMeta,
  };
}

module.exports = {
  CONFIDENCE_MIN,
  normalizeDetection,
  detectI2VSoundHeuristic,
  detectI2VSoundWithGemini,
  resolveI2VSoundForGeneration,
};
