const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  convertVoiceSampleToWav,
  getCanonicalWavDurationSec,
  isCanonicalMonoWav,
} = require("./voice-sample-wav");
const { buildTtsOptions } = require("./fish-audio");

function buildPcmWav({
  durationSec = 1,
  sampleRate = 48000,
  channels = 2,
} = {}) {
  const frameCount = durationSec * sampleRate;
  const dataSize = frameCount * channels * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * 2, 28);
  buffer.writeUInt16LE(channels * 2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < frameCount; i += 1) {
    const value = Math.round(
      Math.sin((2 * Math.PI * 220 * i) / sampleRate) * 8000,
    );
    for (let channel = 0; channel < channels; channel += 1) {
      buffer.writeInt16LE(value, 44 + (i * channels + channel) * 2);
    }
  }
  return buffer;
}

describe("voice sample WAV conversion", () => {
  it("converts input to mono 44.1 kHz PCM WAV and measures its duration", async () => {
    const wav = await convertVoiceSampleToWav(buildPcmWav(), "audio/wav");
    assert.equal(isCanonicalMonoWav(wav), true);
    assert.equal(getCanonicalWavDurationSec(wav), 1);
  });

  it("rejects invalid audio instead of passing the original bytes through", async () => {
    await assert.rejects(
      convertVoiceSampleToWav(Buffer.from("not an audio sample"), "audio/webm"),
      { code: "invalid_voice_audio" },
    );
  });

  it("rejects audio longer than 90 seconds", async () => {
    await assert.rejects(
      convertVoiceSampleToWav(
        buildPcmWav({ durationSec: 90.5 }),
        "audio/wav",
      ),
      { code: "invalid_voice_audio" },
    );
  });

  it("conditions long clone synthesis on previous chunks", () => {
    const options = buildTtsOptions(
      "Cette phrase de test dépasse deux cents caractères afin de vérifier le conditionnement entre les segments du texte long. " +
        "On ajoute une seconde phrase pour couvrir le comportement sur plusieurs segments générés.",
      { cloneFidelity: true },
    );
    assert.equal(options.condition_on_previous_chunks, true);
  });
});
