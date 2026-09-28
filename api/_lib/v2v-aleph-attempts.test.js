const test = require("node:test");
const assert = require("node:assert/strict");
const {
  countAlephJobsInProviderTaskId,
  canLaunchAnotherAlephJob,
  MAX_ALEPH_JOBS_PER_V2V,
} = require("./v2v-aleph-attempts");

test("compte les jobs aleph dans la chaîne provider_task_id", () => {
  assert.equal(
    countAlephJobsInProviderTaskId(
      "pending_x,aleph_a,aleph_b,kling_c,aleph_d",
    ),
    3,
  );
});

test("cap relance aleph", () => {
  const chain = ["pending_x"];
  for (let i = 0; i < MAX_ALEPH_JOBS_PER_V2V; i++) {
    chain.push(`aleph_${i}`);
  }
  assert.equal(canLaunchAnotherAlephJob(chain.join(",")), false);
});
