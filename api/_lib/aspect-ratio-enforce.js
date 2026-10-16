const {
  normalizeGenerationAspectRatio,
} = require("./aspect-ratio-prompt");

function targetPixelSize(aspectRatio) {
  const normalized = normalizeGenerationAspectRatio(aspectRatio);
  if (normalized === "16:9") {
    return { width: 1344, height: 768 };
  }
  return { width: 768, height: 1344 };
}

/**
 * Recadre au centre puis redimensionne au format demandé (9:16 ou 16:9).
 */
async function enforceImageAspectRatioBuffer(buffer, aspectRatioInput) {
  const aspectRatio = normalizeGenerationAspectRatio(aspectRatioInput);
  const target = targetPixelSize(aspectRatio);

  try {
    const sharp = require("sharp");
    const meta = await sharp(buffer, { failOn: "none" }).metadata();
    const width = meta.width || 0;
    const height = meta.height || 0;
    if (width < 32 || height < 32) {
      return {
        buffer,
        contentType: "image/png",
        enforced: false,
        reason: "metadata_missing",
      };
    }

    const targetRatio = target.width / target.height;
    const currentRatio = width / height;
    let cropW = width;
    let cropH = height;
    if (currentRatio > targetRatio) {
      cropW = Math.max(1, Math.round(height * targetRatio));
    } else if (currentRatio < targetRatio) {
      cropH = Math.max(1, Math.round(width / targetRatio));
    }
    const left = Math.max(0, Math.floor((width - cropW) / 2));
    const top = Math.max(0, Math.floor((height - cropH) / 2));

    const out = await sharp(buffer, { failOn: "none" })
      .extract({ left, top, width: cropW, height: cropH })
      .resize(target.width, target.height, { fit: "fill" })
      .png()
      .toBuffer();

    return {
      buffer: out,
      contentType: "image/png",
      enforced: true,
      aspectRatio,
      width: target.width,
      height: target.height,
    };
  } catch (err) {
    console.warn("[aspect-ratio-enforce] skipped", err && err.message);
    return {
      buffer,
      contentType: "image/png",
      enforced: false,
      reason: "sharp_error",
    };
  }
}

module.exports = {
  enforceImageAspectRatioBuffer,
  targetPixelSize,
};
