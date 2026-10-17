async function applyVoiceCloneWarmthPostprocess(inputBuffer) {
  if (!inputBuffer?.length) {
    throw Object.assign(new Error("Audio vide"), {
      status: 400,
      code: "empty_audio",
    });
  }

  return inputBuffer;
}

module.exports = {
  applyVoiceCloneWarmthPostprocess,
};
