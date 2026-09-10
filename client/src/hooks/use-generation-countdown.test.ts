import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeGenerationRemaining,
} from "./use-generation-countdown";

describe("use-generation-countdown helpers", () => {
  it("computeGenerationRemaining decreases over time", () => {
    const start = 1_000_000;
    assert.equal(computeGenerationRemaining(start, 50, start + 0), 50);
    assert.equal(computeGenerationRemaining(start, 50, start + 10_000), 40);
    assert.equal(computeGenerationRemaining(start, 50, start + 50_000), 0);
  });

  it("computeGenerationRemaining never goes negative", () => {
    const start = 1_000_000;
    assert.equal(computeGenerationRemaining(start, 50, start + 120_000), 0);
  });
});
