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

const SUBJECT_OCCUPANCY_MIN = 0.7;
const SUBJECT_OCCUPANCY_MAX = 0.85;
/** Seuil souple — photos plein pied ne doivent pas être bloquées (faux positifs larges). */
const SUBJECT_OCCUPANCY_OUTPUT_MIN = 0.5;
/** Blocage uniquement si le sujet est clairement trop petit (portrait serré). */
const SUBJECT_OCCUPANCY_HARD_REJECT = 0.35;

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
async function runFfmpegExtractFrame(inputPath, framePath, seekSec) {
  await execFileAsync(
    ffmpegPath,
    [
      "-y",
      "-ss",
      String(seekSec),
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
    throw Object.assign(new Error("Frame vidéo vide"), {
      status: 422,
      code: "VIDEO_FRAME_EXTRACT_FAILED",
    });
  }
  return jpeg;
}

/**
 * Première frame utile de la vidéo de mouvement (décor cible).
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
    throw Object.assign(new Error("URL vidéo invalide"), {
      status: 422,
      code: "VIDEO_URL_INVALID",
    });
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "motion-frame0-"));
  const inputPath = path.join(tmpDir, "source.mp4");
  const framePath = path.join(tmpDir, "frame0.jpg");

  try {
    await downloadToFile(url, inputPath, 120_000);
    const seeks = [0, 0.35, 0.75];
    let lastErr;
    for (const seek of seeks) {
      try {
        return await runFfmpegExtractFrame(inputPath, framePath, seek);
      } catch (err) {
        lastErr = err;
        await fs.unlink(framePath).catch(() => {});
      }
    }
    throw Object.assign(
      lastErr || new Error("Impossible d'extraire une image de la vidéo"),
      { status: 422, code: "VIDEO_FRAME_EXTRACT_FAILED" },
    );
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
          if (alpha > 32) {
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
      const padX = Math.max(6, Math.floor((maxX - minX) * 0.08));
      const padY = Math.max(8, Math.floor((maxY - minY) * 0.1));
      minX = Math.max(0, minX - padX);
      minY = Math.max(0, minY - padY);
      maxX = Math.min(width - 1, maxX + padX);
      maxY = Math.min(height - 1, maxY + padY);
      return {
        left: minX,
        top: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
        yBottom: maxY,
        xCenter: (minX + maxX) / 2,
      };
    });
}

/**
 * Bbox danseuse ancrée au sol (talons = yBottom) pour caler le remplaçant.
 */
/** Marge pour que le remplaçant recouvre 100 % de la silhouette (zéro jambe fantôme). */
function expandBoxForOcclusionCover(box, canvasW, canvasH) {
  const padX = Math.max(10, Math.round(box.width * 0.13));
  const padTop = Math.max(8, Math.round(box.height * 0.06));
  const padBottom = Math.max(12, Math.round(box.height * 0.05));
  const left = Math.max(0, box.left - padX);
  const top = Math.max(0, box.top - padTop);
  const width = Math.min(canvasW - left, box.width + padX * 2);
  const height = Math.min(
    canvasH - top,
    box.height + padTop + padBottom,
  );
  return { left, top, width, height };
}

async function detectDancerPlacementBox(frameCutoutPng, canvasW, canvasH) {
  const png = await sharp(frameCutoutPng)
    .resize(canvasW, canvasH, { fit: "fill" })
    .ensureAlpha()
    .png()
    .toBuffer();
  const box = await alphaBoundingBoxFromPng(png);
  let placement;
  const occ = box.height / canvasH;
  if (occ >= 0.52 && occ <= 0.9) {
    placement = {
      left: box.left,
      top: box.top,
      width: box.width,
      height: box.height,
    };
  } else {
    placement = alignSubjectBoxToOriginalDancer(
      expandBoxForFullBodyReplacement(box, canvasW, canvasH),
      canvasW,
      canvasH,
    );
  }
  return expandBoxForOcclusionCover(placement, canvasW, canvasH);
}

/** Masque serré sur la silhouette (pas de rectangle géant). */
async function buildTightDancerInpaintMaskRaw(
  frameCutoutPng,
  canvasW,
  canvasH,
  dilatePx = 16,
) {
  const dilatedAlpha = await sharp(frameCutoutPng)
    .resize(canvasW, canvasH, { fit: "fill" })
    .ensureAlpha()
    .extractChannel("alpha")
    .blur(6)
    .linear(1.15, -10)
    .raw()
    .toBuffer();

  const mask = Buffer.alloc(canvasW * canvasH);
  for (let i = 0; i < mask.length; i++) {
    mask[i] = dilatedAlpha[i] > 38 ? 255 : 0;
  }
  if (dilatePx > 0) {
    const base = Buffer.from(mask);
    for (let y = 0; y < canvasH; y++) {
      for (let x = 0; x < canvasW; x++) {
        if (base[y * canvasW + x] === 0) continue;
        for (let dy = -dilatePx; dy <= dilatePx; dy++) {
          for (let dx = -dilatePx; dx <= dilatePx; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < canvasH && nx >= 0 && nx < canvasW) {
              mask[ny * canvasW + nx] = 255;
            }
          }
        }
      }
    }
  }
  return mask;
}

