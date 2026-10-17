const {
  resolveI2VOutputSpecFromMeta,
  isValidI2VOutputSpec,
  i2vOutputHeightForQuality,
} = require("./i2v-output-enforce");

describe("i2v-output-enforce", () => {
  it("resolveI2VOutputSpecFromMeta maps quality to height", () => {
    expect(
      resolveI2VOutputSpecFromMeta({
        workflow: "image_to_video",
        duration_sec: 3,
        quality: "standard",
      }),
    ).toEqual({ durationSec: 3, height: 720, quality: "standard" });
    expect(
      resolveI2VOutputSpecFromMeta({
        duration_sec: 5,
        quality: "high",
      }),
    ).toEqual({ durationSec: 5, height: 1080, quality: "high" });
  });

  it("isValidI2VOutputSpec accepts the billing grid only", () => {
    expect(isValidI2VOutputSpec({ durationSec: 3, height: 720 })).toBe(true);
    expect(isValidI2VOutputSpec({ durationSec: 5, height: 1080 })).toBe(true);
    expect(isValidI2VOutputSpec({ durationSec: 4, height: 720 })).toBe(false);
    expect(isValidI2VOutputSpec({ durationSec: 3, height: 480 })).toBe(false);
  });

  it("i2vOutputHeightForQuality", () => {
    expect(i2vOutputHeightForQuality("high")).toBe(1080);
    expect(i2vOutputHeightForQuality("standard")).toBe(720);
  });
});
