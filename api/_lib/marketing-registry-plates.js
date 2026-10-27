const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "data", "marketing-registry-plates.json");

/** EU band / plate shapes — chosen from SOURCE clip, not from city words in the prompt. */
const JURISDICTION_ALIASES = {
  france: "EU_F",
  eu_f: "EU_F",
  spain: "EU_E",
  eu_e: "EU_E",
  italy: "EU_I",
  eu_i: "EU_I",
  germany: "EU_D",
  eu_d: "EU_D",
  uk: "EU_GB",
  eu_gb: "EU_GB",
  gb: "EU_GB",
  monaco: "EU_MC",
  dubai: "UAE",
  uae: "UAE",
  qatar: "QATAR",
  usa: "US",
  us: "US",
  morocco: "MA",
  switzerland: "CH",
  default: "DEFAULT",
};

const SOURCE_JURISDICTION_READ_HINT =
  "Read plate jurisdiction ONLY from the original uploaded photo/video (never from prompt city names): " +
  "EU blue band F=France SIV, E=Spain, I=Italy, D=Germany, GB=UK; white/red UAE; US state plate; etc. " +
  "Keep that same country format on the replacement car.";

let cachedBase = null;

function loadBaseRegistry() {
  if (cachedBase) return cachedBase;
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf8");
    cachedBase = JSON.parse(raw);
  } catch {
    cachedBase = { entries: [] };
  }
  return cachedBase;
}

function normalizeJurisdictionKey(key) {
  const k = String(key || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_");
  return JURISDICTION_ALIASES[k] || String(key || "").trim().toUpperCase();
}

function normalizePlatesMap(plates) {
  const out = {};
  for (const [rawKey, rawVal] of Object.entries(plates || {})) {
    const val = normalizePlateText(rawVal);
    if (!val) continue;
    out[normalizeJurisdictionKey(rawKey)] = val;
  }
  return out;
}

function envPlateForEntryId(entryId, jurisdiction) {
  const key = String(entryId || "")
    .replace(/[^a-z0-9]+/gi, "_")
    .toUpperCase();
  if (!key) return "";
  if (jurisdiction) {
    const jKey = normalizeJurisdictionKey(jurisdiction);
    const scoped = String(
      process.env[`MARKETING_PLATE_${key}_${jKey}`] || "",
    ).trim();
    if (scoped) return scoped;
  }
  return String(process.env[`MARKETING_PLATE_${key}`] || "").trim();
}

function mergeEnvRegistryJson(base) {
  const raw = String(process.env.MARKETING_REGISTRY_PLATES_JSON || "").trim();
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.entries)) return base;
    const byId = new Map((base.entries || []).map((e) => [e.id, { ...e }]));
    for (const row of parsed.entries) {
      if (!row || !row.id) continue;
      const prev = byId.get(row.id) || { id: row.id, plates: {} };
      byId.set(row.id, {
        ...prev,
        ...row,
        plates: normalizePlatesMap({
          ...(prev.plates || {}),
          ...(row.plates || {}),
        }),
      });
    }
    return { ...base, entries: [...byId.values()] };
  } catch {
    return base;
  }
}

function getRegistryEntries() {
  return mergeEnvRegistryJson(loadBaseRegistry()).entries || [];
}

