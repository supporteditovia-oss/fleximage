const { uploadToR2 } = require("./r2");
const { synthesizeSpeech } = require("./fish-audio");
const { prepareI2VVoiceTextForFish } = require("./i2v-voice-script");
const {
  fitAudioBufferToDurationSec,
  buildSilentMp3Buffer,
  isI2VAvatarPipelineV2Enabled,
} = require("./i2v-av-sync");
const { normalizeI2VDurationSec } = require("../../shared/video-i2v-pricing.cjs");
const {
  findI2VLibraryEntryById,
  resolveDefaultI2VLibraryVoiceId,
  resolveI2VLibraryFishId,
  resolveI2VTtsSpeed,
} = require("./i2v-voice-library");

function resolveDefaultFishReferenceId() {
  const defaultId = resolveDefaultI2VLibraryVoiceId();
  const entry = defaultId ? findI2VLibraryEntryById(defaultId) : null;
  return resolveI2VLibraryFishId(entry);
}

async function uploadAudioBufferToR2(userId, buffer, contentType = "audio/mpeg") {
  const key = `inputs/${userId}/${Date.now()}-i2v-audio.mp3`;
  return uploadToR2(key, buffer, contentType);
}

function resolveFishReferenceId(meta) {
  const fromMeta = String(meta?.voice_fish_reference_id || "").trim();
  if (/^[a-f0-9]{32}$/i.test(fromMeta)) return fromMeta;
  const libraryEntryId = String(meta?.i2v_library_entry_id || meta?.i2v_voice_id || "").trim();
  const entry = findI2VLibraryEntryById(libraryEntryId);
  const fromLibrary = resolveI2VLibraryFishId(entry);
  if (fromLibrary) return fromLibrary;
  return resolveDefaultFishReferenceId();
}

function resolveI2VSpeechOptions(meta) {
  const referenceId = resolveFishReferenceId(meta);
  const libraryEntryId =
    meta?.i2v_library_entry_id ||
    (meta?.voice_mode === "catalog" ? meta?.i2v_voice_id : null);
  const speed = resolveI2VTtsSpeed(referenceId, libraryEntryId);
  const cloneFidelity = meta?.voice_mode === "cloned";
  return { referenceId, speed, cloneFidelity };
}

function resolveI2VTargetDurationSec(meta) {
  const raw = meta?.duration_sec ?? meta?.i2v_target_duration_sec ?? 5;
  return normalizeI2VDurationSec(raw);
}

/** Comportement prod clients (main) — Fish brut, pas de calage durée. */
async function prepareI2VAvatarAudioUrlLegacy({ userId, meta }) {
  const voiceEnabled = meta?.voice_enabled === true;
  const voiceText = String(meta?.voice_text || "").trim();
  const { referenceId, speed, cloneFidelity } = resolveI2VSpeechOptions(meta);
  const ttsText =
    voiceEnabled && voiceText.length >= 5
      ? prepareI2VVoiceTextForFish(voiceText)
      : "…";
  const buffer = await synthesizeSpeech({
    text: ttsText,
    referenceId,
    format: "mp3",
    speed: speed ?? undefined,
    cloneFidelity,
  });
  const url = await uploadAudioBufferToR2(userId, buffer);
  return { url, targetSec: null, voiceEnabled, pipelineV2: false };
}

async function prepareI2VAvatarAudioUrlV2({ userId, meta }) {
  const voiceEnabled = meta?.voice_enabled === true;
  const voiceText = String(meta?.voice_text || "").trim();
  const targetSec = resolveI2VTargetDurationSec(meta);
  const { referenceId, speed, cloneFidelity } = resolveI2VSpeechOptions(meta);

  let buffer;
  if (voiceEnabled && voiceText.length >= 5) {
    const ttsText = prepareI2VVoiceTextForFish(voiceText);
    const rawBuffer = await synthesizeSpeech({
      text: ttsText,
      referenceId,
      format: "mp3",
      speed: speed ?? undefined,
      cloneFidelity,
    });
    buffer = await fitAudioBufferToDurationSec(rawBuffer, targetSec);
  } else {
    buffer = await buildSilentMp3Buffer(targetSec);
  }

  const url = await uploadAudioBufferToR2(userId, buffer);
  return { url, targetSec, voiceEnabled, pipelineV2: true };
}

/**
 * Prépare l’audio public pour kling/ai-avatar-pro (TTS ou piste muette).
 * Pipeline v2 (sync A/V) : admin uniquement via metadata i2v_avatar_pipeline_v2.
 */
async function prepareI2VAvatarAudioUrl({ userId, meta }) {
  const voiceEnabled = meta?.voice_enabled === true;
  const voiceText = String(meta?.voice_text || "").trim();
  const useV2 =
    isI2VAvatarPipelineV2Enabled(meta) ||
    voiceEnabled ||
    voiceText.length >= 5;
  if (useV2) {
    return prepareI2VAvatarAudioUrlV2({ userId, meta });
  }
  return prepareI2VAvatarAudioUrlLegacy({ userId, meta });
}

module.exports = {
  prepareI2VAvatarAudioUrl,
  prepareI2VAvatarAudioUrlLegacy,
  prepareI2VAvatarAudioUrlV2,
  uploadAudioBufferToR2,
  resolveI2VTargetDurationSec,
  resolveDefaultFishReferenceId,
};
