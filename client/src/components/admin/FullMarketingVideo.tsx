import {
  createCanvasSafeImageUrl,
  createGrainPattern,
  drawCoverImage,
  getSupportedVideoMimeType,
  loadDrawableImage,
  roundedRectPath,
} from "@/lib/canvas-image";
import { downloadVideoAsMp4 } from "@/lib/video-export";
import { hookStateAt } from "@/components/admin/HookVideo";
import {
  buildWritingTimeline,
  drawKeyboardWritingFrame,
} from "@/components/admin/KeyboardWritingVideo";

const EXPORT_WIDTH = 1080;
const EXPORT_HEIGHT = 1920;
const EXPORT_FPS = 30;
const LOADER_IMAGE_APPEAR_MS = 300;
const LOADER_BLUR_START_MS = 800;
const LOADER_LOGO_START_MS = 1200;
const LOADER_BLUR_DURATION_MS = 1800;
const LOADER_LOGO_FADE_MS = 700;

function easeOutCubic(value: number) {
  const clamped = Math.min(1, Math.max(0, value));
  return 1 - Math.pow(1 - clamped, 3);
}

function drawHookScene(
  ctx: CanvasRenderingContext2D,
  beforeImage: HTMLImageElement,
  afterImage: HTMLImageElement,
  elapsedMs: number,
  durationMs: number,
) {
  const { phase, scale } = hookStateAt(elapsedMs, durationMs);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
  drawCoverImage(
    ctx,
    phase === "before" ? beforeImage : afterImage,
    0,
    0,
    EXPORT_WIDTH,
    EXPORT_HEIGHT,
    scale,
  );
}

function drawWritingScene({
  ctx,
  beforeImage,
  prompt,
  speedMultiplier,
  elapsedMs,
  grainPattern,
}: {
  ctx: CanvasRenderingContext2D;
  beforeImage: HTMLImageElement;
  prompt: string;
  speedMultiplier: number;
  elapsedMs: number;
  grainPattern: CanvasPattern | null;
}) {
  drawKeyboardWritingFrame(ctx, {
    prompt,
    beforeImage,
    speedMultiplier,
    elapsedMs,
    isPlaying: true,
    grainPattern,
  });
}

function drawLoaderScene({
  ctx,
  beforeImage,
  logoImage,
  elapsedMs,
  durationSeconds,
  grainPattern,
}: {
  ctx: CanvasRenderingContext2D;
  beforeImage: HTMLImageElement;
  logoImage: HTMLImageElement;
  elapsedMs: number;
  durationSeconds: number;
  grainPattern: CanvasPattern | null;
}) {
  ctx.save();
  ctx.fillStyle = "hsl(0 0% 96%)";
  ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
  if (grainPattern) {
    ctx.fillStyle = grainPattern;
    ctx.globalAlpha = 0.75;
    ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
    ctx.globalAlpha = 1;
  }

  const cardHeight = EXPORT_HEIGHT * 0.78;
  const cardWidth = cardHeight * (9 / 16);
  const cardX = (EXPORT_WIDTH - cardWidth) / 2;
  const cardY = (EXPORT_HEIGHT - cardHeight) / 2;
  const imageAlpha = easeOutCubic((elapsedMs - LOADER_IMAGE_APPEAR_MS) / 600);
  const blurProgress = easeOutCubic((elapsedMs - LOADER_BLUR_START_MS) / LOADER_BLUR_DURATION_MS);

  if (imageAlpha > 0) {
    ctx.save();
    roundedRectPath(ctx, cardX, cardY, cardWidth, cardHeight, 28);
    ctx.clip();
    ctx.globalAlpha = imageAlpha;
    ctx.filter = `blur(${24 * blurProgress}px) brightness(${1 - 0.32 * blurProgress})`;
    drawCoverImage(ctx, beforeImage, cardX, cardY, cardWidth, cardHeight, 1 + 0.08 * blurProgress);
    ctx.filter = "none";
    ctx.globalAlpha = blurProgress * 0.12;
    ctx.fillStyle = "#000";
    ctx.fillRect(cardX, cardY, cardWidth, cardHeight);
    ctx.restore();
  }

  const logoAlpha = easeOutCubic((elapsedMs - LOADER_LOGO_START_MS) / LOADER_LOGO_FADE_MS);
  if (logoAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = logoAlpha;
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 22;
    const pulseCycleMs = 3500;
    const pulseProgress = ((elapsedMs - LOADER_LOGO_START_MS) % pulseCycleMs) / pulseCycleMs;
    const pulseWave = (1 - Math.cos(pulseProgress * Math.PI * 2)) / 2;
    const logoScale = 1 + 0.04 * pulseWave;
    const baseLogoWidth = EXPORT_WIDTH * 0.58;
    const logoWidth = baseLogoWidth * logoScale;
    const logoHeight = logoWidth * (logoImage.naturalHeight / logoImage.naturalWidth);
    ctx.drawImage(logoImage, (EXPORT_WIDTH - logoWidth) / 2, EXPORT_HEIGHT * 0.39 - logoHeight / 2, logoWidth, logoHeight);

    const centerX = EXPORT_WIDTH / 2;
    const spinnerY = EXPORT_HEIGHT * 0.52;
    const rotation = (elapsedMs / 650) * Math.PI * 2;
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#fff";
    ctx.beginPath();
    ctx.arc(centerX, spinnerY, 24, rotation, rotation + Math.PI * 1.45);
    ctx.stroke();
    const seconds = Math.min(
      durationSeconds,
      Math.max(0, Math.floor((elapsedMs - LOADER_LOGO_START_MS) / 1000)),
    );
    ctx.font = "700 64px sans-serif";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(`${seconds}s`, centerX, spinnerY + 62);
    ctx.restore();
  }

  ctx.restore();
}