function normalizePlateText(plate) {
  return String(plate || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function slugifyVehicleRegistryId(label) {
  return String(label || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function extractUserRequestedPlate(prompt) {
  const text = String(prompt || "");
  const m =
    text.match(
      /\b(?:plaque|immat(?:riculation)?|matricule|plate|license\s*plate)\s+([A-Z0-9][A-Z0-9\s-]{4,14})\b/i,
    ) ||
    text.match(/\b([A-Z]{2}-\d{3}-[A-Z]{2})\b/);
  if (!m) return "";
  return normalizePlateText(m[1]);
}

function textMentionsToken(text, token) {
  const t = String(token || "").toLowerCase();
  if (!t) return false;
  if (t === "svg") {
    return (
      /\bsvg\b/i.test(text) &&
      /\b(lamborghini|lambo|aventador)\b/i.test(text)
    );
  }
  return new RegExp(
    `\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
    "i",
  ).test(text);
}

function entryMatchesPrompt(entry, prompt, spec) {
  const text = String(prompt || "").toLowerCase();
  const label = String(spec?.label || "").toLowerCase();
  const slug = slugifyVehicleRegistryId(spec?.label);
  if (slug && entry.id === slug) return true;
  for (const frag of entry.labelMatchers || []) {
    const f = String(frag).toLowerCase();
    if (label.includes(f) || text.includes(f)) return true;
  }
  for (const tok of entry.tokenMatchers || []) {
    if (textMentionsToken(text, tok)) return true;
  }
  return false;
}

function resolveRegistryEntry(prompt, spec) {
  const entries = getRegistryEntries();
  if (spec) {
    const slug = slugifyVehicleRegistryId(spec.label);
    const bySlug = entries.find((e) => e.id === slug);
    if (bySlug) return bySlug;
    const byPrefix = entries.find(
      (e) =>
        e.id &&
        (slug.startsWith(String(e.id)) || String(e.id).startsWith(slug)),
    );
    if (byPrefix) return byPrefix;
    for (const entry of entries) {
      if (entryMatchesPrompt(entry, prompt, spec)) return entry;
    }
    return {
      id: slug,
      verifyModel: spec.label,
      labelMatchers: [spec.label.toLowerCase()],
      plates: {},
    };
  }
  for (const entry of entries) {
    if (entryMatchesPrompt(entry, prompt, spec)) return entry;
  }
  return null;
}

function collectPrePlatesForEntry(entry) {
  const plates = normalizePlatesMap(entry?.plates || {});
  const envDefault = envPlateForEntryId(entry?.id);
  if (envDefault && !plates.DEFAULT) {
    plates.DEFAULT = normalizePlateText(envDefault);
  }
  for (const key of Object.keys(JURISDICTION_ALIASES)) {
    const j = JURISDICTION_ALIASES[key];
    const fromEnv = envPlateForEntryId(entry?.id, j);
    if (fromEnv && !plates[j]) {
      plates[j] = normalizePlateText(fromEnv);
    }
  }
  return plates;
}

function resolvePlateForEntry(entry, prompt) {
  const fromUser = extractUserRequestedPlate(prompt);
  if (fromUser) {
    return {
      mode: "exact",
      plate: fromUser,
      source: "user_prompt",
      prePlates: {},
    };
  }
  const prePlates = collectPrePlatesForEntry(entry);
  const keys = Object.keys(prePlates);
  if (keys.length === 0) return null;
  if (keys.length === 1) {
    const only = keys[0];
    return {
      mode: "exact",
      plate: prePlates[only],
      jurisdiction: only,
      source: "pre_plate",
      prePlates,
    };
  }
  if (prePlates.DEFAULT) {
    return {
      mode: "exact",
      plate: prePlates.DEFAULT,
      jurisdiction: "DEFAULT",
      source: "pre_plate",
      prePlates,
    };
  }
  return {
    mode: "source_jurisdiction",
    plate: null,
    source: "pre_plate",
    prePlates,
  };
}

/**
 * Resolve marketing pre-plates for any vehicle-replace prompt (all models).
 */
function resolveMarketingRegistryPlate(prompt, deps = {}) {
  const { isVehicleReplacePrompt, parseVehicleSpec } = deps;
  if (typeof isVehicleReplacePrompt !== "function") return null;
  if (!isVehicleReplacePrompt(prompt)) return null;
  const spec =
    typeof parseVehicleSpec === "function" ? parseVehicleSpec(prompt) : null;
  if (!spec && !extractUserRequestedPlate(prompt)) return null;

  const entry = resolveRegistryEntry(prompt, spec);
  if (!entry) return null;

  const resolved = resolvePlateForEntry(entry, prompt);
  if (!resolved) return null;

  return {
    entryId: entry.id,
    verifyModel: entry.verifyModel || spec?.label || "requested vehicle",
    mode: resolved.mode,
    plate: resolved.plate,
    plateSource: resolved.source,
    jurisdiction: resolved.jurisdiction || null,
    prePlates: resolved.prePlates || {},
  };
}

function formatPrePlateOptions(prePlates) {
  const labels = {
    EU_F: "France (EU band F, SIV AA-123-AA)",
    EU_E: "Spain (EU band E)",
    EU_I: "Italy (EU band I)",
    EU_D: "Germany (EU band D)",
    EU_GB: "UK (GB)",
    UAE: "UAE/Dubai white-red plate",
    US: "US state plate",
    QATAR: "Qatar",
    MA: "Morocco",
    CH: "Switzerland",
    DEFAULT: "default pre-plate",
  };
  return Object.entries(prePlates)
    .map(([j, plate]) => `${labels[j] || j}: "${plate}"`)
    .join("; ");
}

function buildMarketingRegistryPlateClarifier(prompt, deps = {}) {
  if (/REGISTRY PLATE LOCK:/i.test(String(prompt || ""))) return "";
  const hit = resolveMarketingRegistryPlate(prompt, deps);
  if (!hit) return "";

  if (hit.mode === "source_jurisdiction" && hit.prePlates) {
    const options = formatPrePlateOptions(hit.prePlates);
    return (
      ` (REGISTRY PLATE LOCK: ${SOURCE_JURISDICTION_READ_HINT} ` +
      `Replace the source car plate with the ONE pre-plate that matches that source jurisdiction for ${hit.verifyModel} — options: ${options}. ` +
      `Letter-perfect characters, official bumper holders only, same plate front/rear where visible, stable across frames. ` +
      `NEVER keep the old plate number, NEVER mix countries (no FR format if source had E), NEVER door stickers or gibberish.)`
    );
  }

  return (
    ` (REGISTRY PLATE LOCK: ${SOURCE_JURISDICTION_READ_HINT} ` +
    `Replace ANY source-car license plate with EXACTLY "${hit.plate}" — letter-perfect, same characters front/rear where visible, physically in official bumper holders only. ` +
    `This pre-plate must match a real registered ${hit.verifyModel} in the same jurisdiction as the original clip; NEVER keep the source plate number, NEVER invent alternate digits, NEVER door stickers or gibberish. ` +
    `Hold plate legible and stable across frames when the bumper is visible.)`
  );
}

function enrichPromptWithMarketingRegistryPlate(prompt, deps = {}) {
  const base = String(prompt || "").trim();
  if (!base) return base;
  const clause = buildMarketingRegistryPlateClarifier(base, deps);
  if (!clause) return base;
  const combined = `${base}${clause}`.replace(/\s+/g, " ").trim();
  return combined.length <= 490 ? combined : combined.slice(0, 490);
}

function enrichLongPromptWithMarketingRegistryPlate(prompt, maxLen, deps = {}) {
  const base = String(prompt || "").trim();
  if (!base) return base;
  const clause = buildMarketingRegistryPlateClarifier(base, deps);
  if (!clause) return base;
  const combined = `${base}${clause}`.replace(/\s+/g, " ").trim();
  const cap = Number(maxLen) > 0 ? Number(maxLen) : 1980;
  return combined.length <= cap ? combined : combined.slice(0, cap);
}

function getPromptGuardDeps() {
  const { isVehicleReplacePrompt, parseVehicleSpec } = require("./prompt-guard");
  return { isVehicleReplacePrompt, parseVehicleSpec };
}

function buildMarketingRegistryPlateClarifierForPrompt(prompt) {
  return buildMarketingRegistryPlateClarifier(prompt, getPromptGuardDeps());
}

function enrichPromptWithMarketingRegistryPlateAuto(prompt) {
  return enrichPromptWithMarketingRegistryPlate(prompt, getPromptGuardDeps());
}

function enrichLongPromptWithMarketingRegistryPlateAuto(prompt, maxLen) {
  return enrichLongPromptWithMarketingRegistryPlate(prompt, maxLen, getPromptGuardDeps());
}

module.exports = {
  enrichPromptWithMarketingRegistryPlate,
  enrichLongPromptWithMarketingRegistryPlate,
  enrichPromptWithMarketingRegistryPlateAuto,
  enrichLongPromptWithMarketingRegistryPlateAuto,
  buildMarketingRegistryPlateClarifier,
  buildMarketingRegistryPlateClarifierForPrompt,
  resolveMarketingRegistryPlate,
  extractUserRequestedPlate,
  slugifyVehicleRegistryId,
  getRegistryEntries,
  _resetCacheForTests: () => {
    cachedBase = null;
  },
};
