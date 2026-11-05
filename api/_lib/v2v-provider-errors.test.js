const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  isKlingCharacterRejection,
  isRetryableAlephError,
  isRetryableKlingError,
  isRetryableProviderFailText,
  motionKlingClientFailOptions,
  isMotionKlingPollExhausted,
} = require("./v2v-provider-errors");

test("isKlingCharacterRejection", () => {
  assert.equal(
    isKlingCharacterRejection({
      apiMsg: "No valid characters detected in the video",
    }),
    true,
  );
});

test("isRetryableKlingError", () => {
  assert.equal(
    isRetryableKlingError({ apiMsg: "internal error, please try again later." }),
    true,
  );
});

test("isRetryableAlephError", () => {
  assert.equal(
    isRetryableAlephError({ apiMsg: "internal error, please try again later." }),
    true,
  );
});

test("isRetryableProviderFailText", () => {
  assert.equal(
    isRetryableProviderFailText("internal error, please try again later."),
    true,
  );
  assert.equal(isRetryableProviderFailText("No valid characters detected"), false);
});

test("motionKlingClientFailOptions — exhausted only after retries", () => {
  const early = motionKlingClientFailOptions(
    { video_auto_retries: 1, v2v_intent: "motion" },
    { motionStudioJob: true },
  );
  assert.equal(early.v2vExhausted, false);
  assert.equal(early.afterAlephFallback, false);
  const late = motionKlingClientFailOptions(
    { video_auto_retries: 5, v2v_intent: "motion" },
    { motionStudioJob: true },
  );
  assert.equal(late.v2vExhausted, true);
  assert.equal(isMotionKlingPollExhausted({ video_auto_retries: 5 }), true);
});