/** Efface la danseuse originale localement (flou léger, masque silhouette uniquement). */
async function buildScenePlateTightDancerInpaint(
  frameJpeg,
  frameCutoutPng,
  canvasW,
  canvasH,
) {
  const maskRaw = await buildTightDancerInpaintMaskRaw(
    frameCutoutPng,
    canvasW,
    canvasH,
    18,
  );
  const blurredRgb = await sharp(frameJpeg).blur(14).removeAlpha().raw().toBuffer();
  const channels = 3;
  const out = Buffer.from(await sharp(frameJpeg).removeAlpha().raw().toBuffer());
  for (let y = 0; y < canvasH; y++) {
    for (let x = 0; x < canvasW; x++) {
      const pi = y * canvasW + x;
      const alpha = maskRaw[pi] / 255;
      if (alpha <= 0.03) continue;
      const oi = pi * channels;
      const bi = pi * channels;
      out[oi] = Math.round(out[oi] * (1 - alpha) + blurredRgb[bi] * alpha);
      out[oi + 1] = Math.round(out[oi + 1] * (1 - alpha) + blurredRgb[bi + 1] * alpha);
      out[oi + 2] = Math.round(out[oi + 2] * (1 - alpha) + blurredRgb[bi + 2] * alpha);
    }
  }
  return sharp(out, { raw: { width: canvasW, height: canvasH, channels: 3 } })
    .jpeg({ quality: 94 })
    .toBuffer();
}

async function cropPngToAlphaBounds(pngBuffer) {
  const box = await alphaBoundingBoxFromPng(pngBuffer);
  const meta = await sharp(pngBuffer).metadata();
  const w = meta.width || 1;
  const h = meta.height || 1;
  const left = Math.max(0, Math.min(box.left, w - 1));
  const top = Math.max(0, Math.min(box.top, h - 1));
  const width = Math.max(1, Math.min(box.width, w - left));
  const height = Math.max(1, Math.min(box.height, h - top));
  return sharp(pngBuffer).extract({ left, top, width, height }).png().toBuffer();
}

/**
 * Masque d'effacement élargi (silhouette + marge) pour éviter les fantômes.
 */
async function buildInpaintMaskRaw(frameCutoutPng, canvasW, canvasH, subjectBox) {
  const dilatedAlpha = await sharp(frameCutoutPng)
    .resize(canvasW, canvasH, { fit: "fill" })
    .ensureAlpha()
    .extractChannel("alpha")
    .blur(22)
    .linear(1.35, -18)
    .raw()
    .toBuffer();

  const mask = Buffer.alloc(canvasW * canvasH);
  for (let i = 0; i < mask.length; i++) {
    mask[i] = dilatedAlpha[i] > 42 ? 255 : 0;
  }

  if (subjectBox) {
    const padX = Math.round(subjectBox.width * 0.12);
    const padY = Math.round(subjectBox.height * 0.08);
    const x0 = Math.max(0, subjectBox.left - padX);
    const y0 = Math.max(0, subjectBox.top - padY);
    const x1 = Math.min(canvasW - 1, subjectBox.left + subjectBox.width + padX);
    const y1 = Math.min(canvasH - 1, subjectBox.top + subjectBox.height + padY);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        mask[y * canvasW + x] = 255;
      }
    }
  }

  return mask;
}

