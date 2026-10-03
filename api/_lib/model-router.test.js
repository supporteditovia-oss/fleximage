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

  it("forces oneshot when multiple reference images (2-photo car swap)", async () => {
    process.env.ONESHOT_API_URL = "https://api.oneshot.example";
    process.env.ONESHOT_API_KEY = "key";
    process.env.ONESHOT_REMAINING_CREDITS = "999";
    process.env.DEEPINFRA_API_KEY = "di";

    const route = await resolveImageGenerationProvider(null, {
      isAdmin: true,
      adminImageProvider: "deepinfra",
      referenceImageCount: 2,
    });
    assert.equal(route.provider, "oneshot");
    assert.equal(route.reason, "multi_reference_requires_oneshot");
  });

  it("admin uses deepinfra by default (with or without photo refs)", async () => {
    process.env.ONESHOT_REMAINING_CREDITS = "999";
    process.env.DEEPINFRA_API_KEY = "di";

    const textOnly = await resolveImageGenerationProvider(null, {
      isAdmin: true,
      hasReferenceImages: false,
    });
    assert.equal(textOnly.provider, "deepinfra");

    const withRefs = await resolveImageGenerationProvider(null, {
      isAdmin: true,
      hasReferenceImages: true,
    });
    assert.equal(withRefs.provider, "deepinfra");
  });

  it("admin can pick oneshot in settings", async () => {
    process.env.ONESHOT_API_URL = "https://api.oneshot.example";
    process.env.ONESHOT_API_KEY = "key";
    process.env.ONESHOT_REMAINING_CREDITS = "999";
    process.env.DEEPINFRA_API_KEY = "di";

    const route = await resolveImageGenerationProvider(null, {
      isAdmin: true,
      adminImageProvider: "oneshot",
      hasReferenceImages: true,
    });
    assert.equal(route.provider, "oneshot");
    assert.equal(route.reason, "admin_settings_oneshot");
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

  it("fallback deepinfra when oneshot exhausted with single ref only", async () => {
    process.env.ONESHOT_REMAINING_CREDITS = "0";
    process.env.DEEPINFRA_API_KEY = "di";

    const route = await resolveImageGenerationProvider(null, {
      hasReferenceImages: true,
      referenceImageCount: 1,
    });
    assert.equal(route.provider, "deepinfra");
  });

  it("throws when multi-ref and oneshot credits exhausted", async () => {
    process.env.ONESHOT_API_URL = "https://api.oneshot.example";
    process.env.ONESHOT_API_KEY = "key";
    process.env.ONESHOT_REMAINING_CREDITS = "0";
    process.env.DEEPINFRA_API_KEY = "di";

    await assert.rejects(
      () =>
        resolveImageGenerationProvider(null, {
          referenceImageCount: 2,
        }),
      /Plusieurs photos de référence/,
    );
  });

  it("admin oneshot setting falls back to deepinfra when credits are 0", async () => {
    process.env.ONESHOT_API_URL = "https://api.oneshot.example";
    process.env.ONESHOT_API_KEY = "key";
    process.env.ONESHOT_REMAINING_CREDITS = "0";
    process.env.DEEPINFRA_API_KEY = "di";

    const route = await resolveImageGenerationProvider(null, {
      isAdmin: true,
      adminImageProvider: "oneshot",
      hasReferenceImages: true,
    });
    assert.equal(route.provider, "deepinfra");
    assert.equal(route.reason, "admin_oneshot_exhausted_deepinfra");
  });
});
