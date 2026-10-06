const { test } = require("node:test");
const assert = require("node:assert/strict");
const { heuristicMotionSubjectLock } = require("./motion-subject-prompt");

test("heuristicMotionSubjectLock forbids face-swap", () => {
  const lock = heuristicMotionSubjectLock("Remplace le danseur par ma photo torse nu");
  assert.match(lock, /FULL BODY/i);
  assert.match(lock, /FORBIDDEN.*face-swap/i);
  assert.match(lock, /shirtless/i);
});