export async function exportFullMarketingVideo({
  beforeImageUrl,
  afterImageUrl,
  writingPrompt,
  writingSpeedMultiplier,
  hookDurationSeconds,
  loaderDurationSeconds,
  loaderSpeedMultiplier,
  filename,
}: {
  beforeImageUrl: string;
  afterImageUrl: string;
  writingPrompt: string;
  writingSpeedMultiplier: number;
  hookDurationSeconds: number;
  loaderDurationSeconds: number;
  loaderSpeedMultiplier: number;
  filename: string;
}) {
  const objectUrlsToRevoke: string[] = [];
  const safeBefore = await createCanvasSafeImageUrl(beforeImageUrl);
  if (safeBefore.startsWith("blob:")) objectUrlsToRevoke.push(safeBefore);
  const safeAfter = await createCanvasSafeImageUrl(afterImageUrl);
  if (safeAfter.startsWith("blob:")) objectUrlsToRevoke.push(safeAfter);

  const [beforeImage, afterImage, logoImage] = await Promise.all([
    loadDrawableImage(safeBefore),
    loadDrawableImage(safeAfter),
    loadDrawableImage("/assets/larpking.png"),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_WIDTH;
  canvas.height = EXPORT_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non supporté");

  const grainPattern = createGrainPattern(ctx);
  const hookDurationMs = hookDurationSeconds * 1000;
  const writingTimeline = buildWritingTimeline(writingPrompt, writingSpeedMultiplier);
  const loaderTimelineMs = LOADER_LOGO_START_MS + loaderDurationSeconds * 1000;
  const loaderOutputMs = loaderTimelineMs / loaderSpeedMultiplier;
  const totalMs = hookDurationMs + writingTimeline.totalMs + loaderOutputMs;

  const stream = canvas.captureStream(EXPORT_FPS);
  const mimeType = getSupportedVideoMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: BlobPart[] = [];
  const stopped = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () => reject(new Error("Erreur pendant l'enregistrement"));
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType || "video/webm" }));
  });

  recorder.start();
  const videoTrack = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;
  const startedAt = performance.now();

  await new Promise<void>((resolve) => {
    const tick = () => {
      const elapsedMs = performance.now() - startedAt;
      if (elapsedMs < hookDurationMs) {
        drawHookScene(ctx, beforeImage, afterImage, elapsedMs, hookDurationMs);
      } else if (elapsedMs < hookDurationMs + writingTimeline.totalMs) {
        drawWritingScene({
          ctx,
          beforeImage,
          prompt: writingPrompt,
          speedMultiplier: writingSpeedMultiplier,
          elapsedMs: elapsedMs - hookDurationMs,
          grainPattern,
        });
      } else {
        const loaderElapsed = (elapsedMs - hookDurationMs - writingTimeline.totalMs) * loaderSpeedMultiplier;
        drawLoaderScene({
          ctx,
          beforeImage,
          logoImage,
          elapsedMs: Math.min(loaderTimelineMs, loaderElapsed),
          durationSeconds: loaderDurationSeconds,
          grainPattern,
        });
      }

      videoTrack.requestFrame?.();
      if (elapsedMs >= totalMs) {
        resolve();
        return;
      }
      window.setTimeout(tick, 1000 / EXPORT_FPS);
    };
    tick();
  });

  recorder.stop();
  const blob = await stopped;
  stream.getTracks().forEach((track) => track.stop());
  objectUrlsToRevoke.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
  await downloadVideoAsMp4(blob, filename);
}
