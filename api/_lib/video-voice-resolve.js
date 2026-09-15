const catalog = require("../../shared/voice-catalog.json");
const { analyzeSubjectContext } = require("./subject-analysis");

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "");
}

function inferGenderFromText(text) {
  const t = String(text || "").toLowerCase();
  if (
    /\b(femme|woman|women|girl|girls|meuf|meufs|fille|filles|elle|elles|her|madame|m[èe]re|queen|reine|actrice|soprano)\b/.test(
      t,
    )
  ) {
    return "femme";
  }
  if (
    /\b(homme|man|men|boy|boys|mec|mecs|guy|guys|lui|his|monsieur|p[èe]re|king|roi|acteur|r[ée]alisateur)\b/.test(
      t,
    )
  ) {
    return "homme";
  }
  return null;
}

function inferGenderFromPresentation(presentation) {
  const p = String(presentation || "").toLowerCase();
  if (/\b(woman|women|female|girl|femme|feminine|feminine-presenting)\b/.test(p)) {
    return "femme";
  }
  if (/\b(man|men|male|boy|homme|masculine|masculine-presenting)\b/.test(p)) {
    return "homme";
  }
  return null;
}

function findCatalogEntryByPrompt(text) {
  const normalized = normalizeName(text);
  if (!normalized) return null;
  for (const entry of catalog.entries) {
    const bySlug = normalizeName(entry.slug);
    const byName = normalizeName(entry.name);
    if (
      (bySlug && normalized.includes(bySlug)) ||
      (byName && normalized.includes(byName))
    ) {
      return entry;
    }
  }
  return null;
}

function defaultCatalogVoice(gender) {
  const slug = gender === "femme" ? "voix-femme" : "voix-homme";
  return catalog.entries.find((entry) => entry.slug === slug) || catalog.entries[0];
}

/**
 * Choisit une voix catalogue Fish Audio à partir de la photo + prompt + texte vocal.
 */
async function resolveI2VVoice({
  imageUrl,
  imageBase64,
  mimeType,
  motionPrompt = "",
  voiceText = "",
}) {
  const combinedText = `${motionPrompt}\n${voiceText}`.trim();
  const named = findCatalogEntryByPrompt(combinedText);
  if (named?.fishId) {
    return {
      fishReferenceId: named.fishId,
      voiceName: named.name,
      gender: named.gender || "homme",
      source: "catalog-name",
    };
  }

  const analysis = await analyzeSubjectContext({
    imageUrl,
    imageBase64,
    mimeType,
    userPrompt: motionPrompt,
    sceneContext: voiceText,
  });

  const gender =
    inferGenderFromText(voiceText) ||
    inferGenderFromText(motionPrompt) ||
    inferGenderFromPresentation(analysis.subject_presentation) ||
    "homme";

  const entry = defaultCatalogVoice(gender);
  return {
    fishReferenceId: entry.fishId,
    voiceName: entry.name,
    gender: entry.gender || gender,
    source: analysis.source || "heuristic",
  };
}

module.exports = {
  resolveI2VVoice,
  inferGenderFromText,
  findCatalogEntryByPrompt,
};
