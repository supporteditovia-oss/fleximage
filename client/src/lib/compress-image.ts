/**
 * Client-side image shrink for generation API calls.
 * Vercel serverless rejects bodies over ~4.5MB (FUNCTION_PAYLOAD_TOO_LARGE).
 * Phone HEIC/JPEG often become 8–15MB as base64 data URLs.
 */

const MAX_EDGE_PX = 1536;
/** Soft target per file before base64 (~1.25× in JSON). */
const TARGET_BYTES = 900_000;
const HARD_MAX_BYTES = 1_400_000;

function canvasToJpegBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

/**
 * Downscale + JPEG-compress a photo so generate-direct / generate-video
 * payloads stay under Vercel's request size limit.
 */
export async function compressImageForGeneration(file: File): Promise<File> {
  if (file.type.startsWith("video/")) return file;

  // Already small enough — keep original (faster, no quality loss).
  if (
    file.size <= TARGET_BYTES &&
    (file.type === "image/jpeg" || file.type === "image/jpg" || file.type === "image/webp")
  ) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(MAX_EDGE_PX / bitmap.width, MAX_EDGE_PX / bitmap.height, 1);
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    let quality = 0.82;
    let blob = await canvasToJpegBlob(canvas, quality);

    // Tighten quality until under hard max (handles huge phone photos).
    while (blob && blob.size > HARD_MAX_BYTES && quality > 0.45) {
      quality -= 0.08;
      blob = await canvasToJpegBlob(canvas, quality);
    }

    // Still too big → shrink dimensions once more.
    if (blob && blob.size > HARD_MAX_BYTES) {
      const shrink = Math.sqrt(HARD_MAX_BYTES / blob.size);
      const w2 = Math.max(1, Math.round(w * Math.min(shrink, 0.75)));
      const h2 = Math.max(1, Math.round(h * Math.min(shrink, 0.75)));
      canvas.width = w2;
      canvas.height = h2;
      const bmp2 = await createImageBitmap(file);
      ctx.drawImage(bmp2, 0, 0, w2, h2);
      bmp2.close();
      blob = await canvasToJpegBlob(canvas, 0.72);
    }

    if (!blob) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } catch (err) {
    console.warn("[compress-image] fallback to original", err);
    return file;
  }
}
