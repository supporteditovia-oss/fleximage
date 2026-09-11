/** Pool de voix Fish Audio pour transformation V2V (homme / femme / auto). */

const V2V_VOICE_MODES = ["none", "preserve", "female", "male", "auto"];

/** Claire (FR), voix publiques Fish — utilisables en cross-lingue. */
const DEFAULT_FEMALE_IDS = [
  "5567200c7d8341738f0892bbacd3be3c",
  "933563129e564b19a115bedd57b7406a",
  "b545c585f631496c914815291da4e893",
];

/** Voix jeunes / enfant (cross-lingue). */
const DEFAULT_CHILD_IDS = [
  "b545c585f631496c914815291da4e893",
  "933563129e564b19a115bedd57b7406a",
  "5567200c7d8341738f0892bbacd3be3c",
];

/** Mix voix neutres Fish + rappeurs FR du catalogue (variété homme). */
const DEFAULT_MALE_IDS = [
  "536d3a5e000945adb7038665781a4aca",
  "bf322df2096a46f18c579d0baa36f41d",
  "d986afc13e7346ada353a747bce8a811",
  "cd8c1c3eead843c2b6b855cace16f520",
  "3cfa191ad09b4cfea8e4eebc4c31c923",
  "22b7c6809d5d405aa6a5ae2402272b53",
];

function parseEnvIds(envKey, fallback) {
  const raw = process.env[envKey];
  if (!raw || !String(raw).trim()) return fallback;
  return String(raw)
    .split(",")
    .map((id) => id.trim())
    .filter((id) => /^[a-f0-9]{32}$/i.test(id));
}

function hashSeed(seed) {
  let hash = 0;
  const text = String(seed || "default");
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickVoiceReferenceId(voiceCategory, seed) {
  const key = String(voiceCategory || "male").toLowerCase();
  let pool;
  if (key === "child") {
    pool = parseEnvIds("V2V_VOICE_CHILD_IDS", DEFAULT_CHILD_IDS);
  } else if (key === "female") {
    pool = parseEnvIds("V2V_VOICE_FEMALE_IDS", DEFAULT_FEMALE_IDS);
  } else if (key === "unknown") {
    pool = parseEnvIds("V2V_VOICE_MALE_IDS", DEFAULT_MALE_IDS);
  } else {
    pool = parseEnvIds("V2V_VOICE_MALE_IDS", DEFAULT_MALE_IDS);
  }
  if (pool.length === 0) return null;
  return pool[hashSeed(seed) % pool.length];
}

function resolveVoiceCategoryFromProfile(profile) {
  const p = profile && typeof profile === "object" ? profile : {};
  if (p.voice_category === "child" || p.age_band === "child") return "child";
  if (p.presented_gender === "female") return "female";
  if (p.presented_gender === "male") return "male";
  return "male";
}

function inferGenderFromPrompt(prompt) {
  const text = String(prompt || "").toLowerCase();
  const femaleRe =
    /\b(femme|fille|woman|girl|female|actrice|madame|m[èe]re|h[ée]ro[ïi]ne|transform[eé](?:-|\s)?moi en femme|remplace(?:-|\s)?moi par une femme)\b/i;
  const maleRe =
    /\b(homme|gar[çc]on|man|boy|male|acteur|monsieur|p[èe]re|h[ée]ros|footballeur|joueur|cr7|ronaldo|mbapp[ée]|zidane|transform[eé](?:-|\s)?moi en homme)\b/i;
  if (femaleRe.test(text)) return "female";
  if (maleRe.test(text)) return "male";
  return null;
}

function resolveV2vVoiceMode(raw, preserveSourceAudio) {
  const mode = String(raw || "").trim().toLowerCase();
  if (V2V_VOICE_MODES.includes(mode)) return mode;
  if (preserveSourceAudio) return "preserve";
  return "none";
}

function isV2vVoiceTransformMode(mode) {
  return mode === "female" || mode === "male" || mode === "auto";
}

function v2vVoiceModeChargesCredits(mode) {
  return mode === "preserve" || isV2vVoiceTransformMode(mode);
}

function resolveTargetGender(mode, swapPrompt, seed) {
  if (mode === "female") return "female";
  if (mode === "male") return "male";
  if (mode === "auto") {
    const inferred = inferGenderFromPrompt(swapPrompt);
    if (inferred) return inferred;
    return hashSeed(seed) % 2 === 0 ? "female" : "male";
  }
  return null;
}

module.exports = {
  V2V_VOICE_MODES,
  DEFAULT_FEMALE_IDS,
  DEFAULT_MALE_IDS,
  DEFAULT_CHILD_IDS,
  pickVoiceReferenceId,
  resolveVoiceCategoryFromProfile,
  inferGenderFromPrompt,
  resolveV2vVoiceMode,
  isV2vVoiceTransformMode,
  v2vVoiceModeChargesCredits,
  resolveTargetGender,
};
