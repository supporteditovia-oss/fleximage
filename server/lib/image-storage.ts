import { uploadToR2 } from "./r2-client";
import { logger } from "./logger";

/**
 * Download images from Kie.ai URLs and re-upload them to R2.
 * Returns an array of R2 public URLs.
 * If an individual image fails, the original Kie.ai URL is kept as fallback.
 */
export async function downloadAndStoreImages(
  prankId: string,
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

      const key = `pranks/${prankId}/${i}${extension}`;
      const r2Url = await uploadToR2(key, buffer, contentType);
      r2Urls.push(r2Url);

      logger.info(
        { prankId, index: i, originalUrl: kieUrl, r2Url },
        "Image re-uploaded to R2"
      );
    } catch (error) {
      logger.error(
        { err: error, prankId, index: i, kieUrl },
        "Failed to re-upload image to R2, keeping original URL"
      );
      r2Urls.push(kieUrl);
    }
  }

  return r2Urls;
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
