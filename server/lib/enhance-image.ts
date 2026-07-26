import sharp from "sharp";
import { logger } from "./logger";

/**
 * OneShot currently delivers ~768px-wide images. Upscale once on store so
 * downloads are sharper on phones (does not invent missing facial detail).
 */
export async function enhanceGeneratedImageBuffer(
  buffer: Buffer,
  contentType: string,
): Promise<{ buffer: Buffer; contentType: string; extension: string }> {
  try {
    const image = sharp(buffer, { failOn: "none" });
    const meta = await image.metadata();
    const width = meta.width || 0;
    const height = meta.height || 0;
    if (!width || !height) {
      return { buffer, contentType, extension: extensionFor(contentType) };
    }

    const longEdge = Math.max(width, height);
    if (longEdge >= 2400) {
      return { buffer, contentType, extension: extensionFor(contentType) };
    }

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
    logger.warn({ err }, "enhanceGeneratedImageBuffer skipped");
    return { buffer, contentType, extension: extensionFor(contentType) };
  }
}

function extensionFor(contentType: string): string {
  const ct = String(contentType || "").toLowerCase();
  if (ct.includes("png")) return ".png";
  if (ct.includes("webp")) return ".webp";
  return ".jpg";
}
