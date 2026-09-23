const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  assertVideoPlanQuota,
  assertVoiceClonePlanQuota,
} = require("./plan-usage-limits");

describe("plan-usage-limits", () => {
  it("blocks V2V on discovery plan", () => {
    const snap = {
      planType: "discovery",
      quotas: { i2vClips: 1, v2vClips: 0, voiceClones: 0 },
      used: { i2vClips: 0, v2vClips: 0, voiceClones: 0 },
    };
    const r = assertVideoPlanQuota(snap, "video_to_video", "fr");
    assert.equal(r.ok, false);
    assert.equal(r.code, "PLAN_V2V_NOT_INCLUDED");
  });

  it("allows V2V within ultimate quota", () => {
    const snap = {
      planType: "ultimate",
      quotas: { i2vClips: 10, v2vClips: 5, voiceClones: 3 },
      used: { i2vClips: 2, v2vClips: 4, voiceClones: 1 },
    };
    const r = assertVideoPlanQuota(snap, "video_to_video", "fr");
    assert.equal(r.ok, true);
  });

  it("blocks clone on discovery", () => {
    const snap = {
      planType: "discovery",
      quotas: { i2vClips: 1, v2vClips: 0, voiceClones: 0 },
      used: { i2vClips: 0, v2vClips: 0, voiceClones: 0 },
    };
    const r = assertVoiceClonePlanQuota(snap, "fr");
    assert.equal(r.ok, false);
  });
});
