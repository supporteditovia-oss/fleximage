/** Démo voix landing — catalogue rappeurs (modèles Fish). */

const LANDING_VOICE_RAPPERS = {
  gims: { name: "Maître Gims", fishId: "d986afc13e7346ada353a747bce8a811" },
  maes: { name: "Maes", fishId: "22b7c6809d5d405aa6a5ae2402272b53" },
  niska: { name: "Niska", fishId: "6be490a175744894826dd464cf3a5004" },
  booba: { name: "Booba", fishId: "82ec8e836aaf47aaae8bfb52f3d744b2" },
  jul: { name: "Jul", fishId: "66754cdcb9554e62bdff1ab6446dc78d" },
  damso: { name: "Damso", fishId: "cd8c1c3eead843c2b6b855cace16f520" },
  ninho: { name: "Ninho", fishId: "3cfa191ad09b4cfea8e4eebc4c31c923" },
  sch: { name: "SCH", fishId: "d4b887e7013045bcba9bc9bb2fe2d3d5" },
  gazo: { name: "Gazo", fishId: "0ff4b00e39e2429981b93bd7c6256d98" },
  plk: { name: "PLK", fishId: "c9188f639648467f8f1c513b0dbac9f7" },
  sdm: { name: "SDM", fishId: "0a011b2e359e4b5580f0e46764795c3c" },
  tiakola: { name: "Tiakola", fishId: "38aca316167d449288bab317c60cd70b" },
};

const LANDING_VOICE_DEFAULT_SLUG = "gims";

function buildLandingVoiceScript(name) {
  return `Salut, je me présente, c'est ${name} — j'ai été généré par LuxeFlexIA.`;
}

function landingVoiceR2Key(slug) {
  return `landing-voice-demo/${slug}.mp3`;
}

function resolveLandingVoiceRapper(slug) {
  const key = String(slug || LANDING_VOICE_DEFAULT_SLUG).trim().toLowerCase();
  const rapper = LANDING_VOICE_RAPPERS[key];
  if (!rapper) return null;
  return { slug: key, ...rapper };
}

module.exports = {
  LANDING_VOICE_RAPPERS,
  LANDING_VOICE_DEFAULT_SLUG,
  buildLandingVoiceScript,
  landingVoiceR2Key,
  resolveLandingVoiceRapper,
};
