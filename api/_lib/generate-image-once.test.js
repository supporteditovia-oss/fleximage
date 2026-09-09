const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  extractOneshotExternalTaskId,
  claimProviderApiCall,
} = require("./generate-image-once");

describe("generate-image-once helpers", () => {
  it("extractOneshotExternalTaskId returns the last custom_ task id", () => {
    assert.equal(
      extractOneshotExternalTaskId("pending_x,custom_abc123"),
      "custom_abc123",
    );
    assert.equal(extractOneshotExternalTaskId("custom_only"), "custom_only");
  });

  it("claimProviderApiCall rejects when api_call_count is already 1", async () => {
    const supabase = {
      from() {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          single: async () => ({
            data: {
              id: "gen-1",
              user_id: "user-1",
              provider_task_id: "custom_job-1",
              metadata: { api_call_count: 1 },
              provider_attempts: [{ jobId: "job-1" }],
            },
            error: null,
          }),
        };
      },
    };

    const claim = await claimProviderApiCall(supabase, "gen-1");
    assert.equal(claim.allowed, false);
    assert.equal(claim.apiCallCount, 1);
    assert.equal(claim.existingTaskId, "custom_job-1");
  });
});
