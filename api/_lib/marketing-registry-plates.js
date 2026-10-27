const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "data", "marketing-registry-plates.json");

const REGION_FROM_LOCATION = {
  dubai: "dubai",
  qatar: "dubai",
  spain: "spain",
  italy: "default",
  uk: "uk",
  usa: "usa",
  monaco: "france",
  switzerland: "default",
  germany: "default",
  morocco: "default",
  france: "france",
};

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

function envPlateForEntryId(entryId) {
  const key = String(entryId || "")
    .replace(/[^a-z0-9]+/gi, "_")
    .toUpperCase();
  if (!key) return "";
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
        plates: { ...(prev.plates || {}), ...(row.plates || {}) },
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
  return new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(
    text,
  );
}

function entryMatchesPrompt(entry, prompt, spec) {
  const text = String(prompt || "").toLowerCase();
  const label = String(spec?.label || "").toLowerCase();
  for (const frag of entry.labelMatchers || []) {
    if (label.includes(String(frag).toLowerCase())) return true;
  }
  if (entry.id === "lamborghini_urus" && /\burus\b/i.test(text)) {
    return /\b(lamborghini|lambo)\b/i.test(text) || /\burus\b/i.test(text);
  }
  for (const tok of entry.tokenMatchers || []) {
    if (textMentionsToken(text, tok)) return true;
  }
  if (entry.id === "lamborghini_aventador_svj") {
    if (/\b(svj|svg)\b/i.test(text) && /\b(lamborghini|lambo|aventador)\b/i.test(text)) {
      return true;
    }
  }
  return false;
}

function resolvePlateForEntry(entry, prompt, detectPlateLocation) {
  const fromUser = extractUserRequestedPlate(prompt);
  if (fromUser) {
    return { plate: fromUser, source: "user_prompt" };
  }
  const envPlate = envPlateForEntryId(entry.id);
  if (envPlate) {
    return { plate: normalizePlateText(envPlate), source: "env" };
  }
  const loc = typeof detectPlateLocation === "function" ? detectPlateLocation(prompt) : null;
  const regionKey = loc ? REGION_FROM_LOCATION[loc.id] || "default" : "default";
  const plates = entry.plates || {};
  const regional =
    normalizePlateText(plates[regionKey]) ||
    normalizePlateText(plates.default) ||
    normalizePlateText(plates.france);
  if (regional) {
    return { plate: regional, source: "registry" };
  }
  return null;
}

/**
 * Resolve a marketing registry plate for vehicle-replace prompts (photo + V2V).
 * Plates must be real immatriculations you are allowed to use — env/json configurable.
 */
function resolveMarketingRegistryPlate(prompt, deps = {}) {
  const { isVehicleReplacePrompt, parseVehicleSpec, detectPlateLocation } = deps;
  if (typeof isVehicleReplacePrompt !== "function") return null;
  if (!isVehicleReplacePrompt(prompt)) return null;
  const spec = typeof parseVehicleSpec === "function" ? parseVehicleSpec(prompt) : null;
  if (!spec && !extractUserRequestedPlate(prompt)) return null;

  for (const entry of getRegistryEntries()) {
    if (!entryMatchesPrompt(entry, prompt, spec)) continue;
    const resolved = resolvePlateForEntry(entry, prompt, detectPlateLocation);
    if (!resolved?.plate) continue;
    const loc =
      typeof detectPlateLocation === "function" ? detectPlateLocation(prompt) : null;
    return {
      entryId: entry.id,
      verifyModel: entry.verifyModel || spec?.label || "requested vehicle",
      plate: resolved.plate,
      plateSource: resolved.source,
      regionLabel: loc?.label || "matching the scene country",
    };
  }
  return null;
}

function buildMarketingRegistryPlateClarifier(prompt, deps = {}) {
  if (/REGISTRY PLATE LOCK:/i.test(String(prompt || ""))) return "";
  const hit = resolveMarketingRegistryPlate(prompt, deps);
  if (!hit) return "";
  return (
    ` (REGISTRY PLATE LOCK: replace ANY source-car license plate with EXACTLY "${hit.plate}" — letter-perfect, same characters front and rear where visible, physically in official bumper plate holders only. ` +
    `This plate must visually match a real registered ${hit.verifyModel} for ${hit.regionLabel}; NEVER keep the original clip's plate, NEVER invent alternate numbers, NEVER door stickers or gibberish. ` +
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
  const {
    isVehicleReplacePrompt,
    parseVehicleSpec,
    detectPlateLocation,
  } = require("./prompt-guard");
  return { isVehicleReplacePrompt, parseVehicleSpec, detectPlateLocation };
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
  getRegistryEntries,
  _resetCacheForTests: () => {
    cachedBase = null;
  },
};
