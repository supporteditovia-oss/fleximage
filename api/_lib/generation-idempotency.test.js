const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeGenerationRequestId,
  readApiCallCount,
  buildIdempotentGenerateResponse,
} = require("./generation-idempotency");

describe("generation-idempotency", () => {
  it("accepts valid UUID generation request ids", () => {
    const id = "a1b2c3d4-e5f6-4789-a012-3456789abcde";
    assert.equal(normalizeGenerationRequestId(id), id);
  });

  it("rejects invalid generation request ids", () => {
    assert.equal(normalizeGenerationRequestId(""), null);
    assert.equal(normalizeGenerationRequestId("not-a-uuid"), null);
    assert.equal(normalizeGenerationRequestId(null), null);
  });

  it("reads api_call_count from metadata", () => {
    assert.equal(readApiCallCount({ api_call_count: 1 }), 1);
    assert.equal(readApiCallCount({}), 0);
    assert.equal(readApiCallCount(null), 0);
  });

  it("buildIdempotentGenerateResponse marks deduplicated responses", () => {
    const response = buildIdempotentGenerateResponse({
      id: "gen-1",
      provider_task_id: "pending_x,custom_abc123",
      status: "processing",
      created_at: "2026-09-09T02:32:00.000Z",
      metadata: {
        estimated_seconds: 45,
        generation_request_id: "a1b2c3d4-e5f6-4789-a012-3456789abcde",
        api_call_count: 1,
      },
    });
    assert.equal(response.deduplicated, true);
    assert.equal(response.taskId, "custom_abc123");
    assert.equal(response.apiCallCount, 1);
  });
});
