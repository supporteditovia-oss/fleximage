import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  VIDEO_I2V_RANDOM_PROMPTS,
  VIDEO_V2V_MOTION_RANDOM_PROMPTS,
  VIDEO_V2V_SCENE_RANDOM_PROMPTS,
  videoRandomPromptPool,
} from "./video-studio-prompt-pools.js";

describe("videoRandomPromptPool", () => {
  it("sépare Image→Vidéo, Mouvement et Scène & luxe", () => {
    const i2v = videoRandomPromptPool("image_to_video", "scene");
    const motion = videoRandomPromptPool("video_to_video", "motion");
    const scene = videoRandomPromptPool("video_to_video", "scene");

    assert.deepEqual(i2v, VIDEO_I2V_RANDOM_PROMPTS);
    assert.deepEqual(motion, VIDEO_V2V_MOTION_RANDOM_PROMPTS);
    assert.deepEqual(scene, VIDEO_V2V_SCENE_RANDOM_PROMPTS);

    for (const prompt of motion) {
      assert.ok(!scene.includes(prompt), "prompt mouvement absent du pool scène");
    }
  });

  it("ignore v2vIntent pour Image→Vidéo", () => {
    assert.deepEqual(
      videoRandomPromptPool("image_to_video", "motion"),
      VIDEO_I2V_RANDOM_PROMPTS,
    );
  });
});
