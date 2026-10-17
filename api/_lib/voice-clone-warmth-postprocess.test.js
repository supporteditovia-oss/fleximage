const { test } = require("node:test");
const assert = require("node:assert/strict");
const { applyVoiceCloneWarmthPostprocess } = require("./voice-clone-warmth-postprocess");

test("clone postprocess returns original MP3 without filtering or re-encoding", async () => {
  const originalMp3 = Buffer.from([0x49, 0x44, 0x33, 0x01, 0x02]);
  const result = await applyVoiceCloneWarmthPostprocess(originalMp3, {
    deepChest: true,
    identityInline: true,
  });

  assert.strictEqual(result, originalMp3);
});

test("clone postprocess rejects empty audio", async () => {
  await assert.rejects(
    applyVoiceCloneWarmthPostprocess(Buffer.alloc(0)),
    { code: "empty_audio" },
  );
});

test("clone postprocess preserves existing Uint8Array inputs", async () => {
  const audio = new Uint8Array([0x49, 0x44, 0x33]);
  assert.strictEqual(await applyVoiceCloneWarmthPostprocess(audio), audio);
});
