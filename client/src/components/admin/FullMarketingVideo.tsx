import {
  createCanvasSafeImageUrl,
  createGrainPattern,
  drawCoverImage,
  getSupportedVideoMimeType,
  loadDrawableImage,
  roundedRectPath,
} from "@/lib/canvas-image";
import { hookStateAt } from "@/components/admin/HookVideo";
import {
  buildKeyboardKeys,
  buildWritingTimeline,
  charToKey,
  drawCanvasKey,
  drawSendHorizonalIcon,
  drawToolbarGlyph,
  pressedIndexAt,
  resolveActiveLayer,
  typedCountAt,
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
  const timeline = buildWritingTimeline(prompt, speedMultiplier);
  const pad = EXPORT_WIDTH * 0.035;
  const slotGap = 22;
  const slotW = (EXPORT_WIDTH - pad * 2 - slotGap) / 2;
  const slotH = slotW * (16 / 9);
  const inputTop = EXPORT_HEIGHT * 0.225;
  const inputH = 96;
  const faceTop = inputTop + inputH + 26;
  const faceH = 112;
  const templatesY = faceTop + faceH + 68;
  const titleY = EXPORT_HEIGHT * 0.51;
  const keyboardH = EXPORT_HEIGHT * 0.36;
  const keyboardY = EXPORT_HEIGHT - keyboardH;

  ctx.save();
  ctx.fillStyle = "hsl(0 0% 96%)";
  ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
  if (grainPattern) {
    ctx.fillStyle = grainPattern;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(0, 0, EXPORT_WIDTH, keyboardY);
    ctx.globalAlpha = 1;
  }

  const imageClipTop = 92;
  const imageClipBottom = inputTop - 18;
  const croppedImagesTop = imageClipTop - slotH * 0.52;
  const slot2X = pad + slotW + slotGap;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, imageClipTop, EXPORT_WIDTH, imageClipBottom - imageClipTop);
  ctx.clip();
  roundedRectPath(ctx, pad, croppedImagesTop, slotW, slotH, 28);
  ctx.save();
  ctx.clip();
  drawCoverImage(ctx, beforeImage, pad, croppedImagesTop, slotW, slotH);
  ctx.restore();
  roundedRectPath(ctx, slot2X, croppedImagesTop, slotW, slotH, 28);
  ctx.setLineDash([14, 12]);
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(0,0,0,0.22)";
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = "rgba(0,0,0,0.28)";
  ctx.lineWidth = 6;
  const plusCx = slot2X + slotW / 2;
  const plusCy = croppedImagesTop + slotH / 2;
  ctx.beginPath();
  ctx.moveTo(plusCx - 26, plusCy);
  ctx.lineTo(plusCx + 26, plusCy);
  ctx.moveTo(plusCx, plusCy - 26);
  ctx.lineTo(plusCx, plusCy + 26);
  ctx.stroke();
  ctx.restore();

  const chromeH = 92;
  ctx.fillStyle = "#30363a";
  ctx.fillRect(0, 0, EXPORT_WIDTH, chromeH);
  const urlBarX = EXPORT_WIDTH * 0.03;
  const urlBarY = 16;
  const urlBarW = EXPORT_WIDTH * 0.94;
  const urlBarH = 60;
  roundedRectPath(ctx, urlBarX, urlBarY, urlBarW, urlBarH, urlBarH / 2);
  ctx.fillStyle = "#6a7076";
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "500 32px 'DM Sans', -apple-system, 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("larpking.com", EXPORT_WIDTH / 2, urlBarY + urlBarH / 2 + 5);

  roundedRectPath(ctx, pad, inputTop, EXPORT_WIDTH - pad * 2, inputH, 30);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const typedCount = typedCountAt(elapsedMs, timeline);
  const typedText = prompt.slice(0, typedCount);
  ctx.fillStyle = "#000";
  ctx.font = "400 36px 'DM Sans', -apple-system, 'Segoe UI', sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const textX = pad + 28;
  const textY = inputTop + inputH / 2;
  const maxTextW = EXPORT_WIDTH - pad * 2 - 56 - 120;
  let displayText = typedText;
  while (displayText.length > 0 && ctx.measureText(displayText).width > maxTextW) {
    displayText = displayText.slice(1);
  }
  ctx.fillText(displayText, textX, textY);
  const caretX = textX + ctx.measureText(displayText).width + 4;
  ctx.fillStyle = "#0a84ff";
  ctx.fillRect(caretX, textY - 20, 4, 40);

  const sendR = 30;
  const sendCx = EXPORT_WIDTH - pad - 28 - sendR;
  ctx.beginPath();
  ctx.arc(sendCx, textY, sendR, 0, Math.PI * 2);
  ctx.fillStyle = "#000";
  ctx.fill();
  drawSendHorizonalIcon(ctx, sendCx, textY, 38);

  roundedRectPath(ctx, pad, faceTop, EXPORT_WIDTH - pad * 2, faceH, 22);
  ctx.fillStyle = "rgba(255,255,255,0.46)";
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.1)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#111";
  ctx.font = "600 36px 'DM Sans', -apple-system, 'Segoe UI', sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Use my face", pad + 112, faceTop + faceH / 2);
  const toggleW = 96;
  const toggleH = 56;
  const toggleX = EXPORT_WIDTH - pad - 32 - toggleW;
  const toggleY = faceTop + faceH / 2 - toggleH / 2;
  roundedRectPath(ctx, toggleX, toggleY, toggleW, toggleH, toggleH / 2);
  ctx.fillStyle = "#050505";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(toggleX + toggleW - toggleH / 2, faceTop + faceH / 2, toggleH / 2 - 6, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.font = "600 30px 'DM Sans', -apple-system, 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("View templates", EXPORT_WIDTH / 2 - 18, templatesY);
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(EXPORT_WIDTH / 2 + 112, templatesY - 8);
  ctx.lineTo(EXPORT_WIDTH / 2 + 126, templatesY + 6);
  ctx.lineTo(EXPORT_WIDTH / 2 + 140, templatesY - 8);
  ctx.stroke();

  ctx.fillStyle = "#080808";
  ctx.font = "800 58px 'Outfit', 'DM Sans', -apple-system, 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("Choose from existing LARPs", EXPORT_WIDTH / 2, titleY);
  const titleWidth = ctx.measureText("Choose from existing LARPs").width;
  ctx.strokeStyle = "#080808";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo((EXPORT_WIDTH - titleWidth) / 2 - 2, titleY + 18);
  ctx.lineTo((EXPORT_WIDTH + titleWidth) / 2 + 2, titleY + 18);
  ctx.stroke();

  const keyboardGradient = ctx.createLinearGradient(0, keyboardY, 0, EXPORT_HEIGHT);
  keyboardGradient.addColorStop(0, "rgba(16,20,31,0.94)");
  keyboardGradient.addColorStop(0.58, "rgba(29,30,37,0.84)");
  keyboardGradient.addColorStop(1, "rgba(10,11,16,0.9)");
  ctx.fillStyle = keyboardGradient;
  ctx.fillRect(0, keyboardY, EXPORT_WIDTH, keyboardH);
  const accessoryH = 92;
  ctx.fillStyle = "#222225";
  ctx.fillRect(0, keyboardY, EXPORT_WIDTH, accessoryH);
  const toolbarY = keyboardY + accessoryH / 2;
  const toolbarStartX = EXPORT_WIDTH * 0.62;
  const toolbarGap = EXPORT_WIDTH * 0.095;
  drawToolbarGlyph(ctx, "key", toolbarStartX, toolbarY, 0.82);
  drawToolbarGlyph(ctx, "card", toolbarStartX + toolbarGap, toolbarY, 0.82);
  drawToolbarGlyph(ctx, "pin", toolbarStartX + toolbarGap * 2, toolbarY, 0.82);
  drawToolbarGlyph(ctx, "keyboard", toolbarStartX + toolbarGap * 3, toolbarY, 0.82);

  const pressedIndex = pressedIndexAt(elapsedMs, timeline);
  const pressedKey = pressedIndex !== null ? charToKey(prompt[pressedIndex]) : null;
  const shiftActive = pressedKey?.shift ?? false;
  const layer = resolveActiveLayer(prompt, pressedIndex, typedCount);
  const keys = buildKeyboardKeys(layer, shiftActive, {
    x: 0,
    y: keyboardY + accessoryH,
    w: EXPORT_WIDTH,
    h: keyboardH - accessoryH,
  });
  keys.forEach((key) => {
    const isPressed =
      (pressedKey?.layer === layer && pressedKey.keyId === key.keyId) ||
      (key.keyId === "__shift" && layer === "letters" && shiftActive);
    drawCanvasKey(ctx, key, isPressed);
  });

  ctx.restore();
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
    recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
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
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  stream.getTracks().forEach((track) => track.stop());
  objectUrlsToRevoke.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
}