/**
 * Efface le sujet original (masque RMBG dilaté) en floutant la zone sous le personnage.
 */
/** Efface la zone danseur même sans détourage Bria (fallback strict). */
async function buildScenePlateErasingSubjectBox(frameJpeg, subjectBox) {
  const frameMeta = await sharp(frameJpeg).metadata();
  const w = frameMeta.width || 720;
  const h = frameMeta.height || 1280;
  const box = subjectBox || computeDefaultSubjectBox(w, h);
  const padX = Math.round(box.width * 0.14);
  const padY = Math.round(box.height * 0.06);
  const x0 = Math.max(0, box.left - padX);
  const y0 = Math.max(0, box.top - padY);
  const x1 = Math.min(w - 1, box.left + box.width + padX);
  const y1 = Math.min(h - 1, box.top + box.height + padY);
  const maskRaw = Buffer.alloc(w * h);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const rx = (x1 - x0) / 2;
  const ry = (y1 - y0) / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = (x - cx) / Math.max(1, rx);
      const ny = (y - cy) / Math.max(1, ry);
      if (nx * nx + ny * ny <= 1.05) {
        maskRaw[y * w + x] = 255;
      }
    }
  }
  const blurredRgb = await sharp(frameJpeg).blur(52).removeAlpha().raw().toBuffer();
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

