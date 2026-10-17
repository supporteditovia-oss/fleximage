import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LANDING_VIDEO_SHOWCASES } from "./landing-video-showcase";

describe("landing video showcase media order", () => {
  it("keeps the restaurant photo and generated eating video in workshop 01", () => {
    const [workshop] = LANDING_VIDEO_SHOWCASES;

    assert.equal(workshop.id, "i2v");
    assert.equal(workshop.before.poster, "/assets/landing-v2/restaurant-before.webp");
    assert.equal(workshop.before.video, null);
    assert.equal(workshop.before.staticTag, "Photo");
    assert.equal(
      workshop.after.video,
      "/assets/landing-v2/restaurant-after.mp4",
    );
  });

  it("keeps the Mercedes source before the transformed Lamborghini video", () => {
    const workshop = LANDING_VIDEO_SHOWCASES[1];

    assert.equal(workshop.id, "v2v");
    assert.equal(
      workshop.before.video,
      "/assets/landing-v2/mercedes-before.mp4",
    );
    assert.equal(
      workshop.after.video,
      "/assets/landing-v2/lamborghini-after.mp4",
    );
  });
});
