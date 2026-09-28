const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  readVideoApiCallCount,
  appendProviderTaskId,
} = require("./generate-video-once");

describe("generate-video-once", () => {
  it("readVideoApiCallCount defaults to 0", () => {
    assert.equal(readVideoApiCallCount({}), 0);
    assert.equal(readVideoApiCallCount({ video_api_call_count: 1 }), 1);
  });

  describe("appendProviderTaskId", () => {
    it("keeps the original pending_<uuid> when the provider task id is assigned", () => {
      const result = appendProviderTaskId(
        "pending_491fc727-ae96-4eb8-af8b-6f7dccbaf9d0",
        "aleph_9f8e7a2b",
      );
      assert.equal(
        result,
        "pending_491fc727-ae96-4eb8-af8b-6f7dccbaf9d0,aleph_9f8e7a2b",
      );
      // Regression guard: the client polls GET /status with the ORIGINAL
      // pending_<uuid> forever — it must remain a matchable segment.
      assert.ok(result.split(",").includes("pending_491fc727-ae96-4eb8-af8b-6f7dccbaf9d0"));
    });

    it("handles the Kling→Aleph / Aleph→Kling provider-fallback retry chain", () => {
      const afterKling = appendProviderTaskId(
        "pending_abc",
        "kling_111",
      );
      assert.equal(afterKling, "pending_abc,kling_111");
      // Fallback to Aleph after a Kling character rejection — chain keeps growing.
      const afterFallback = appendProviderTaskId(afterKling, "aleph_222");
      assert.equal(afterFallback, "pending_abc,kling_111,aleph_222");
    });

    it("does not duplicate an id that is already present", () => {
      assert.equal(
        appendProviderTaskId("pending_x,aleph_y", "aleph_y"),
        "pending_x,aleph_y",
      );
    });

    it("falls back to the new id alone when there is no previous id", () => {
      assert.equal(appendProviderTaskId("", "aleph_y"), "aleph_y");
      assert.equal(appendProviderTaskId(null, "aleph_y"), "aleph_y");
    });
  });
});
