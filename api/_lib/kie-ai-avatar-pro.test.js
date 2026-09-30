const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

describe("kie-ai-avatar-pro", () => {
  it("createAiAvatarProTask sends kling/ai-avatar-pro model", async () => {
    const originalFetch = global.fetch;
    let capturedBody = null;
    global.fetch = async (_url, init) => {
      capturedBody = JSON.parse(init.body);
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({ code: 200, msg: "success", data: { taskId: "t1" } }),
      };
    };
    process.env.KIE_AI_API_KEY = "test-key";

    const { createAiAvatarProTask } = require("./kie-ai-avatar-pro");
    const result = await createAiAvatarProTask({
      imageUrl: "https://example.com/a.jpg",
      audioUrl: "https://example.com/a.mp3",
      prompt: "Slow cinematic motion",
    });

    assert.equal(result.taskId, "t1");
    assert.equal(capturedBody.model, "kling/ai-avatar-pro");
    assert.equal(capturedBody.input.image_url, "https://example.com/a.jpg");
    assert.equal(capturedBody.input.audio_url, "https://example.com/a.mp3");

    global.fetch = originalFetch;
  });
});
