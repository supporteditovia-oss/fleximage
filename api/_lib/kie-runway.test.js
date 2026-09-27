const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeRunwayExtendQuality,
  extractRunwayTaskIdFromGeneration,
} = require("./kie-runway");

test("normalizeRunwayExtendQuality", () => {
  assert.equal(normalizeRunwayExtendQuality("high"), "1080p");
  assert.equal(normalizeRunwayExtendQuality("1080p"), "1080p");
  assert.equal(normalizeRunwayExtendQuality("standard"), "720p");
  assert.equal(normalizeRunwayExtendQuality(undefined), "720p");
});

test("extractRunwayTaskIdFromGeneration", () => {
  assert.equal(
    extractRunwayTaskIdFromGeneration({
      provider_task_id: "video_abc-123",
      metadata: {},
    }),
    "abc-123",
  );
  assert.equal(
    extractRunwayTaskIdFromGeneration({
      provider_task_id: "video_abc-123",
      metadata: { runway_task_id: "from-meta" },
    }),
    "from-meta",
  );
  assert.equal(
    extractRunwayTaskIdFromGeneration({
      provider_task_id: "kling_x",
      metadata: {},
    }),
    null,
  );
});
