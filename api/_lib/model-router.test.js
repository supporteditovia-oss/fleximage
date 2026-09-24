const { describe, it, afterEach } = require("node:test");
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

  it("admin always uses deepinfra (with or without photo refs)", async () => {
    process.env.ONESHOT_REMAINING_CREDITS = "999";
    process.env.DEEPINFRA_API_KEY = "di";

    const textOnly = await resolveImageGenerationProvider(null, {
      adminPreferDeepInfra: true,
      hasReferenceImages: false,
    });
    assert.equal(textOnly.provider, "deepinfra");

    const withRefs = await resolveImageGenerationProvider(null, {
      adminPreferDeepInfra: true,
      hasReferenceImages: true,
    });
    assert.equal(withRefs.provider, "deepinfra");
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

  it("clients ignore forceKieAi and stay on oneshot", async () => {
    process.env.ONESHOT_API_URL = "https://api.oneshot.example";
    process.env.ONESHOT_API_KEY = "key";
    process.env.ONESHOT_REMAINING_CREDITS = "50";
    process.env.DEEPINFRA_API_KEY = "di";

    const route = await resolveImageGenerationProvider(null, {
      forceKieAi: true,
      hasReferenceImages: true,
    });
    assert.equal(route.provider, "oneshot");
  });

  it("fallback deepinfra when oneshot exhausted even with refs", async () => {
    process.env.ONESHOT_REMAINING_CREDITS = "0";
    process.env.DEEPINFRA_API_KEY = "di";

    const route = await resolveImageGenerationProvider(null, {
      hasReferenceImages: true,
    });
    assert.equal(route.provider, "deepinfra");
  });
});
