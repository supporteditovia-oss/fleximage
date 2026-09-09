const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { readVideoApiCallCount } = require("./generate-video-once");

describe("generate-video-once", () => {
  it("readVideoApiCallCount defaults to 0", () => {
    assert.equal(readVideoApiCallCount({}), 0);
    assert.equal(readVideoApiCallCount({ video_api_call_count: 1 }), 1);
  });
});
