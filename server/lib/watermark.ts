import sharp from "sharp";
import path from "path";
import fs from "fs";
import { logger } from "./logger";

let logoCacheBuffer: Buffer | null = null;

async function getLogoBuffer(): Promise<Buffer> {
  if (logoCacheBuffer) return logoCacheBuffer;

  const candidates = [
    path.resolve(process.cwd(), "client/public/assets/turboprank.png"),
    path.resolve(process.cwd(), "dist/public/assets/turboprank.png"),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      logoCacheBuffer = fs.readFileSync(p);
      return logoCacheBuffer;
    }
  }

  throw new Error("TurboPrank logo not found");
}

export async function applyWatermark(imageBuffer: Buffer): Promise<Buffer> {
  try {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const width = metadata.width || 1080;
    const height = metadata.height || 1920;

    const logoRaw = await getLogoBuffer();

    // Resize logo to 160px wide, keep aspect ratio
    const logoResized = await sharp(logoRaw)
      .resize({ width: 160, fit: "inside" })
      .ensureAlpha()
      .toBuffer();

    const logoMeta = await sharp(logoResized).metadata();
    const logoW = logoMeta.width || 160;
    const logoH = logoMeta.height || 50;

    // Rotate logo diagonally (-30°) then set opacity to ~25%
    const angle = -30;
    const rad = (angle * Math.PI) / 180;

    const logoRotated = await sharp(logoResized)
      .rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    const rotatedMeta = await sharp(logoRotated).metadata();
    const rotLogoW = rotatedMeta.width || logoW;
    const rotLogoH = rotatedMeta.height || logoH;

    const logoFaded = await sharp(logoRotated)
      .composite([{
        input: Buffer.from(
          `<svg width="${rotLogoW}" height="${rotLogoH}"><rect width="100%" height="100%" fill="rgba(255,255,255,0.28)"/></svg>`
        ),
        blend: "dest-in",
      }])
      .toBuffer();

    // Place logos in a diagonal grid across the image
    const spaceX = 260;
    const spaceY = 200;

    const composites: sharp.OverlayOptions[] = [];

    // Cover more than image area to account for rotation shift
    for (let row = -2; row < Math.ceil(height / spaceY) + 3; row++) {
      for (let col = -1; col < Math.ceil(width / spaceX) + 2; col++) {
        // Base position
        const bx = col * spaceX;
        const by = row * spaceY + (col % 2 === 0 ? 0 : spaceY / 2);

        // Rotate position around image center
        const cx = width / 2;
        const cy = height / 2;
        const dx = bx - cx;
        const dy = by - cy;
        const rx = Math.round(dx * Math.cos(rad) - dy * Math.sin(rad) + cx);
        const ry = Math.round(dx * Math.sin(rad) + dy * Math.cos(rad) + cy);

        // Only add if within image bounds (with some padding)
        const left = rx - Math.round(rotLogoW / 2);
        const top = ry - Math.round(rotLogoH / 2);

        if (left + rotLogoW < 0 || left >= width || top + rotLogoH < 0 || top >= height) continue;

        composites.push({
          input: logoFaded,
          left: Math.max(0, left),
          top: Math.max(0, top),
          blend: "over",
        });
      }
    }

    if (composites.length === 0) return imageBuffer;

    const watermarked = await image.composite(composites).toBuffer();
    return watermarked;
  } catch (error) {
    logger.error({ err: error }, "Failed to apply watermark");
    return imageBuffer;
  }
}
