const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  resolveImageGenerationProvider,
  getOneshotRemainingCredits,
  isOneshotCreditsExhaustedError,
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

  it("routes multi-ref to Kie when oneshot credits are 0", async () => {
    process.env.ONESHOT_API_URL = "https://api.oneshot.example";
    process.env.ONESHOT_API_KEY = "key";
    process.env.ONESHOT_REMAINING_CREDITS = "0";
    process.env.DEEPINFRA_API_KEY = "di";
    process.env.KIE_AI_API_KEY = "kie";

    const route = await resolveImageGenerationProvider(null, {
      hasReferenceImages: true,
    });
    assert.equal(route.provider, "kie");
  });

  it("detects OneShot provider credit exhaustion", () => {
    assert.equal(
      isOneshotCreditsExhaustedError({
        status: 402,
        message: "Insufficient credits",
      }),
      true,
    );
    assert.equal(
      isOneshotCreditsExhaustedError(new Error("network timeout")),
      false,
    );
  });

  it("force_kie_ai with refs routes to Kie not DeepInfra", async () => {
    process.env.DEEPINFRA_API_KEY = "di";
    process.env.KIE_AI_API_KEY = "kie";

    const route = await resolveImageGenerationProvider(null, {
      forceKieAi: true,
      hasReferenceImages: true,
    });
    assert.equal(route.provider, "kie");
    assert.equal(route.reason, "force_kie_ai_refs");
  });

  it("rejects multi-ref when credits 0 and Kie missing", async () => {
    process.env.ONESHOT_API_URL = "https://api.oneshot.example";
    process.env.ONESHOT_API_KEY = "key";
    process.env.ONESHOT_REMAINING_CREDITS = "0";
    process.env.DEEPINFRA_API_KEY = "di";
    delete process.env.KIE_AI_API_KEY;

    await assert.rejects(
      () =>
        resolveImageGenerationProvider(null, { hasReferenceImages: true }),
      /KIE_AI_API_KEY/,
    );
  });
});
