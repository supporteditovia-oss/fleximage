import { uploadToR2 } from "./r2-client";
import { logger } from "./logger";
import { applyWatermark } from "./watermark";

/**
 * Download images from Kie.ai URLs and re-upload them to R2.
 * Returns an array of R2 public URLs.
 * If an individual image fails, the original Kie.ai URL is kept as fallback.
 */
export async function downloadAndStoreImages(
  larpId: string,
  kieUrls: string[]
): Promise<string[]> {
  const r2Urls: string[] = [];

  for (let i = 0; i < kieUrls.length; i++) {
    const kieUrl = kieUrls[i];
    try {
      const response = await fetch(kieUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: HTTP ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "image/jpeg";
      const extension = getExtensionFromContentType(contentType);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const key = `larps/${larpId}/${i}${extension}`;
      const r2Url = await uploadToR2(key, buffer, contentType);
      r2Urls.push(r2Url);

      logger.info(
        { larpId, index: i, originalUrl: kieUrl, r2Url },
        "Image re-uploaded to R2"
      );
    } catch (error) {
      logger.error(
        { err: error, larpId, index: i, kieUrl },
        "Failed to re-upload image to R2, keeping original URL"
      );
      r2Urls.push(kieUrl);
    }
  }

  return r2Urls;
}

/**
 * Download images, store originals AND watermarked versions in R2.
 * Returns both sets of URLs.
 */
export async function downloadAndStoreImagesWithWatermark(
  larpId: string,
  kieUrls: string[],
): Promise<{ originals: string[]; watermarked: string[] }> {
  const originals: string[] = [];
  const watermarked: string[] = [];

  for (let i = 0; i < kieUrls.length; i++) {
    const kieUrl = kieUrls[i];
    try {
      const response = await fetch(kieUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: HTTP ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "image/jpeg";
      const extension = getExtensionFromContentType(contentType);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Store original
      const originalKey = `larps/${larpId}/${i}${extension}`;
      const originalUrl = await uploadToR2(originalKey, buffer, contentType);
      originals.push(originalUrl);

      // Create and store watermarked version
      const watermarkedBuffer = await applyWatermark(buffer);
      const watermarkedKey = `larps/${larpId}/${i}_wm${extension}`;
      const watermarkedUrl = await uploadToR2(
        watermarkedKey,
        watermarkedBuffer,
        contentType,
      );
      watermarked.push(watermarkedUrl);

      logger.info(
        { larpId, index: i },
        "Image stored with watermark",
      );
    } catch (error) {
      logger.error(
        { err: error, larpId, index: i, kieUrl },
        "Failed to process image, keeping original URL",
      );
      originals.push(kieUrl);
      watermarked.push(kieUrl);
    }
  }

  return { originals, watermarked };
}

function getExtensionFromContentType(contentType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
  };
  return map[contentType.split(";")[0].trim()] || ".jpg";
}
