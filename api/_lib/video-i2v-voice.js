const { synthesizeSpeech } = require("./fish-audio");
const { muxAudioBufferOntoVideo } = require("./mux-source-audio");

async function applyI2VGeneratedVoice({
  larpId,
  generatedVideoUrl,
  voiceText,
  fishReferenceId,
}) {
  const text = String(voiceText || "").trim();
  const referenceId = String(fishReferenceId || "").trim();
  if (!text || !referenceId || !generatedVideoUrl || !larpId) return null;

  try {
    const audioBuffer = await synthesizeSpeech({
      text,
      referenceId,
      format: "mp3",
    });
    return await muxAudioBufferOntoVideo({
      generatedVideoUrl,
      audioBuffer,
      larpId,
      audioExt: "mp3",
    });
  } catch (err) {
    console.error("[video-i2v-voice] apply failed", {
      larpId,
      message: err?.message || err,
    });
    return null;
  }
}

module.exports = {
  applyI2VGeneratedVoice,
};
