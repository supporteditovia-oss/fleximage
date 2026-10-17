import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LANDING_VIDEO_SHOWCASE_ASSETS } from "./landing-video-showcase";

describe("landing video showcase media order", () => {
  it("keeps the restaurant photo and generated eating video in workshop 01", () => {
    const [workshop] = LANDING_VIDEO_SHOWCASE_ASSETS;

    assert.equal(workshop.id, "i2v");
    assert.equal(
      workshop.beforePoster,
      "/assets/landing-v2/restaurant-before.webp",
    );
    assert.equal(workshop.beforeVideo, null);
    assert.equal(workshop.beforeStaticTag, "Photo");
    assert.equal(
      workshop.afterVideo,
      "/assets/landing-v2/restaurant-after.mp4",
    );
  });

  it("keeps the Mercedes source before the transformed Lamborghini video", () => {
    const workshop = LANDING_VIDEO_SHOWCASE_ASSETS[1];

    assert.equal(workshop.id, "v2v");
    assert.equal(
      workshop.beforeVideo,
      "/assets/landing-v2/mercedes-before.mp4",
    );
    assert.equal(
      workshop.afterVideo,
      "/assets/landing-v2/lamborghini-after.mp4",
    );
  });
});
