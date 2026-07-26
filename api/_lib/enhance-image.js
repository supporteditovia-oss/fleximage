/**
 * OneShot currently delivers ~768px-wide images. Upscale once on store so
 * downloads are sharper on phones (does not invent missing facial detail).
 */
async function enhanceGeneratedImageBuffer(buffer, contentType) {
  try {
    const sharp = require("sharp");
    const image = sharp(buffer, { failOn: "none" });
    const meta = await image.metadata();
    const width = meta.width || 0;
    const height = meta.height || 0;
    if (!width || !height) {
      return { buffer, contentType, extension: extensionFor(contentType) };
    }

    // Already high-res (e.g. future OneShot 2K/4K or Kie 4K) — keep as-is.
    const longEdge = Math.max(width, height);
    if (longEdge >= 2400) {
      return { buffer, contentType, extension: extensionFor(contentType) };
    }

    // Target ~2.5K on the long edge (≈ 3× for 768→2304) for usable face detail.
    const targetLong = 2560;
    const scale = Math.min(4, Math.max(2, targetLong / longEdge));
    const nextWidth = Math.round(width * scale);
    const nextHeight = Math.round(height * scale);

    const out = await sharp(buffer, { failOn: "none" })
      .resize(nextWidth, nextHeight, {
        kernel: sharp.kernel.lanczos3,
        fit: "fill",
      })
      .sharpen({ sigma: 0.6, m1: 0.8, m2: 0.4 })
      .png({ compressionLevel: 6, adaptiveFiltering: true })
      .toBuffer();

    return { buffer: out, contentType: "image/png", extension: ".png" };
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
