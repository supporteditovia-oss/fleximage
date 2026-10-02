const { uploadToR2 } = require("./r2");
const { synthesizeSpeech } = require("./fish-audio");
const { prepareVoiceTtsForFish } = require("./voice-humanize");
const { lookupCatalogEntryByFishId } = require("./voice-catalog");
const catalog = require("../../shared/voice-catalog.json");

const DEFAULT_CATALOG_FISH_ID =
  catalog.entries.find((e) => e.slug === "voix-homme")?.fishId ||
  catalog.entries[0]?.fishId;

async function uploadAudioBufferToR2(userId, buffer, contentType = "audio/mpeg") {
  const key = `inputs/${userId}/${Date.now()}-i2v-audio.mp3`;
  return uploadToR2(key, buffer, contentType);
}

function resolveFishReferenceId(meta) {
  const fromMeta = String(meta?.voice_fish_reference_id || "").trim();
  if (/^[a-f0-9]{32}$/i.test(fromMeta)) return fromMeta;
  return DEFAULT_CATALOG_FISH_ID;
}

/**
 * Prépare l’audio public pour kling/ai-avatar-pro (TTS ou piste muette).
 */
async function prepareI2VAvatarAudioUrl({ userId, meta }) {
  const voiceEnabled = meta?.voice_enabled === true;
  const voiceText = String(meta?.voice_text || "").trim();

  const referenceId = resolveFishReferenceId(meta);
  const voiceName = lookupCatalogEntryByFishId(referenceId)?.name ?? null;
  const ttsText =
    voiceEnabled && voiceText.length >= 5
      ? prepareVoiceTtsForFish(voiceText, { voiceName })
      : "…";
  const buffer = await synthesizeSpeech({
    text: ttsText,
    referenceId,
    format: "mp3",
  });
  return uploadAudioBufferToR2(userId, buffer);
}

module.exports = {
  prepareI2VAvatarAudioUrl,
  uploadAudioBufferToR2,
  DEFAULT_CATALOG_FISH_ID,
};
