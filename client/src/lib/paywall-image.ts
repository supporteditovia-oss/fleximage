const STORAGE_KEY = "larpking_paywall_image";

function drawToCanvas(
  bitmap: ImageBitmap,
  w: number,
  h: number,
): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("OffscreenCanvas 2d unavailable");
    ctx.drawImage(bitmap, 0, 0, w, h);
    return canvas;
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas;
}

async function canvasToJpegDataUrl(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  quality: number,
): Promise<string> {
  if (canvas instanceof HTMLCanvasElement) {
    return canvas.toDataURL("image/jpeg", quality);
  }

  const blob = await canvas.convertToBlob({
    type: "image/jpeg",
    quality,
  });
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Downscale + compress the user's LARP image and persist it in localStorage.
 * The image is stored as a small JPEG base64 — it will only be displayed blurred,
 * so low resolution is fine and keeps localStorage usage minimal (~20-50 KB).
 *
 * Uses HTMLCanvasElement fallback when OffscreenCanvas is missing (older iOS Safari).
 */
export async function savePaywallImage(file: File): Promise<void> {
  try {
    const bitmap = await createImageBitmap(file);
    const MAX = 300; // px — tiny is fine, it's always blurred
    const scale = Math.min(MAX / bitmap.width, MAX / bitmap.height, 1);
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = drawToCanvas(bitmap, w, h);
    bitmap.close();

    const base64 = await canvasToJpegDataUrl(canvas, 0.5);
    localStorage.setItem(STORAGE_KEY, base64);
  } catch (err) {
    console.warn("[paywall-image] Failed to save paywall image:", err);
  }
}

/** Save a paywall image from a base64 data-URL (e.g. from LARP generation input). */
export function savePaywallImageFromDataUrl(dataUrl: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, dataUrl);
  } catch {
    // quota exceeded — silent fail
  }
}

/** Get the persisted paywall image as a data-URL, or null. */
export function getPaywallImage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Clear the persisted paywall image (call after successful payment). */
export function clearPaywallImage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silent fail
  }
}
