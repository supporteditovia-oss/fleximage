const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  countOmniJobsInProviderTaskId,
  canLaunchAnotherOmniJob,
} = require("./v2v-poll-omni-relaunch");

test("countOmniJobsInProviderTaskId counts only omni_ segments", () => {
  assert.equal(
    countOmniJobsInProviderTaskId("pending_1,kling_a,aleph_b,omni_c"),
    1,
  );
  assert.equal(countOmniJobsInProviderTaskId(""), 0);
});

test("canLaunchAnotherOmniJob caps at two Omni jobs per generation", () => {
  assert.equal(canLaunchAnotherOmniJob("pending_1,kling_a"), true);
  assert.equal(canLaunchAnotherOmniJob("pending_1,omni_a"), true);
  assert.equal(canLaunchAnotherOmniJob("pending_1,omni_a,omni_b"), false);
});
