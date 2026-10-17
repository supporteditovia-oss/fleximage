const { describe, it, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  resolveImageGenerationProvider,
  isOneshotCreditsExhaustedError,
} = require("./model-router");

describe("model-router", () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it("routes text-only generation to OneShot even when DeepInfra is configured and tracking says zero", async () => {
    process.env.ONESHOT_API_URL = "https://api.oneshot.example";
    process.env.ONESHOT_API_KEY = "key";
    process.env.DEEPINFRA_API_KEY = "di";
    process.env.ONESHOT_REMAINING_CREDITS = "0";

    const route = await resolveImageGenerationProvider(null, {
      isAdmin: true,
      adminImageProvider: "deepinfra",
    });
    assert.equal(route.provider, "oneshot");
  });

  it("routes multiple reference images to OneShot", async () => {
    process.env.ONESHOT_API_URL = "https://api.oneshot.example";
    process.env.ONESHOT_API_KEY = "key";
    process.env.DEEPINFRA_API_KEY = "di";
    process.env.ONESHOT_REMAINING_CREDITS = "0";

    const route = await resolveImageGenerationProvider(null, {
      referenceImageCount: 4,
    });
    assert.equal(route.provider, "oneshot");
  });

  it("requires OneShot configuration regardless of DeepInfra configuration", async () => {
    delete process.env.ONESHOT_API_URL;
    delete process.env.ONESHOT_API_KEY;
    process.env.DEEPINFRA_API_KEY = "di";

    await assert.rejects(
      () => resolveImageGenerationProvider(null),
      { code: "ONESHOT_NOT_CONFIGURED" },
    );
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
});
