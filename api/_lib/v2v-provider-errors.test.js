const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  isKlingCharacterRejection,
  isRetryableAlephError,
  isRetryableKlingError,
  isRetryableProviderFailText,
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
