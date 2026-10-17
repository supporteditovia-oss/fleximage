const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  shouldApplyVideoDeliveryAudioMix,
  SOURCE_AMBIENT_AF,
  GENERATED_VOICE_AF,
} = require("./video-delivery-audio");

test("shouldApplyVideoDeliveryAudioMix — voix, lip-sync ou preserve", () => {
  assert.equal(shouldApplyVideoDeliveryAudioMix({ voice_enabled: true }), true);
  assert.equal(shouldApplyVideoDeliveryAudioMix({ lip_sync_enabled: true }), true);
  assert.equal(
    shouldApplyVideoDeliveryAudioMix({ preserve_source_audio: true }),
    true,
  );
  assert.equal(shouldApplyVideoDeliveryAudioMix({}), false);
});

test("filtres ambiance et voix — pas de SFX synthétiques", () => {
  assert.match(SOURCE_AMBIENT_AF, /highpass=f=180/);
  assert.match(SOURCE_AMBIENT_AF, /lowpass=f=9000/);
  assert.doesNotMatch(SOURCE_AMBIENT_AF, /aecho=/);
  assert.match(GENERATED_VOICE_AF, /equalizer=f=3800/);
});
