const { synthesizeSpeech, synthesizeWithReferenceMsgpack } = require("./fish-audio");
const { humanizeVoiceScript } = require("./voice-humanize");
const { readBundledLandingDemo } = require("./landing-voice-preview-buffer");
const {
  lookupCatalogEntryByFishId,
  resolveCatalogStudioSynth,
} = require("./voice-catalog");
const { buildLandingVoiceScript, normalizeVoiceLocale } = require("./landing-voice-demo");

/**
 * Génération Mode A — reference_id Fish, repli inline MP3 bundle (admin).
 */
async function synthesizeCatalogPresetSpeech({
  fishReferenceId,
  ttsText,
  localeLike,
  allowBundledReferenceFallback,
}) {
  const entry = lookupCatalogEntryByFishId(fishReferenceId);
  const studio = resolveCatalogStudioSynth(fishReferenceId);
  const referenceId = studio?.referenceId;
  if (!referenceId) {
    throw Object.assign(new Error("Voix catalogue introuvable"), {
      status: 400,
      code: "unknown_catalog_voice",
    });
  }

  const speed = studio.speed;

  try {
    const buffer = await synthesizeSpeech({
      text: ttsText,
      referenceId,
      format: "mp3",
      speed,
      cloneFidelity: false,
      catalogFastFlow: studio.catalogFastFlow === true,
      catalogIncisiveFlow: studio.catalogIncisiveFlow === true,
    });
    if (buffer?.length >= 512) return buffer;
  } catch (primaryErr) {
    if (!allowBundledReferenceFallback || !entry?.slug) {
      throw primaryErr;
    }
    console.warn(
      "[catalog-voice-synth] reference_id failed, bundled inline fallback",
      entry.slug,
      primaryErr?.message || primaryErr,
    );
  }

  if (!allowBundledReferenceFallback || !entry?.slug) {
    throw Object.assign(new Error("Voix de référence indisponible"), {
      status: 502,
      code: "catalog_reference_failed",
    });
  }

  const refAudio = readBundledLandingDemo(entry.slug);
  if (!refAudio || refAudio.length < 512) {
    throw Object.assign(
      new Error("Voix catalogue indisponible (échantillon de secours manquant)."),
      { status: 502, code: "catalog_bundled_missing" },
    );
  }

  const locale = normalizeVoiceLocale(localeLike);
  const landingScript = buildLandingVoiceScript(entry, locale);
  const { fishText: referenceText } = humanizeVoiceScript(landingScript, {
    voiceName: entry.name,
    enabled: false,
  });

  return synthesizeWithReferenceMsgpack({
    text: ttsText,
    audioBuffer: refAudio,
    referenceText,
    speed,
    cloneFidelity: false,
    deepChestClone: false,
    inlineIdentityClone: false,
  });
}

module.exports = {
  synthesizeCatalogPresetSpeech,
};
