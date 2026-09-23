const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  resolveImageGenerationProvider,
  getOneshotRemainingCredits,
} = require("./model-router");

describe("model-router", () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it("prefers oneshot when configured and credits > 0", async () => {
    process.env.ONESHOT_API_URL = "https://api.oneshot.example";
    process.env.ONESHOT_API_KEY = "key";
    process.env.ONESHOT_REMAINING_CREDITS = "10";
    process.env.DEEPINFRA_API_KEY = "di";

    const route = await resolveImageGenerationProvider(null, {
      hasReferenceImages: false,
    });
    assert.equal(route.provider, "oneshot");
  });

  it("uses deepinfra when oneshot credits are 0", async () => {
    process.env.ONESHOT_API_URL = "https://api.oneshot.example";
    process.env.ONESHOT_API_KEY = "key";
    process.env.ONESHOT_REMAINING_CREDITS = "0";
    process.env.DEEPINFRA_API_KEY = "di";

    const route = await resolveImageGenerationProvider(null, {
      hasReferenceImages: false,
    });
    assert.equal(route.provider, "deepinfra");
    assert.equal(route.remainingCredits, 0);
  });

  it("getOneshotRemainingCredits reads env", async () => {
    process.env.ONESHOT_REMAINING_CREDITS = "427";
    const n = await getOneshotRemainingCredits(null);
    assert.equal(n, 427);
  });
});
