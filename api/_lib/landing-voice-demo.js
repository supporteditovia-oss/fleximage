const catalog = require("../../shared/voice-catalog.json");

const LANDING_VOICE_DEFAULT_SLUG = "gims";

const LANDING_VOICE_BY_SLUG = Object.fromEntries(
  catalog.entries.map((entry) => [entry.slug, entry]),
);

function buildLandingVoiceScript(entry) {
  if (entry.demoKind === "natural-male") {
    return "Bonjour, voici une voix masculine naturelle — générée par LuxeFlexIA.";
  }
  if (entry.demoKind === "natural-female") {
    return "Bonjour, voici une voix féminine naturelle — générée par LuxeFlexIA.";
  }
  return `Salut, je me présente, c'est ${entry.name} — j'ai été généré par LuxeFlexIA.`;
}

function landingVoiceR2Key(slug) {
  return `landing-voice-demo/${slug}.mp3`;
}

function resolveLandingVoiceEntry(slug) {
  const key = String(slug || LANDING_VOICE_DEFAULT_SLUG).trim().toLowerCase();
  const entry = LANDING_VOICE_BY_SLUG[key];
  if (!entry) return null;
  return { slug: key, ...entry };
}

module.exports = {
  LANDING_VOICE_CATALOG: catalog.entries,
  LANDING_VOICE_DEFAULT_SLUG,
  buildLandingVoiceScript,
  landingVoiceR2Key,
  resolveLandingVoiceEntry,
  /** @deprecated */
  resolveLandingVoiceRapper: resolveLandingVoiceEntry,
};
