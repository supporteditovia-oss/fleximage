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

test("filtres ambiance — pas de SFX synthétiques ; voix brute préservée", () => {
  assert.match(SOURCE_AMBIENT_AF, /highpass=f=180/);
  assert.match(SOURCE_AMBIENT_AF, /lowpass=f=9000/);
  assert.doesNotMatch(SOURCE_AMBIENT_AF, /aecho=/);
  // Correctif 2026-10-18 : le post-traitement voix (EQ + compresseur) est
  // désactivé — la voix du catalogue doit arriver intacte en vidéo finale.
  assert.equal(GENERATED_VOICE_AF, "");
});