async function buildScenePlateWithoutOriginalSubject(
  frameJpeg,
  frameCutoutPng,
  subjectBox,
) {
  const frameMeta = await sharp(frameJpeg).metadata();
  const w = frameMeta.width || 720;
  const h = frameMeta.height || 1280;

  const maskRaw = await buildInpaintMaskRaw(
    frameCutoutPng,
    w,
    h,
    subjectBox,
  );

  const blurredRgb = await sharp(frameJpeg).blur(52).removeAlpha().raw().toBuffer();

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

function dancerAnchorCenterX(box) {
  return box.left + box.width / 2;
}

/** Box par défaut calée sur la position horizontale du danseur (ne pas « recoller » au centre). */
function computeSubjectBoxAtAnchor(canvasW, canvasH, anchorCenterX) {
  const height = Math.round(canvasH * 0.8);
  const width = Math.round(canvasW * 0.55);
  const centerX =
    typeof anchorCenterX === "number" && Number.isFinite(anchorCenterX)
      ? anchorCenterX
      : canvasW / 2;
  const left = Math.round(
    Math.max(0, Math.min(canvasW - width, centerX - width / 2)),
  );
  return {
    left,
    top: Math.round(canvasH - height - canvasH * 0.02),
    width,
    height,
  };
}

function computeDefaultSubjectBox(canvasW, canvasH) {
  return computeSubjectBoxAtAnchor(canvasW, canvasH, canvasW / 2);
}

/** Évite un petit crop « tête seule » — le remplacement doit couvrir tout le corps dans la clip. */
function expandBoxForFullBodyReplacement(box, canvasW, canvasH) {
  const minH = Math.round(canvasH * 0.58);
  const minW = Math.round(canvasW * 0.42);
  let { left, top, width, height } = box;
  if (height < minH) {
    const centerX = left + width / 2;
    height = minH;
    width = Math.max(width, minW);
    left = Math.round(Math.max(0, Math.min(canvasW - width, centerX - width / 2)));
    top = Math.round(Math.max(0, canvasH - height - canvasH * 0.02));
  }
  return { left, top, width, height };
}

/**
 * Aligne la bbox détectée sur la hauteur réelle du danseur (70–85 % du canvas, pieds au sol).
 */
function alignSubjectBoxToOriginalDancer(box, canvasW, canvasH) {
  const centerX = box.left + box.width / 2;
  let height = box.height;
  let occupancy = height / canvasH;

  if (occupancy < SUBJECT_OCCUPANCY_MIN) {
    height = Math.round(canvasH * SUBJECT_OCCUPANCY_MIN);
  } else if (occupancy > SUBJECT_OCCUPANCY_MAX) {
    height = Math.round(canvasH * SUBJECT_OCCUPANCY_MAX);
  }

  const aspect = box.width / Math.max(1, box.height);
  let width = Math.round(height * aspect);
  width = Math.max(
    Math.round(canvasW * 0.34),
    Math.min(Math.round(canvasW * 0.72), width),
  );

  const left = Math.round(
    Math.max(0, Math.min(canvasW - width, centerX - width / 2)),
  );
  const top = Math.round(Math.max(0, canvasH - height - canvasH * 0.015));

  occupancy = height / canvasH;
  return { left, top, width, height, occupancy };
}

async function resizeSubjectIntoBox(subjectCutoutPng, box, canvasW = null) {
  const cropped = await cropPngToAlphaBounds(subjectCutoutPng);
  const meta = await sharp(cropped).metadata();
  const sw = meta.width || 512;
  const sh = meta.height || 512;

  let scale = box.height / sh;
  let targetW = Math.max(32, Math.round(sw * scale));
  let targetH = Math.max(32, Math.round(sh * scale));
  let fitBox = { ...box };
  if (targetW > box.width) {
    const maxW = canvasW ? Math.min(canvasW, Math.round(targetW * 1.08)) : targetW;
    fitBox = {
      ...box,
      left: Math.max(
        0,
        Math.round(box.left + box.width / 2 - maxW / 2),
      ),
      width: maxW,
    };
  }

  const resized = await sharp(cropped)
    .resize(targetW, targetH, { fit: "fill" })
    .png()
    .toBuffer();
  const left = Math.round(fitBox.left + (fitBox.width - targetW) / 2);
  const top = Math.round(fitBox.top + fitBox.height - targetH);
  return { buffer: resized, left, top, targetW, targetH };
}

/** Pieds du remplaçant calés sur le bas de la bbox danseuse (y_bottom). */
async function resizeSubjectFeetLockedToBox(
  subjectCutoutPng,
  box,
  canvasW,
  coverScale = 1.05,
) {
  const cropped = await cropPngToAlphaBounds(subjectCutoutPng);
  const meta = await sharp(cropped).metadata();
  const sw = meta.width || 512;
  const sh = meta.height || 512;

  const targetH = Math.max(32, Math.round(box.height * coverScale));
  const scale = targetH / sh;
  const targetW = Math.max(32, Math.round(sw * scale));

  const resized = await sharp(cropped)
    .resize(targetW, targetH, { fit: "fill" })
    .png()
    .toBuffer();

  const centerX = box.left + box.width / 2;
  let left = Math.round(centerX - targetW / 2);
  if (canvasW) {
    left = Math.max(0, Math.min(canvasW - targetW, left));
  }
  const top = Math.round(box.top + box.height - targetH);
  return { buffer: resized, left, top, targetW, targetH };
}

/**
 * Part du sujet (masque alpha ou image) sur la hauteur — valide les photos plein pied.
 */
async function measureSubjectPhotoVerticalOccupancy(subjectPng, originalBuffer = null) {
  try {
    const meta = await sharp(subjectPng).metadata();
    const imgH = meta.height || 1;
    const imgW = meta.width || 1;
    const box = await alphaBoundingBoxFromPng(
      meta.hasAlpha
        ? subjectPng
        : await sharp(subjectPng).ensureAlpha().png().toBuffer(),
    );
    const occ = box.height / imgH;
    if (occ >= 0.45) return occ;
  } catch {
    /* fall through */
  }
  if (originalBuffer) {
    const meta = await sharp(originalBuffer).metadata();
    const h = meta.height || 1;
    const w = meta.width || 1;
    if (h / w >= 1.15) return 0.72;
  }
  return null;
}

/** Composite frame 0 propre requis pour photo uploadée (Kling 3.0 — image = scène de départ). */
function shouldApplyMotionCleanComposite(params = {}) {
  if (params.skipMotionComposite === true) return false;
  if (process.env.MOTION_CLEAN_COMPOSITE_DISABLED === "1") return false;
  if (!params.imageUrl || !params.videoUrl) return false;
  if (params.motionReferenceSource === "auto_frame") return false;
  return params.motionReferenceSource === "uploaded";
}

/** @deprecated — transparent PNG → fond noir chez Kling */
function shouldApplyMotionSubjectScale(params = {}) {
  if (process.env.MOTION_SUBJECT_SCALE_LEGACY === "1") {
    if (process.env.MOTION_SUBJECT_SCALE_DISABLED === "1") return false;
    if (!params.imageUrl || !params.videoUrl) return false;
    if (params.motionReferenceSource === "auto_frame") return false;
    return params.motionReferenceSource === "uploaded";
  }
  return false;
}

/** Bords alpha minimaux — pas de halo visible sur carrelage net. */
async function featherSubjectCutoutAlpha(pngBuffer, blurSigma = 0.45) {
  const meta = await sharp(pngBuffer).metadata();
  const w = meta.width || 512;
  const h = meta.height || 512;
  const alpha = await sharp(pngBuffer)
    .ensureAlpha()
    .extractChannel("alpha")
    .blur(blurSigma)
    .toBuffer();
  const rgb = await sharp(pngBuffer).removeAlpha().raw().toBuffer();
  return sharp(rgb, { raw: { width: w, height: h, channels: 3 } })
    .joinChannel(alpha)
    .png()
    .toBuffer();
}

/** Échelle de recouvrement — le sujet doit masquer toute l'ancienne silhouette. */
const SUBJECT_OCCLUSION_COVER_SCALE = 1.17;

async function finalizeMotionCompositeJpeg(
  scenePlate,
  subjectPng,
  subjectBox,
  canvasW,
  canvasH,
  coverScale = SUBJECT_OCCLUSION_COVER_SCALE,
) {
  const plateRgb = await sharp(scenePlate)
    .resize(canvasW, canvasH, { fit: "fill" })
    .removeAlpha()
    .jpeg({ quality: 94, mozjpeg: true })
    .toBuffer();
  const placed = await resizeSubjectFeetLockedToBox(
    subjectPng,
    subjectBox,
    canvasW,
    coverScale,
  );
  return {
    jpeg: await sharp(plateRgb)
      .composite([
        {
          input: placed.buffer,
          left: Math.max(0, placed.left),
          top: Math.max(0, placed.top),
        },
      ])
      .jpeg({ quality: 94, mozjpeg: true })
      .toBuffer(),
    placed,
  };
}

async function loadSubjectPngForComposite(subjectUrl, subjectCutout) {
  let subjectRawBuf = null;
  if (subjectCutout) {
    try {
      return {
        subjectPng: await featherSubjectCutoutAlpha(subjectCutout),
        subjectRawBuf: null,
      };
    } catch (err) {
      console.warn("[motion-clean-composite] feather fail — raw cutout", err);
      return { subjectPng: subjectCutout, subjectRawBuf: null };
    }
  }
  const subjectRes = await fetch(subjectUrl);
  if (!subjectRes.ok) {
    throw Object.assign(new Error("Impossible de lire la photo personnage"), {
      status: 422,
    });
  }
  subjectRawBuf = Buffer.from(await subjectRes.arrayBuffer());
  let subjectPng = await sharp(subjectRawBuf).png().toBuffer();
  try {
    subjectPng = await featherSubjectCutoutAlpha(subjectPng);
  } catch {
    /* keep rgb png */
  }
  return { subjectPng, subjectRawBuf };
}

/** Fallback : frame_0 brute + sujet centré bas, sans inpaint. */
async function prepareMotionCleanCompositeDirectFallback({
  userId,
  subjectImageUrl,
  videoUrl,
}) {
  const uid = String(userId || "anon").trim() || "anon";
  const subjectUrl = String(subjectImageUrl || "").trim();
  const motionVideoUrl = String(videoUrl || "").trim();
  const frameJpeg = await extractVideoFrameZeroBuffer(motionVideoUrl);
  const frameMeta = await sharp(frameJpeg).metadata();
  const canvasW = frameMeta.width || 720;
  const canvasH = frameMeta.height || 1280;
  const subjectCutout = await removeBackgroundBriaOptional(subjectUrl, "user_photo");
  const { subjectPng } = await loadSubjectPngForComposite(subjectUrl, subjectCutout);
  const subjectBox = computeDefaultSubjectBox(canvasW, canvasH);
  const { jpeg } = await finalizeMotionCompositeJpeg(
    frameJpeg,
    subjectPng,
    subjectBox,
    canvasW,
    canvasH,
  );
  const key = `inputs/${uid}/${Date.now()}-motion-composite-fallback.jpg`;
  return uploadToR2(key, jpeg, "image/jpeg");
}

/**
 * Kling Motion 3.0 : frame_0 vidéo nette + sujet détouré à l'échelle du danseur → JPEG RGB opaque.
 */
async function prepareMotionCleanCompositeImage({
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

  try {
    const frameJpeg = await extractVideoFrameZeroBuffer(motionVideoUrl);
    const frameCutout = await removeBackgroundBriaOptional(frameJpeg, "video_bbox");
    const subjectCutout = await removeBackgroundBriaOptional(subjectUrl, "user_photo");

    const frameMeta = await sharp(frameJpeg).metadata();
    const canvasW = frameMeta.width || 720;
    const canvasH = frameMeta.height || 1280;

    let dancerAnchorX = canvasW / 2;
    let subjectBox = computeDefaultSubjectBox(canvasW, canvasH);
    const scenePlate = frameJpeg;
    if (frameCutout) {
      try {
        subjectBox = await detectDancerPlacementBox(frameCutout, canvasW, canvasH);
        dancerAnchorX = dancerAnchorCenterX(subjectBox);
      } catch (boxErr) {
        console.warn("[motion-clean-composite] dancer box fallback", {
          message: String(boxErr?.message || boxErr).slice(0, 160),
        });
        subjectBox = expandBoxForOcclusionCover(
          computeSubjectBoxAtAnchor(canvasW, canvasH, dancerAnchorX),
          canvasW,
          canvasH,
        );
      }
    } else {
      subjectBox = expandBoxForOcclusionCover(subjectBox, canvasW, canvasH);
      dancerAnchorX = dancerAnchorCenterX(subjectBox);
    }

    const { subjectPng, subjectRawBuf } = await loadSubjectPngForComposite(
      subjectUrl,
      subjectCutout,
    );

    const photoVerticalOcc = await measureSubjectPhotoVerticalOccupancy(
      subjectCutout || subjectPng,
      subjectRawBuf,
    );

    let { jpeg: compositeJpeg, placed } = await finalizeMotionCompositeJpeg(
      scenePlate,
      subjectPng,
      subjectBox,
      canvasW,
      canvasH,
    );
    let subjectOccupancyRatio = placed.targetH / canvasH;

    if (subjectOccupancyRatio < SUBJECT_OCCUPANCY_OUTPUT_MIN) {
      const fallbackBox = alignSubjectBoxToOriginalDancer(
        computeSubjectBoxAtAnchor(canvasW, canvasH, dancerAnchorX),
        canvasW,
        canvasH,
      );
      ({ jpeg: compositeJpeg, placed } = await finalizeMotionCompositeJpeg(
        scenePlate,
        subjectPng,
        fallbackBox,
        canvasW,
        canvasH,
      ));
      subjectBox = fallbackBox;
      subjectOccupancyRatio = placed.targetH / canvasH;
    }

    const fullBodyPhotoLikely =
      photoVerticalOcc != null && photoVerticalOcc >= SUBJECT_OCCUPANCY_OUTPUT_MIN;

    if (
      subjectOccupancyRatio < SUBJECT_OCCUPANCY_HARD_REJECT &&
      !fullBodyPhotoLikely
    ) {
      console.warn("[motion-clean-composite] scale soft-fail — using default box", {
        subjectOccupancyRatio,
      });
      const fallbackBox = computeSubjectBoxAtAnchor(
        canvasW,
        canvasH,
        dancerAnchorX,
      );
      ({ jpeg: compositeJpeg, placed } = await finalizeMotionCompositeJpeg(
        frameJpeg,
        subjectPng,
        fallbackBox,
        canvasW,
        canvasH,
      ));
      subjectBox = fallbackBox;
      subjectOccupancyRatio = placed.targetH / canvasH;
    }

    const key = `inputs/${uid}/${Date.now()}-motion-composite-clean.jpg`;
    const publicUrl = await uploadToR2(key, compositeJpeg, "image/jpeg");

    console.info("[motion-clean-composite] prepared", {
      userId: uid,
      canvasW,
      canvasH,
      box: subjectBox,
      subjectOccupancyRatio: Number(subjectOccupancyRatio.toFixed(3)),
      bytes: compositeJpeg.length,
      briaFrame: Boolean(frameCutout),
      briaSubject: Boolean(subjectCutout),
      inpaintApplied: false,
      coverScale: SUBJECT_OCCLUSION_COVER_SCALE,
      dancerAnchorX: Math.round(dancerAnchorX),
      pipeline: "sharp_overlay_zero_blur",
    });

    return publicUrl;
  } catch (err) {
    console.error("[motion-clean-composite] primary failed — direct fallback", err);
    return prepareMotionCleanCompositeDirectFallback({
      userId,
      subjectImageUrl,
      videoUrl,
    });
  }
}

/**
 * @deprecated Photo sur fond transparent — provoque fond noir Kling 3.0
 */
async function prepareMotionSubjectReferenceImage({
  userId,
  subjectImageUrl,
  videoUrl,
}) {
  const uid = String(userId || "anon").trim() || "anon";
  const subjectUrl = String(subjectImageUrl || "").trim();
  const motionVideoUrl = String(videoUrl || "").trim();
  if (!subjectUrl.startsWith("http") || !motionVideoUrl.startsWith("http")) {
    throw Object.assign(new Error("URLs référence motion invalides"), {
      status: 422,
    });
  }

  const frameJpeg = await extractVideoFrameZeroBuffer(motionVideoUrl);
  const frameCutout = await removeBackgroundBriaOptional(frameJpeg, "video_bbox");
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
    if (boxFromFrame) {
      subjectBox = alignSubjectBoxToOriginalDancer(
        expandBoxForFullBodyReplacement(boxFromFrame, canvasW, canvasH),
        canvasW,
        canvasH,
      );
    }
  }

  let subjectPng;
  if (subjectCutout) {
    subjectPng = subjectCutout;
  } else {
    const subjectRes = await fetch(subjectUrl);
    if (!subjectRes.ok) {
      throw Object.assign(new Error("Impossible de lire la photo personnage"), {
        status: 422,
      });
    }
    subjectPng = await sharp(Buffer.from(await subjectRes.arrayBuffer()))
      .png()
      .toBuffer();
  }

  const placed = await resizeSubjectIntoBox(subjectPng, subjectBox);
  const transparentBase = await sharp({
    create: {
      width: canvasW,
      height: canvasH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .png()
    .toBuffer();

  const outPng = await sharp(transparentBase)
    .composite([
      {
        input: placed.buffer,
        left: Math.max(0, placed.left),
        top: Math.max(0, placed.top),
      },
    ])
    .png()
    .toBuffer();

  const key = `inputs/${uid}/${Date.now()}-motion-subject-ref.png`;
  return uploadToR2(key, outPng, "image/png");
}

/**
 * Personnage détouré incrusté sur le décor frame 0 de la vidéo de mouvement.
 */
async function prepareMotionControlCompositeImage({
  userId,
  subjectImageUrl,
  videoUrl,
  requireFullReplacement = false,
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
  let frameCutout = await removeBackgroundBriaOptional(frameJpeg, "video_frame");
  const subjectCutout = await removeBackgroundBriaOptional(subjectUrl, "user_photo");

  const frameMeta = await sharp(frameJpeg).metadata();
  const canvasW = frameMeta.width || 720;
  const canvasH = frameMeta.height || 1280;

  let subjectBox = computeDefaultSubjectBox(canvasW, canvasH);
  let detectedOccupancy = subjectBox.height / canvasH;
  if (frameCutout) {
    const boxFromFrame = await alphaBoundingBoxFromPng(
      await sharp(frameCutout)
        .resize(canvasW, canvasH, { fit: "fill" })
        .png()
        .toBuffer(),
    );
    if (boxFromFrame) {
      const expanded = expandBoxForFullBodyReplacement(
        boxFromFrame,
        canvasW,
        canvasH,
      );
      const aligned = alignSubjectBoxToOriginalDancer(
        expanded,
        canvasW,
        canvasH,
      );
      subjectBox = aligned;
      detectedOccupancy = aligned.occupancy;
    }
  }

  let plate;
  if (frameCutout) {
    plate = await buildScenePlateWithoutOriginalSubject(
      frameJpeg,
      frameCutout,
      subjectBox,
    );
  } else if (requireFullReplacement) {
    plate = await buildScenePlateErasingSubjectBox(frameJpeg, subjectBox);
  } else {
    plate = frameJpeg;
  }

  let placed = null;
  let compositePng;
  if (subjectCutout) {
    placed = await resizeSubjectIntoBox(subjectCutout, subjectBox);
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
    placed = await resizeSubjectIntoBox(
      await sharp(subjectBuf).png().toBuffer(),
      subjectBox,
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

  const subjectOccupancyRatio = placed
    ? placed.targetH / canvasH
    : detectedOccupancy;

  if (
    requireFullReplacement &&
    subjectOccupancyRatio < SUBJECT_OCCUPANCY_OUTPUT_MIN
  ) {
    const fallbackBox = alignSubjectBoxToOriginalDancer(
      computeDefaultSubjectBox(canvasW, canvasH),
      canvasW,
      canvasH,
    );
    placed = await resizeSubjectIntoBox(
      subjectCutout
        ? subjectCutout
        : await sharp(
            Buffer.from(await (await fetch(subjectUrl)).arrayBuffer()),
          )
            .png()
            .toBuffer(),
      fallbackBox,
    );
    compositePng = await sharp(
      frameCutout
        ? await buildScenePlateWithoutOriginalSubject(
            frameJpeg,
            frameCutout,
            fallbackBox,
          )
        : await buildScenePlateErasingSubjectBox(frameJpeg, fallbackBox),
    )
      .composite([
        {
          input: placed.buffer,
          left: Math.max(0, placed.left),
          top: Math.max(0, placed.top),
        },
      ])
      .png()
      .toBuffer();
    subjectBox = fallbackBox;
  }

  const key = `inputs/${uid}/${Date.now()}-motion-composite.png`;
  const publicUrl = await uploadToR2(key, compositePng, "image/png");

  const debugEnabled =
    process.env.MOTION_COMPOSITE_DEBUG === "1" ||
    process.env.MOTION_COMPOSITE_DEBUG === "true";
  let debugUrl = null;
  if (debugEnabled) {
    const debugKey = `inputs/${uid}/${Date.now()}-composite_frame0_debug.png`;
    debugUrl = await uploadToR2(debugKey, compositePng, "image/png");
    const tmpDebug = path.join(os.tmpdir(), "composite_frame0_debug.png");
    await fs.writeFile(tmpDebug, compositePng).catch(() => {});
  }

  console.info("[motion-control-composite] prepared", {
    userId: uid,
    canvasW,
    canvasH,
    box: subjectBox,
    subjectOccupancyRatio: Number(subjectOccupancyRatio.toFixed(3)),
    placed: placed
      ? {
          left: placed.left,
          top: placed.top,
          targetW: placed.targetW,
          targetH: placed.targetH,
        }
      : null,
    bytes: compositePng.length,
    briaFrame: Boolean(frameCutout),
    briaSubject: Boolean(subjectCutout),
    debugUrl,
  });

  return publicUrl;
}

module.exports = {
  shouldApplyMotionCleanComposite,
  prepareMotionCleanCompositeImage,
  prepareMotionCleanCompositeDirectFallback,
  finalizeMotionCompositeJpeg,
  shouldApplyMotionComposite: shouldApplyMotionCleanComposite,
  shouldApplyMotionSubjectScale,
  prepareMotionSubjectReferenceImage,
  prepareMotionControlCompositeImage,
  featherSubjectCutoutAlpha,
  alphaBoundingBoxFromPng,
  computeDefaultSubjectBox,
  computeSubjectBoxAtAnchor,
  dancerAnchorCenterX,
  expandBoxForFullBodyReplacement,
  alignSubjectBoxToOriginalDancer,
  cropPngToAlphaBounds,
  extractVideoFrameZeroBuffer,
  SUBJECT_OCCUPANCY_MIN,
  SUBJECT_OCCUPANCY_MAX,
  SUBJECT_OCCUPANCY_OUTPUT_MIN,
  measureSubjectPhotoVerticalOccupancy,
  detectDancerPlacementBox,
  expandBoxForOcclusionCover,
  resizeSubjectFeetLockedToBox,
  SUBJECT_OCCLUSION_COVER_SCALE,
  buildScenePlateTightDancerInpaint,
  buildScenePlateErasingSubjectBox,
};
