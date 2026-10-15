const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const path = require("path");
const os = require("os");
const {
  computeSfxStartSec,
  buildAudioFilterGraph,
  mixI2VAudioLayersOnMp4Buffer,
  AMBIENCE_VOLUME,
} = require("./i2v-audio-mix");
const { normalizeI2VSfx } = require("../../shared/i2v-sfx.cjs");

describe("i2v-audio-mix", () => {
  it("computeSfxStartSec — milieu par défaut", () => {
    assert.equal(computeSfxStartSec("middle", 10, 4), 3);
    assert.equal(computeSfxStartSec("start", 5, 2), 0);
    assert.equal(computeSfxStartSec("end", 5, 2), 3);
  });

  it("normalizeI2VSfx rejette les ids inconnus", () => {
    assert.equal(normalizeI2VSfx("explosion"), "explosion");
    assert.equal(normalizeI2VSfx("nope"), "none");
  });

  it("buildAudioFilterGraph — voix + rue + sfx avec sidechain", () => {
    const g = buildAudioFilterGraph({
      hasAmbience: true,
      hasSfx: true,
      videoSec: 5,
      sfxStartSec: 2,
      sfxPlaySec: 3,
      voiceSidechain: true,
    });
    assert.match(g, /volume=0\.25\[amb\]/);
    assert.match(g, /sidechaincompress/);
    assert.match(g, /amix=inputs=3/);
    assert.equal(AMBIENCE_VOLUME, 0.25);
  });

  it("sans SFX — filtre ambiance seule (2 entrées)", () => {
    const g = buildAudioFilterGraph({
      hasAmbience: true,
      hasSfx: false,
      videoSec: 5,
      sfxStartSec: 0,
      sfxPlaySec: 0,
      voiceSidechain: true,
    });
    assert.match(g, /amix=inputs=2/);
    assert.doesNotMatch(g, /sidechaincompress/);
  });

  it("mixI2VAudioLayersOnMp4Buffer sans layers → inchangé", async () => {
    const buf = Buffer.from("fake");
    const r = await mixI2VAudioLayersOnMp4Buffer(buf, {
      ambience: "none",
      sfx: "none",
    });
    assert.equal(r.mixed, false);
    assert.equal(r.buffer, buf);
  });
});

describe("i2v-audio-mix integration", () => {
  it("voix + rue + explosion — 3 pistes mixées", async () => {
    let ffmpegPath;
    try {
      ffmpegPath = require("ffmpeg-static");
    } catch {
      return;
    }
    if (!ffmpegPath) return;

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "i2v-sfx-it-"));
    const voicePath = path.join(tmpDir, "voice.mp3");
    const mp4Path = path.join(tmpDir, "clip.mp4");
    const street = path.join(
      process.cwd(),
      "client/public/assets/i2v-ambience/street.mp3",
    );
    const explosion = path.join(
      process.cwd(),
      "client/public/assets/i2v-sfx/explosion.mp3",
    );

    try {
      await fs.access(street);
      await fs.access(explosion);
    } catch {
      return;
    }

    const { execFile } = require("child_process");
    const { promisify } = require("util");
    const exec = promisify(execFile);

    await exec(ffmpegPath, [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=440:duration=4",
      "-c:a",
      "libmp3lame",
      voicePath,
    ]);
    await exec(ffmpegPath, [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "color=c=black:s=320x240:d=4",
      "-i",
      voicePath,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-shortest",
      mp4Path,
    ]);

    const mp4Buffer = await fs.readFile(mp4Path);
    const r = await mixI2VAudioLayersOnMp4Buffer(mp4Buffer, {
      ambience: "street",
      sfx: "explosion",
      sfxMoment: "middle",
      voiceEnabled: true,
      deliverSec: 4,
    });
    assert.equal(r.mixed, true);
    assert.equal(r.ambience, "street");
    assert.equal(r.sfx, "explosion");
    assert.ok(r.buffer.length > mp4Buffer.length * 0.8);
  });
});
