import {
  createCanvasSafeImageUrl,
  drawCoverImage,
  loadDrawableImage,
  roundedRectPath,
} from "@/lib/canvas-image";
import { recordCanvasTimeline } from "@/lib/canvas-recorder";
import { downloadVideoAsMp4 } from "@/lib/video-export";

export const MARKETING_LOADER_EXPORT_WIDTH = 1080;
export const MARKETING_LOADER_EXPORT_HEIGHT = 1920;
export const MARKETING_LOADER_EXPORT_FPS = 30;
export const MARKETING_LOADER_IMAGE_APPEAR_MS = 0;
export const MARKETING_LOADER_IMAGE_FADE_MS = 600;
export const MARKETING_LOADER_BLUR_START_MS = 800;
export const MARKETING_LOADER_BLUR_DURATION_MS = 1800;
export const MARKETING_LOADER_PREPARING_MS = 2000;
export const MARKETING_LOADER_PREPARING_LABEL = "";
const MARKETING_LOADER_FONT_READY_TIMEOUT_MS = 1200;

const LOADER_DESIGN_WIDTH = 390;
const LOADER_BACKGROUND_TILE_CSS = 180;
const LOADER_CARD_HEIGHT_RATIO = 0.78;
const LOADER_CARD_MAX_WIDTH_RATIO = 0.92;
const LOADER_LOGO_HEIGHT_CSS = 96;
const LOADER_SPINNER_SIZE_CSS = 24;
const LOADER_TEXT_SIZE_CSS = 18;
const LOADER_TEXT_LINE_HEIGHT_CSS = 28;
const LOADER_GAP_CSS = 16;
const LOADER_OVERLAY_ENTER_MS = 800;
const LOADER_LOGO_PULSE_MS = 3500;
const LOADER_LOGO_PULSE_SCALE = 0.04;

type DrawMarketingLoaderFrameOptions = {
  ctx: CanvasRenderingContext2D;
  sourceImage: HTMLImageElement;
  logoImage: HTMLImageElement;
  elapsedMs: number;
  durationSeconds: number;
  gridPattern?: CanvasPattern | null;
  preparingLabel?: string;
};

export function marketingLoaderTimelineMs(durationSeconds: number) {
  return MARKETING_LOADER_PREPARING_MS + durationSeconds * 1000;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function easeOutCubic(value: number) {
  const clamped = clamp01(value);
  return 1 - Math.pow(1 - clamped, 3);
}

function easeInOutCubic(value: number) {
  const clamped = clamp01(value);
  return clamped < 0.5
    ? 4 * clamped * clamped * clamped
    : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
}

function virtualViewportFor(width: number, height: number) {
  const scale = width / LOADER_DESIGN_WIDTH;
  return {
    scale,
    width: LOADER_DESIGN_WIDTH,
    height: height / scale,
  };
}

function px(value: number, scale: number) {
  return value * scale;
}

function loaderCardRect(
  scale: number,
  viewportWidth: number,
  viewportHeight: number,
) {
  let cardHeight = viewportHeight * LOADER_CARD_HEIGHT_RATIO;
  let cardWidth = cardHeight * (9 / 16);
  const maxCardWidth = viewportWidth * LOADER_CARD_MAX_WIDTH_RATIO;
  if (cardWidth > maxCardWidth) {
    cardWidth = maxCardWidth;
    cardHeight = cardWidth * (16 / 9);
  }

  return {
    x: px((viewportWidth - cardWidth) / 2, scale),
    y: px((viewportHeight - cardHeight) / 2, scale),
    width: px(cardWidth, scale),
    height: px(cardHeight, scale),
    radius: px(8, scale),
  };
}

function loaderClockText(
  elapsedMs: number,
  durationSeconds: number,
  preparingLabel: string,
) {
  if (elapsedMs < MARKETING_LOADER_PREPARING_MS) return preparingLabel;
  const seconds = Math.min(
    durationSeconds,
    Math.max(
      0,
      Math.floor((elapsedMs - MARKETING_LOADER_PREPARING_MS) / 1000),
    ),
  );
  return `${seconds}s`;
}

export async function createMarketingLoaderGridPattern(
  ctx: CanvasRenderingContext2D,
) {
  const scale = ctx.canvas.width / LOADER_DESIGN_WIDTH;
  const tileSize = Math.round(LOADER_BACKGROUND_TILE_CSS * scale);

  try {
    const patternCanvas = document.createElement("canvas");
    patternCanvas.width = tileSize;
    patternCanvas.height = tileSize;
    const patternCtx = patternCanvas.getContext("2d");
    if (!patternCtx) return null;

    const imageData = patternCtx.createImageData(tileSize, tileSize);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const value = 220 + Math.random() * 28;
      imageData.data[i] = value;
      imageData.data[i + 1] = value;
      imageData.data[i + 2] = value;
      imageData.data[i + 3] = 46;
    }
    patternCtx.putImageData(imageData, 0, 0);

    return ctx.createPattern(patternCanvas, "repeat");
  } catch {
    return null;
  }
}

