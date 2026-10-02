const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  wrapPromptForDualReferenceComposite,
  DUAL_REF_COMPOSITE_PROMPT_PREFIX,
} = require("./dual-reference-composite");

describe("dual-reference-composite", () => {
  it("wraps user prompt with sheet instructions", () => {
    const out = wrapPromptForDualReferenceComposite("Swap RS3");
    assert.ok(out.startsWith(DUAL_REF_COMPOSITE_PROMPT_PREFIX.slice(0, 40)));
    assert.ok(out.includes("Swap RS3"));
  });
});
