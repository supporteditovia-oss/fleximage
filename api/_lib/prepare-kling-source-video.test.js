const test = require("node:test");
const assert = require("node:assert/strict");
const { KLING_READY_SUFFIX } = require("./prepare-kling-source-video");

test("KLING_READY_SUFFIX marks server-normalized MP4 URLs", () => {
  const url = `https://cdn.example/inputs/u/123${KLING_READY_SUFFIX}`;
  assert.match(url, /motion-ready\.mp4$/);
});
