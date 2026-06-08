import {
  createCanvasSafeImageUrl,
  createGrainPattern,
  drawCoverImage,
  loadDrawableImage,
} from "@/lib/canvas-image";
import { downloadVideoAsMp4 } from "@/lib/video-export";
import { recordCanvasTimeline } from "@/lib/canvas-recorder";
import { hookStateAt } from "@/components/admin/HookVideo";
import {
  buildWritingTimeline,
  drawKeyboardWritingFrame,
} from "@/components/admin/KeyboardWritingVideo";
import {
  createMarketingLoaderGridPattern,
  drawMarketingLoaderFrame,
  marketingLoaderTimelineMs,
  waitForMarketingLoaderFonts,
} from "@/components/admin/MarketingLoaderVideo";

const EXPORT_WIDTH = 1080;
const EXPORT_HEIGHT = 1920;
const EXPORT_FPS = 30;

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
  await waitForMarketingLoaderFonts();

  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_WIDTH;
  canvas.height = EXPORT_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non supporté");

  const grainPattern = createGrainPattern(ctx);
  const loaderGridPattern = await createMarketingLoaderGridPattern(ctx);
  const hookDurationMs = hookDurationSeconds * 1000;
  const writingTimeline = buildWritingTimeline(writingPrompt, writingSpeedMultiplier);
  const loaderTimelineMs = marketingLoaderTimelineMs(loaderDurationSeconds);
  const loaderOutputMs = loaderTimelineMs / loaderSpeedMultiplier;
  const totalMs = hookDurationMs + writingTimeline.totalMs + loaderOutputMs;

  const blob = await recordCanvasTimeline({
    canvas,
    fps: EXPORT_FPS,
    durationMs: totalMs,
    drawFrame: (elapsedMs) => {
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
        const loaderElapsed =
          (elapsedMs - hookDurationMs - writingTimeline.totalMs) *
          loaderSpeedMultiplier;
        drawMarketingLoaderFrame({
          ctx,
          sourceImage: beforeImage,
          logoImage,
          elapsedMs: Math.min(loaderTimelineMs, loaderElapsed),
          durationSeconds: loaderDurationSeconds,
          gridPattern: loaderGridPattern,
        });
      }
    },
  });

  objectUrlsToRevoke.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
  await downloadVideoAsMp4(blob, filename);
}
