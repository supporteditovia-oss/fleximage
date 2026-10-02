const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

describe("kie-kling-omni-ref2v", () => {
  it("createKlingOmniRef2VTask sends reference-to-video model", async () => {
    const originalFetch = global.fetch;
    let capturedBody = null;
    global.fetch = async (_url, init) => {
      capturedBody = JSON.parse(init.body);
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({ code: 200, msg: "success", data: { taskId: "omni1" } }),
      };
    };
    process.env.KIE_AI_API_KEY = "test-key";

    const { createKlingOmniRef2VTask } = require("./kie-kling-omni-ref2v");
    const result = await createKlingOmniRef2VTask({
      videoUrl: "https://example.com/v.mp4",
      prompt: "Luxury Dubai night",
      durationSec: 5,
      resolution: "1080p",
    });

    assert.equal(result.taskId, "omni1");
    assert.equal(capturedBody.model, "kling-3.0-omni/reference-to-video");
    assert.deepEqual(capturedBody.input.video_urls, [
      "https://example.com/v.mp4",
    ]);
    assert.equal("duration" in capturedBody.input, false);
    assert.equal(capturedBody.input.resolution, "1080p");
    assert.equal(capturedBody.input.audio, false);
    assert.match(capturedBody.input.prompt, /@Video1/i);

    global.fetch = originalFetch;
  });
});