function drawLoaderBackground(
  ctx: CanvasRenderingContext2D,
  gridPattern: CanvasPattern | null | undefined,
) {
  ctx.fillStyle = "hsl(0 0% 96%)";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  if (!gridPattern) return;

  ctx.fillStyle = gridPattern;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function drawLoaderSourceImage({
  ctx,
  sourceImage,
  elapsedMs,
  scale,
  viewportWidth,
  viewportHeight,
}: {
  ctx: CanvasRenderingContext2D;
  sourceImage: HTMLImageElement;
  elapsedMs: number;
  scale: number;
  viewportWidth: number;
  viewportHeight: number;
}) {
  const imageAlpha = easeOutCubic(
    (elapsedMs - MARKETING_LOADER_IMAGE_APPEAR_MS) /
      MARKETING_LOADER_IMAGE_FADE_MS,
  );
  if (imageAlpha <= 0) return;

  const blurProgress = easeInOutCubic(
    (elapsedMs - MARKETING_LOADER_BLUR_START_MS) /
      MARKETING_LOADER_BLUR_DURATION_MS,
  );
  const card = loaderCardRect(scale, viewportWidth, viewportHeight);

  ctx.save();
  ctx.shadowColor = "rgb(0 0 0 / 0.22)";
  ctx.shadowBlur = px(24, scale);
  ctx.shadowOffsetY = px(12, scale);
  roundedRectPath(
    ctx,
    card.x,
    card.y,
    card.width,
    card.height,
    card.radius,
  );
  ctx.fillStyle = "rgb(0 0 0 / 0.01)";
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundedRectPath(
    ctx,
    card.x,
    card.y,
    card.width,
    card.height,
    card.radius,
  );
  ctx.clip();
  ctx.globalAlpha = imageAlpha;

  ctx.filter = `blur(${px(24 * blurProgress, scale)}px) brightness(${
    1 - 0.3 * blurProgress
  })`;
  drawCoverImage(
    ctx,
    sourceImage,
    card.x,
    card.y,
    card.width,
    card.height,
    1 + 0.08 * blurProgress,
  );
  ctx.restore();
}

function drawLoaderSpinner(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  size: number,
  elapsedMs: number,
) {
  const rotation = (elapsedMs / 1000) * Math.PI * 2;
  const radius = size * (9 / 24);

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(rotation);
  ctx.lineWidth = size * (2 / 24);
  ctx.lineCap = "round";
  ctx.strokeStyle = "#fff";
  ctx.shadowColor = "rgb(0 0 0 / 0.45)";
  ctx.shadowBlur = size * 0.5;
  ctx.shadowOffsetY = size * (2 / 24);
  ctx.beginPath();
  ctx.arc(0, 0, radius, -Math.PI / 2, Math.PI * 1.08);
  ctx.stroke();
  ctx.restore();
}

function drawLoaderOverlay({
  ctx,
  logoImage,
  elapsedMs,
  durationSeconds,
  scale,
  viewportWidth,
  viewportHeight,
  preparingLabel,
}: {
  ctx: CanvasRenderingContext2D;
  logoImage: HTMLImageElement;
  elapsedMs: number;
  durationSeconds: number;
  scale: number;
  viewportWidth: number;
  viewportHeight: number;
  preparingLabel: string;
}) {
  const enterProgress = easeOutCubic(elapsedMs / LOADER_OVERLAY_ENTER_MS);
  if (enterProgress <= 0) return;

  const groupScale = 0.9 + 0.1 * enterProgress;
  const groupHeight =
    LOADER_LOGO_HEIGHT_CSS +
    LOADER_GAP_CSS +
    LOADER_SPINNER_SIZE_CSS +
    LOADER_GAP_CSS +
    LOADER_TEXT_LINE_HEIGHT_CSS;
  const groupTop = (viewportHeight - groupHeight) / 2;
  const groupCenterY = viewportHeight / 2;
  const centerX = viewportWidth / 2;
  const pulseProgress = (elapsedMs % LOADER_LOGO_PULSE_MS) / LOADER_LOGO_PULSE_MS;
  const pulseWave = (1 - Math.cos(pulseProgress * Math.PI * 2)) / 2;
  const logoPulseScale = 1 + LOADER_LOGO_PULSE_SCALE * pulseWave;
  const logoRatio = logoImage.naturalWidth / logoImage.naturalHeight;
  const logoCenterY = groupTop + LOADER_LOGO_HEIGHT_CSS / 2;
  const drawLogoCenterY =
    groupCenterY + (logoCenterY - groupCenterY) * groupScale;
  const logoHeight = LOADER_LOGO_HEIGHT_CSS * groupScale * logoPulseScale;
  const logoWidth = logoHeight * logoRatio;

  ctx.save();
  ctx.globalAlpha = enterProgress;
  ctx.shadowColor = "rgb(0 0 0 / 0.5)";
  ctx.shadowBlur = px(40, scale);
  ctx.drawImage(
    logoImage,
    px(centerX - logoWidth / 2, scale),
    px(drawLogoCenterY - logoHeight / 2, scale),
    px(logoWidth, scale),
    px(logoHeight, scale),
  );
  ctx.restore();

  const spinnerCenterY =
    groupTop +
    LOADER_LOGO_HEIGHT_CSS +
    LOADER_GAP_CSS +
    LOADER_SPINNER_SIZE_CSS / 2;
  drawLoaderSpinner(
    ctx,
    px(centerX, scale),
    px(groupCenterY + (spinnerCenterY - groupCenterY) * groupScale, scale),
    px(LOADER_SPINNER_SIZE_CSS * groupScale, scale),
    elapsedMs,
  );

  const textTop =
    groupTop +
    LOADER_LOGO_HEIGHT_CSS +
    LOADER_GAP_CSS +
    LOADER_SPINNER_SIZE_CSS +
    LOADER_GAP_CSS;
  const drawTextY = groupCenterY + (textTop - groupCenterY) * groupScale;
  const clockText = loaderClockText(elapsedMs, durationSeconds, preparingLabel);
  if (!clockText) return;

  ctx.save();
  ctx.globalAlpha = enterProgress;
  ctx.fillStyle = "#fff";
  ctx.font = `600 ${px(LOADER_TEXT_SIZE_CSS * groupScale, scale)}px "DM Sans", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgb(0 0 0 / 0.45)";
  ctx.shadowBlur = px(12, scale);
  ctx.shadowOffsetY = px(2, scale);
  ctx.fillText(
    clockText,
    px(centerX, scale),
    px(drawTextY, scale),
  );
  ctx.restore();
}

export function drawMarketingLoaderFrame({
  ctx,
  sourceImage,
  logoImage,
  elapsedMs,
  durationSeconds,
  gridPattern,
  preparingLabel = MARKETING_LOADER_PREPARING_LABEL,
}: DrawMarketingLoaderFrameOptions) {
  const { scale, width, height } = virtualViewportFor(
    ctx.canvas.width,
    ctx.canvas.height,
  );

  ctx.save();
  drawLoaderBackground(ctx, gridPattern);
  drawLoaderSourceImage({
    ctx,
    sourceImage,
    elapsedMs,
    scale,
    viewportWidth: width,
    viewportHeight: height,
  });
  drawLoaderOverlay({
    ctx,
    logoImage,
    elapsedMs,
    durationSeconds,
    scale,
    viewportWidth: width,
    viewportHeight: height,
    preparingLabel,
  });
  ctx.restore();
}

export async function waitForMarketingLoaderFonts() {
  if (!document.fonts?.ready) return;

  await Promise.race([
    document.fonts.ready,
    new Promise<void>((resolve) =>
      window.setTimeout(resolve, MARKETING_LOADER_FONT_READY_TIMEOUT_MS),
    ),
  ]);
}

export async function exportMarketingLoaderVideo({
  sourceUrl,
  durationSeconds,
  speedMultiplier,
  filename,
}: {
  sourceUrl: string;
  durationSeconds: number;
  speedMultiplier: number;
  filename: string;
}) {
  const objectUrlsToRevoke: string[] = [];

  try {
    const safeSourceUrl = await createCanvasSafeImageUrl(sourceUrl);
    if (safeSourceUrl.startsWith("blob:")) {
      objectUrlsToRevoke.push(safeSourceUrl);
    }

    await waitForMarketingLoaderFonts();

    const [sourceImage, logoImage] = await Promise.all([
      loadDrawableImage(safeSourceUrl),
      loadDrawableImage("/luxeflexia-logo.png"),
    ]);

    const canvas = document.createElement("canvas");
    canvas.width = MARKETING_LOADER_EXPORT_WIDTH;
    canvas.height = MARKETING_LOADER_EXPORT_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas non support\u00e9");

    const gridPattern = await createMarketingLoaderGridPattern(ctx);
    const timelineTotalMs = marketingLoaderTimelineMs(durationSeconds);
    const outputTotalMs = timelineTotalMs / speedMultiplier;

    const blob = await recordCanvasTimeline({
      canvas,
      fps: MARKETING_LOADER_EXPORT_FPS,
      durationMs: outputTotalMs,
      drawFrame: (elapsedMs) => {
        drawMarketingLoaderFrame({
          ctx,
          sourceImage,
          logoImage,
          elapsedMs: Math.min(timelineTotalMs, elapsedMs * speedMultiplier),
          durationSeconds,
          gridPattern,
        });
      },
    });

    await downloadVideoAsMp4(blob, filename);
  } finally {
    objectUrlsToRevoke.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
  }
}
