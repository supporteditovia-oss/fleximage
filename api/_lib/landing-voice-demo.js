const catalog = require("../../shared/voice-catalog.json");
const {
  normalizeVoiceLocale,
  buildLandingVoiceScript,
} = require("../../shared/voice-locale-scripts.cjs");

const LANDING_VOICE_DEFAULT_SLUG = "gims";

const LANDING_VOICE_BY_SLUG = Object.fromEntries(
  catalog.entries.map((entry) => [entry.slug, entry]),
);

/** v3 — cache séparé par locale (FR / EN / ES). */
const LANDING_VOICE_DEMO_VERSION = 3;

function landingVoiceR2Key(slug, localeLike) {
  const locale = normalizeVoiceLocale(localeLike);
  return `landing-voice-demo/v${LANDING_VOICE_DEMO_VERSION}/${locale}/${slug}.mp3`;
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
  LANDING_VOICE_DEMO_VERSION,
  buildLandingVoiceScript,
  normalizeVoiceLocale,
  landingVoiceR2Key,
  resolveLandingVoiceEntry,
  /** @deprecated */
  resolveLandingVoiceRapper: resolveLandingVoiceEntry,
};
