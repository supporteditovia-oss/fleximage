export type BeforeAfterExportLabels = {
  before: string;
  after: string;
  brand: string;
};

type CreateBeforeAfterVideoParams = {
  beforeUrl: string;
  afterUrl: string;
  labels: BeforeAfterExportLabels;
  durationSec?: number;
};

async function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("image_load_failed"));
      img.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function pickRecorderMimeType(): string | undefined {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return undefined;
}

/**
 * Vidéo verticale 9:16 — avant → transition → après, optimisée TikTok/Reels.
 */
export async function createBeforeAfterVideo({
  beforeUrl,
  afterUrl,
  labels,
  durationSec = 6,
}: CreateBeforeAfterVideoParams): Promise<Blob> {
  if (typeof document === "undefined" || typeof MediaRecorder === "undefined") {
    throw new Error("unsupported");
  }

  const mimeType = pickRecorderMimeType();
  if (!mimeType) throw new Error("unsupported");

  const [beforeImg, afterImg] = await Promise.all([
    loadImageFromUrl(beforeUrl),
    loadImageFromUrl(afterUrl),
  ]);

  const W = 1080;
  const H = 1920;
  const fps = 30;
  const totalFrames = Math.round(durationSec * fps);
  const beforeEnd = Math.round(totalFrames * 0.38);
  const transitionEnd = Math.round(totalFrames * 0.52);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");

  const stream = canvas.captureStream(fps);
  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });

  const done = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () => reject(new Error("recorder_error"));
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType.split(";")[0] }));
    };
  });

  recorder.start();

  for (let frame = 0; frame < totalFrames; frame += 1) {
    ctx.fillStyle = "#0a0908";
    ctx.fillRect(0, 0, W, H);

    const pad = 56;
    const imgTop = 280;
    const imgH = H - imgTop - 260;
    const imgW = W - pad * 2;

    if (frame <= beforeEnd) {
      drawCover(ctx, beforeImg, pad, imgTop, imgW, imgH);
    } else if (frame <= transitionEnd) {
      const t = (frame - beforeEnd) / Math.max(1, transitionEnd - beforeEnd);
      ctx.save();
      ctx.beginPath();
      ctx.rect(pad, imgTop, imgW * (1 - t), imgH);
      ctx.clip();
      drawCover(ctx, beforeImg, pad, imgTop, imgW, imgH);
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.rect(pad + imgW * (1 - t), imgTop, imgW * t, imgH);
      ctx.clip();
      drawCover(ctx, afterImg, pad, imgTop, imgW, imgH);
      ctx.restore();
    } else {
      drawCover(ctx, afterImg, pad, imgTop, imgW, imgH);
    }

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "600 44px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(frame <= beforeEnd ? labels.before : labels.after, pad, imgTop - 36);

    ctx.fillStyle = "rgba(201,162,39,0.95)";
    ctx.font = "600 32px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(labels.brand, W / 2, H - 120);

    await new Promise((r) => requestAnimationFrame(r));
  }

  recorder.stop();
  return done;
}

export function beforeAfterVideoExtension(mime: string): string {
  if (mime.includes("mp4")) return "mp4";
  return "webm";
}
