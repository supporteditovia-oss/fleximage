/**
 * Optional light polish on store. Heavy upscale was blocking the status
 * endpoint past Vercel's maxDuration (60s) → UI stuck on "finalisation".
 * Default: no-op (deliver ASAP). Set ENABLE_IMAGE_UPSCALE=1 to re-enable.
 */
async function enhanceGeneratedImageBuffer(buffer, contentType) {
  if (process.env.ENABLE_IMAGE_UPSCALE !== "1") {
    return { buffer, contentType, extension: extensionFor(contentType) };
  }

  try {
    const sharp = require("sharp");
    const image = sharp(buffer, { failOn: "none" });
    const meta = await image.metadata();
    const width = meta.width || 0;
    const height = meta.height || 0;
    if (!width || !height) {
      return { buffer, contentType, extension: extensionFor(contentType) };
    }

    const longEdge = Math.max(width, height);
    if (longEdge >= 1600) {
      return { buffer, contentType, extension: extensionFor(contentType) };
    }

    const targetLong = 1600;
    const scale = Math.min(2.5, Math.max(1.5, targetLong / longEdge));
    const nextWidth = Math.round(width * scale);
    const nextHeight = Math.round(height * scale);

    const out = await sharp(buffer, { failOn: "none" })
      .resize(nextWidth, nextHeight, {
        kernel: sharp.kernel.lanczos3,
        fit: "fill",
      })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();

    return { buffer: out, contentType: "image/jpeg", extension: ".jpg" };
  } catch (err) {
    console.warn("enhanceGeneratedImageBuffer skipped", err && err.message);
    return { buffer, contentType, extension: extensionFor(contentType) };
  }
}

function extensionFor(contentType) {
  const ct = String(contentType || "").toLowerCase();
  if (ct.includes("png")) return ".png";
  if (ct.includes("webp")) return ".webp";
  return ".jpg";
}

module.exports = {
  enhanceGeneratedImageBuffer,
};
