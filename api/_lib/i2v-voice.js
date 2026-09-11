const { synthesizeSpeech } = require("./fish-audio");
const {
  pickVoiceReferenceId,
  resolveVoiceCategoryFromProfile,
} = require("./v2v-voice-pool");
const {
  analyzeVoiceProfileFromImage,
  inferVoiceLineFromPrompt,
} = require("./voice-profile");
const { muxSpeechMp3OntoVideo, isFishConfigured } = require("./v2v-voice-transform");

/**
 * Voix I2V adaptée à la photo : genre + âge (enfant/adulte) + réplique déduite du prompt.
 */
async function applyI2vAdaptiveVoiceAndMux({
  generatedVideoUrl,
  larpId,
  sourceImageUrl,
  motionPrompt,
  voiceText,
}) {
  if (!isFishConfigured()) {
    console.warn("[i2v-voice] Fish Audio non configuré");
    return null;
  }
  if (!generatedVideoUrl || !larpId || !sourceImageUrl) return null;

  const profile = await analyzeVoiceProfileFromImage({
    imageUrl: sourceImageUrl,
    motionPrompt,
  });
  const voiceCategory = resolveVoiceCategoryFromProfile(profile);
  const fishReferenceId = pickVoiceReferenceId(voiceCategory, larpId);
  if (!fishReferenceId) {
    console.warn("[i2v-voice] pool vocal vide", { voiceCategory, larpId });
    return null;
  }

  const line = inferVoiceLineFromPrompt(motionPrompt, voiceText);
  const mp3Buffer = await synthesizeSpeech({
    text: line,
    referenceId: fishReferenceId,
    format: "mp3",
  });

  const url = await muxSpeechMp3OntoVideo({
    generatedVideoUrl,
    larpId,
    mp3Buffer,
  });
  if (!url) return null;

  return {
    url,
    voiceCategory,
    fishReferenceId,
    voiceLine: line,
    profile,
  };
}

module.exports = {
  applyI2vAdaptiveVoiceAndMux,
};
