const { execFile } = require("child_process");
const { promisify } = require("util");
const fs = require("fs/promises");
const path = require("path");
const os = require("os");
const sharp = require("sharp");
const { uploadToR2 } = require("./r2");
const {
  removeBackgroundBriaOptional,
} = require("./background-remove-bria");

let ffmpegPath = null;
try {
  ffmpegPath = require("ffmpeg-static");
} catch {
  ffmpegPath = null;
}

const execFileAsync = promisify(execFile);

async function downloadToFile(url, destPath, timeoutMs = 90_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(destPath, buffer);
    return buffer.length;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Première frame de la vidéo de mouvement (décor cible).
 */
async function extractVideoFrameZeroBuffer(videoUrl) {
  if (!ffmpegPath) {
    throw Object.assign(new Error("ffmpeg indisponible"), {
      status: 503,
      code: "FFMPEG_UNAVAILABLE",
    });
  }
  const url = String(videoUrl || "").trim();
  if (!url.startsWith("http")) {
    throw Object.assign(new Error("URL vidéo invalide"), { status: 422 });
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "motion-frame0-"));
  const inputPath = path.join(tmpDir, "source.mp4");
  const framePath = path.join(tmpDir, "frame0.jpg");

  try {
    await downloadToFile(url, inputPath);
    await execFileAsync(
      ffmpegPath,
      [
        "-y",
        "-ss",
        "0",
        "-i",
        inputPath,
        "-frames:v",
        "1",
        "-q:v",
        "2",
        "-vf",
        "scale='min(1280,iw)':-2",
        framePath,
      ],
      { timeout: 90_000 },
    );
    const jpeg = await fs.readFile(framePath);
    if (!jpeg.length) {
      throw Object.assign(new Error("Frame 0 vide"), { status: 422 });
    }
    return jpeg;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Bounding box du sujet à partir du canal alpha (PNG détouré).
 */
function alphaBoundingBoxFromPng(pngBuffer) {
  return sharp(pngBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
    .then(({ data, info }) => {
      const { width, height, channels } = info;
      let minX = width;
      let minY = height;
      let maxX = 0;
      let maxY = 0;
      let found = false;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * channels;
          const alpha = data[i + 3];
          if (alpha > 48) {
            found = true;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (!found) {
        return {
          left: Math.floor(width * 0.25),
          top: Math.floor(height * 0.08),
          width: Math.floor(width * 0.5),
          height: Math.floor(height * 0.82),
        };
      }
      const padX = Math.max(4, Math.floor((maxX - minX) * 0.04));
      const padY = Math.max(4, Math.floor((maxY - minY) * 0.04));
      minX = Math.max(0, minX - padX);
      minY = Math.max(0, minY - padY);
      maxX = Math.min(width - 1, maxX + padX);
      maxY = Math.min(height - 1, maxY + padY);
      return {
        left: minX,
        top: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
      };
    });
}

/**
 * Efface le sujet original (masque RMBG) en floutant la zone sous le personnage.
 */
async function buildScenePlateWithoutOriginalSubject(frameJpeg, frameCutoutPng) {
  const frameMeta = await sharp(frameJpeg).metadata();
  const w = frameMeta.width || 720;
  const h = frameMeta.height || 1280;

  const maskRaw = await sharp(frameCutoutPng)
    .resize(w, h, { fit: "fill" })
    .ensureAlpha()
    .extractChannel("alpha")
    .blur(8)
    .raw()
    .toBuffer();

  const blurredRgb = await sharp(frameJpeg).blur(22).removeAlpha().raw().toBuffer();

  const channels = 3;
  const out = Buffer.from(await sharp(frameJpeg).removeAlpha().raw().toBuffer());
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const pi = y * w + x;
      const alpha = maskRaw[pi] / 255;
      if (alpha <= 0.02) continue;
      const oi = pi * channels;
      const bi = pi * channels;
      out[oi] = Math.round(out[oi] * (1 - alpha) + blurredRgb[bi] * alpha);
      out[oi + 1] = Math.round(out[oi + 1] * (1 - alpha) + blurredRgb[bi + 1] * alpha);
      out[oi + 2] = Math.round(out[oi + 2] * (1 - alpha) + blurredRgb[bi + 2] * alpha);
    }
  }

  return sharp(out, { raw: { width: w, height: h, channels: 3 } })
    .jpeg({ quality: 93 })
    .toBuffer();
}

function computeDefaultSubjectBox(canvasW, canvasH) {
  const width = Math.round(canvasW * 0.46);
  const height = Math.round(canvasH * 0.78);
  return {
    left: Math.round((canvasW - width) / 2),
    top: Math.round(canvasH - height - canvasH * 0.04),
    width,
    height,
  };
}

async function resizeSubjectIntoBox(subjectCutoutPng, box, canvasW, canvasH) {
  const meta = await sharp(subjectCutoutPng).metadata();
  const sw = meta.width || 512;
  const sh = meta.height || 512;
  const scale = Math.min(box.width / sw, box.height / sh);
  const targetW = Math.max(32, Math.round(sw * scale));
  const targetH = Math.max(32, Math.round(sh * scale));
  const resized = await sharp(subjectCutoutPng)
    .resize(targetW, targetH, { fit: "inside" })
    .png()
    .toBuffer();
  const left = Math.round(box.left + (box.width - targetW) / 2);
  const top = Math.round(box.top + box.height - targetH);
  return { buffer: resized, left, top };
}

function shouldApplyMotionComposite(params = {}) {
  if (params.skipMotionComposite === true) return false;
  if (process.env.MOTION_COMPOSITE_DISABLED === "1") return false;
  if (!params.imageUrl || !params.videoUrl) return false;
  if (params.motionReferenceSource === "auto_frame") return false;
  return true;
}

/**
 * Personnage détouré incrusté sur le décor frame 0 de la vidéo de mouvement.
 */
async function prepareMotionControlCompositeImage({
  userId,
  subjectImageUrl,
  videoUrl,
}) {
  const uid = String(userId || "anon").trim() || "anon";
  const subjectUrl = String(subjectImageUrl || "").trim();
  const motionVideoUrl = String(videoUrl || "").trim();
  if (!subjectUrl.startsWith("http") || !motionVideoUrl.startsWith("http")) {
    throw Object.assign(new Error("URLs composite motion invalides"), {
      status: 422,
    });
  }

  const frameJpeg = await extractVideoFrameZeroBuffer(motionVideoUrl);
  const frameCutout = await removeBackgroundBriaOptional(frameJpeg, "video_frame");
  const subjectCutout = await removeBackgroundBriaOptional(subjectUrl, "user_photo");

  const frameMeta = await sharp(frameJpeg).metadata();
  const canvasW = frameMeta.width || 720;
  const canvasH = frameMeta.height || 1280;

  let subjectBox = computeDefaultSubjectBox(canvasW, canvasH);
  if (frameCutout) {
    const boxFromFrame = await alphaBoundingBoxFromPng(
      await sharp(frameCutout)
        .resize(canvasW, canvasH, { fit: "fill" })
        .png()
        .toBuffer(),
    );
    if (boxFromFrame) subjectBox = boxFromFrame;
  }

  const plate = frameCutout
    ? await buildScenePlateWithoutOriginalSubject(frameJpeg, frameCutout)
    : frameJpeg;

  let compositePng;
  if (subjectCutout) {
    const placed = await resizeSubjectIntoBox(
      subjectCutout,
      subjectBox,
      canvasW,
      canvasH,
    );
    compositePng = await sharp(plate)
      .composite([
        {
          input: placed.buffer,
          left: Math.max(0, placed.left),
          top: Math.max(0, placed.top),
        },
      ])
      .png()
      .toBuffer();
  } else {
    const subjectRes = await fetch(subjectUrl);
    if (!subjectRes.ok) {
      throw Object.assign(new Error("Impossible de lire la photo personnage"), {
        status: 422,
      });
    }
    const subjectBuf = Buffer.from(await subjectRes.arrayBuffer());
    const placed = await resizeSubjectIntoBox(
      await sharp(subjectBuf).png().toBuffer(),
      subjectBox,
      canvasW,
      canvasH,
    );
    compositePng = await sharp(plate)
      .composite([
        {
          input: placed.buffer,
          left: Math.max(0, placed.left),
          top: Math.max(0, placed.top),
        },
      ])
      .png()
      .toBuffer();
  }

  const key = `inputs/${uid}/${Date.now()}-motion-composite.png`;
  const publicUrl = await uploadToR2(key, compositePng, "image/png");

  console.info("[motion-control-composite] prepared", {
    userId: uid,
    canvasW,
    canvasH,
    box: subjectBox,
    bytes: compositePng.length,
    briaFrame: Boolean(frameCutout),
    briaSubject: Boolean(subjectCutout),
  });

  return publicUrl;
}

module.exports = {
  shouldApplyMotionComposite,
  prepareMotionControlCompositeImage,
  alphaBoundingBoxFromPng,
  computeDefaultSubjectBox,
  extractVideoFrameZeroBuffer,
};
