import { authFetch } from "@/lib/api";

export function loadDrawableImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Impossible de charger l'image"));
    img.src = src;
  });
}

/**
 * External (R2) images are blocked by CORS when drawn to a canvas. We proxy
 * them through a same-origin admin endpoint so they become canvas-safe.
 */
export async function createCanvasSafeImageUrl(src: string): Promise<string> {
  if (src.startsWith("/") || src.startsWith("data:") || src.startsWith("blob:")) {
    return src;
  }

  const proxyUrl = `/api/admin/marketing/image-proxy?url=${encodeURIComponent(src)}`;
  const response = await authFetch(proxyUrl);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export function getSupportedVideoMimeType() {
  const candidates = [
    "video/mp4;codecs=h264",
    'video/mp4;codecs="avc1.42E01E"',
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  scale = 1,
) {
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const boxRatio = width / height;
  const drawWidth = imageRatio > boxRatio ? height * imageRatio : width;
  const drawHeight = imageRatio > boxRatio ? height : width / imageRatio;
  const scaledWidth = drawWidth * scale;
  const scaledHeight = drawHeight * scale;
  const drawX = x + (width - scaledWidth) / 2;
  const drawY = y + (height - scaledHeight) / 2;
  ctx.drawImage(image, drawX, drawY, scaledWidth, scaledHeight);
}

export function createGrainPattern(ctx: CanvasRenderingContext2D) {
  const size = 180;
  const grainCanvas = document.createElement("canvas");
  grainCanvas.width = size;
  grainCanvas.height = size;
  const grainCtx = grainCanvas.getContext("2d");
  if (!grainCtx) return null;

  const imageData = grainCtx.createImageData(size, size);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const value = Math.random() * 255;
    imageData.data[i] = value;
    imageData.data[i + 1] = value;
    imageData.data[i + 2] = value;
    imageData.data[i + 3] = 34;
  }
  grainCtx.putImageData(imageData, 0, 0);
  return ctx.createPattern(grainCanvas, "repeat");
}
