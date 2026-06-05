import { useEffect, useMemo, useRef, useState } from "react";
import { Play } from "lucide-react";
import {
  createCanvasSafeImageUrl,
  createGrainPattern,
  drawCoverImage,
  getSupportedVideoMimeType,
  loadDrawableImage,
  roundedRectPath,
} from "@/lib/canvas-image";
import { downloadVideoAsMp4 } from "@/lib/video-export";

// --- Timing model -----------------------------------------------------------
// Duration is derived automatically from the prompt length. Speed (x1 = normal)
// only scales the per-character interval, so x2 types twice as fast.
export const WRITING_BASE_MS_PER_CHAR = 165;
export const WRITING_START_DELAY_MS = 450;
export const WRITING_END_HOLD_MS = 1500;
export const DEFAULT_WRITING_SPEED_MULTIPLIER = 2;
export const MIN_WRITING_SPEED_MULTIPLIER = 0.5;
export const MAX_WRITING_SPEED_MULTIPLIER = 8;

export function clampWritingSpeed(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : DEFAULT_WRITING_SPEED_MULTIPLIER;
  if (!Number.isFinite(parsed)) return DEFAULT_WRITING_SPEED_MULTIPLIER;
  return Math.min(
    MAX_WRITING_SPEED_MULTIPLIER,
    Math.max(MIN_WRITING_SPEED_MULTIPLIER, Math.round(parsed * 100) / 100),
  );
}

type WritingTimeline = {
  intervalMs: number;
  startDelayMs: number;
  endHoldMs: number;
  totalMs: number;
  charCount: number;
};

export function buildWritingTimeline(
  prompt: string,
  speed: number,
): WritingTimeline {
  const charCount = prompt.length;
  const intervalMs = WRITING_BASE_MS_PER_CHAR / Math.max(0.1, speed);
  const totalMs =
    WRITING_START_DELAY_MS + charCount * intervalMs + WRITING_END_HOLD_MS;
  return {
    intervalMs,
    startDelayMs: WRITING_START_DELAY_MS,
    endHoldMs: WRITING_END_HOLD_MS,
    totalMs,
    charCount,
  };
}

export function typedCountAt(elapsedMs: number, timeline: WritingTimeline): number {
  if (elapsedMs <= timeline.startDelayMs) return 0;
  return Math.max(
    0,
    Math.min(
      timeline.charCount,
      Math.floor((elapsedMs - timeline.startDelayMs) / timeline.intervalMs),
    ),
  );
}

export function pressedIndexAt(
  elapsedMs: number,
  timeline: WritingTimeline,
): number | null {
  const typed = typedCountAt(elapsedMs, timeline);
  if (typed >= timeline.charCount) return null;
  const appearTime = timeline.startDelayMs + (typed + 1) * timeline.intervalMs;
  const flash = Math.min(timeline.intervalMs * 0.62, 130);
  if (elapsedMs >= appearTime - flash && elapsedMs < appearTime) return typed;
  return null;
}

// --- Apple keyboard layout (AZERTY) -----------------------------------------
const LETTER_ROWS = [
  ["a", "z", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["q", "s", "d", "f", "g", "h", "j", "k", "l", "m"],
  ["w", "x", "c", "v", "b", "n"],
];
const NUMBER_ROWS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["-", "/", ":", ";", "(", ")", "€", "&", "@", '"'],
  [".", ",", "?", "!", "'"],
];

export type KeyboardLayer = "letters" | "numbers";
export type KeyTarget = { layer: KeyboardLayer; keyId: string; shift: boolean };

function stripAccent(char: string): string {
  return char.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function charToKey(char: string): KeyTarget | null {
  if (char === " ") return { layer: "letters", keyId: "space", shift: false };
  const base = stripAccent(char);
  if (/^[a-zA-Z]$/.test(base)) {
    return {
      layer: "letters",
      keyId: base.toLowerCase(),
      shift: char === char.toUpperCase() && char !== char.toLowerCase(),
    };
  }
  for (const row of NUMBER_ROWS) {
    if (row.includes(char)) return { layer: "numbers", keyId: char, shift: false };
  }
  return null;
}

function layerForChar(char: string): KeyboardLayer | null {
  if (char === " ") return null;
  return charToKey(char)?.layer ?? null;
}

export function resolveActiveLayer(
  prompt: string,
  pressedIndex: number | null,
  typedCount: number,
): KeyboardLayer {
  if (pressedIndex !== null) {
    const layer = layerForChar(prompt[pressedIndex]);
    if (layer) return layer;
  }
  for (let i = Math.min(prompt.length, typedCount) - 1; i >= 0; i--) {
    const layer = layerForChar(prompt[i]);
    if (layer) return layer;
  }
  return "letters";
}

export function KeyboardWritingPreview({
  prompt,
  beforeImageUrl,
  startedAt,
  speedMultiplier,
  onEnded = () => {},
  onReplay = () => {},
}: {
  prompt: string;
  beforeImageUrl: string | null;
  startedAt: number | null;
  speedMultiplier: number;
  onEnded?: () => void;
  onReplay?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const grainPatternRef = useRef<CanvasPattern | null>(null);
  const endedRef = useRef(false);
  const [beforeImage, setBeforeImage] = useState<HTMLImageElement | null>(null);
  const timeline = useMemo(
    () => buildWritingTimeline(prompt, speedMultiplier),
    [prompt, speedMultiplier],
  );

  useEffect(() => {
    let cancelled = false;
    let objectUrlToRevoke: string | null = null;

    setBeforeImage(null);
    if (!beforeImageUrl) return;

    (async () => {
      try {
        const safeUrl = await createCanvasSafeImageUrl(beforeImageUrl);
        if (safeUrl.startsWith("blob:")) objectUrlToRevoke = safeUrl;
        if (cancelled) {
          if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
          return;
        }
        const image = await loadDrawableImage(safeUrl);
        if (!cancelled) setBeforeImage(image);
      } catch {
        if (!cancelled) setBeforeImage(null);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
    };
  }, [beforeImageUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !prompt.trim()) {
      grainPatternRef.current = null;
      return;
    }

    canvas.width = EXPORT_WIDTH;
    canvas.height = EXPORT_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!grainPatternRef.current) {
      grainPatternRef.current = createGrainPattern(ctx);
    }

    let raf = 0;
    const isPlaying = Boolean(startedAt && prompt);
    if (!isPlaying) endedRef.current = false;

    const tick = () => {
      const elapsed = startedAt
        ? Math.min(timeline.totalMs, Math.max(0, Date.now() - startedAt))
        : timeline.totalMs;

      drawKeyboardWritingFrame(ctx, {
        prompt,
        beforeImage,
        speedMultiplier,
        elapsedMs: elapsed,
        isPlaying,
        grainPattern: grainPatternRef.current,
      });

      if (isPlaying && elapsed >= timeline.totalMs && !endedRef.current) {
        endedRef.current = true;
        onEnded();
        return;
      }

      if (!isPlaying) return;
      raf = window.requestAnimationFrame(tick);
    };

    tick();
    return () => window.cancelAnimationFrame(raf);
  }, [beforeImage, prompt, speedMultiplier, startedAt, timeline.totalMs, onEnded]);

  const isPlaying = Boolean(startedAt && prompt);

  if (!prompt.trim()) {
    return (
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-lg border border-border bg-background bg-grid">
        <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-muted-foreground">
          La vidéo d'écriture apparaîtra ici
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-[9/16] w-full overflow-hidden rounded-lg border border-border bg-background bg-grid">
      <canvas
        ref={canvasRef}
        width={EXPORT_WIDTH}
        height={EXPORT_HEIGHT}
        className="absolute inset-0 h-full w-full"
      />
      {!isPlaying ? (
        <button
          type="button"
          onClick={onReplay}
          className="absolute inset-0 flex items-center justify-center bg-black/10 text-white transition-colors hover:bg-black/20"
          aria-label="Relancer l'écriture"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/45 shadow-xl backdrop-blur-sm">
            <Play className="ml-0.5 h-6 w-6 fill-current" />
          </span>
        </button>
      ) : null}
    </div>
  );
}

// --- Canvas export ----------------------------------------------------------
const EXPORT_WIDTH = 1080;
const EXPORT_HEIGHT = 1920;
const EXPORT_FPS = 30;
const KEYBOARD_REFERENCE_WIDTH = 360;
const KEYBOARD_ACCESSORY_H = 40;
const KEYBOARD_KEY_H = 36;
const KEYBOARD_TOP_PAD = 8;
const KEYBOARD_BOTTOM_PAD = 6;
const KEYBOARD_ROW_GAP = 8;
const KEYBOARD_KEY_GAP = 5;
const KEYBOARD_SIDE_PAD = 4;
const KEYBOARD_ROW_2_INSET = 8;
export const KEYBOARD_REFERENCE_HEIGHT =
  KEYBOARD_ACCESSORY_H +
  KEYBOARD_TOP_PAD +
  KEYBOARD_KEY_H * 4 +
  KEYBOARD_ROW_GAP * 3 +
  KEYBOARD_BOTTOM_PAD;
export const KEYBOARD_REFERENCE_ACCESSORY_H = KEYBOARD_ACCESSORY_H;

export type DrawableKey = {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  keyId: string;
  special?: boolean;
  icon?: "shift" | "backspace" | "globe";
};

function drawKeyIcon(
  ctx: CanvasRenderingContext2D,
  icon: NonNullable<DrawableKey["icon"]>,
  cx: number,
  cy: number,
  size: number,
  color: string,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(3, size * 0.08);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (icon === "shift") {
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.34);
    ctx.lineTo(cx - size * 0.28, cy - size * 0.04);
    ctx.lineTo(cx - size * 0.11, cy - size * 0.04);
    ctx.lineTo(cx - size * 0.11, cy + size * 0.32);
    ctx.lineTo(cx + size * 0.11, cy + size * 0.32);
    ctx.lineTo(cx + size * 0.11, cy - size * 0.04);
    ctx.lineTo(cx + size * 0.28, cy - size * 0.04);
    ctx.closePath();
    ctx.stroke();
  }

  if (icon === "backspace") {
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.38, cy);
    ctx.lineTo(cx - size * 0.16, cy - size * 0.24);
    ctx.lineTo(cx + size * 0.38, cy - size * 0.24);
    ctx.quadraticCurveTo(cx + size * 0.48, cy - size * 0.24, cx + size * 0.48, cy - size * 0.14);
    ctx.lineTo(cx + size * 0.48, cy + size * 0.14);
    ctx.quadraticCurveTo(cx + size * 0.48, cy + size * 0.24, cx + size * 0.38, cy + size * 0.24);
    ctx.lineTo(cx - size * 0.16, cy + size * 0.24);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + size * 0.03, cy - size * 0.1);
    ctx.lineTo(cx + size * 0.23, cy + size * 0.1);
    ctx.moveTo(cx + size * 0.23, cy - size * 0.1);
    ctx.lineTo(cx + size * 0.03, cy + size * 0.1);
    ctx.stroke();
  }

  if (icon === "globe") {
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.31, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx, cy, size * 0.13, size * 0.31, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.29, cy);
    ctx.lineTo(cx + size * 0.29, cy);
    ctx.moveTo(cx - size * 0.22, cy - size * 0.17);
    ctx.quadraticCurveTo(cx, cy - size * 0.1, cx + size * 0.22, cy - size * 0.17);
    ctx.moveTo(cx - size * 0.22, cy + size * 0.17);
    ctx.quadraticCurveTo(cx, cy + size * 0.1, cx + size * 0.22, cy + size * 0.17);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawCanvasKey(
  ctx: CanvasRenderingContext2D,
  key: DrawableKey,
  pressed: boolean,
) {
  const pressedScale = pressed ? 1.05 : 1;
  const drawW = key.w * pressedScale;
  const drawH = key.h * pressedScale;
  const drawX = key.x + (key.w - drawW) / 2;
  const drawY = key.y + (key.h - drawH) / 2;
  roundedRectPath(ctx, drawX, drawY, drawW, drawH, key.h * 0.17);
  ctx.fillStyle = pressed ? "#ffffff" : key.special ? "#3f414b" : "#62646d";
  ctx.fill();
  ctx.fillStyle = pressed ? "#000000" : "#ffffff";
  if (key.icon) {
    drawKeyIcon(
      ctx,
      key.icon,
      key.x + key.w / 2,
      key.y + key.h / 2,
      key.h * 0.58,
      pressed ? "#000000" : "#ffffff",
    );
  } else {
    ctx.font = `400 ${key.label.length > 2 ? key.h * 0.36 : key.h * 0.42}px -apple-system, "Segoe UI", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(key.label, key.x + key.w / 2, key.y + key.h / 2 + key.h * 0.04);
  }
}

export function buildKeyboardKeys(
  layer: KeyboardLayer,
  shiftActive: boolean,
  region: { x: number; y: number; w: number; h: number },
): DrawableKey[] {
  const rows = layer === "letters" ? LETTER_ROWS : NUMBER_ROWS;
  const scale = region.w / KEYBOARD_REFERENCE_WIDTH;
  const keyGap = KEYBOARD_KEY_GAP * scale;
  const rowGap = KEYBOARD_ROW_GAP * scale;
  const rowH = KEYBOARD_KEY_H * scale;
  const row1X = region.x + KEYBOARD_SIDE_PAD * scale;
  const row1W = region.w - KEYBOARD_SIDE_PAD * scale * 2;
  const row2X = region.x + KEYBOARD_ROW_2_INSET * scale;
  const row2W = region.w - KEYBOARD_ROW_2_INSET * scale * 2;
  const row1KeyW = (row1W - keyGap * 9) / 10;
  const row2KeyW = (row2W - keyGap * 9) / 10;
  const keys: DrawableKey[] = [];

  const label = (key: string) =>
    layer === "letters" && shiftActive ? key.toUpperCase() : key;

  // Row 1 & 2 (10 full-width keys each)
  [rows[0], rows[1]].forEach((row, rowIndex) => {
    const y = region.y + KEYBOARD_TOP_PAD * scale + rowIndex * (rowH + rowGap);
    const keyW = rowIndex === 0 ? row1KeyW : row2KeyW;
    let x = rowIndex === 0 ? row1X : row2X;
    row.forEach((key) => {
      keys.push({ x, y, w: keyW, h: rowH, label: label(key), keyId: key });
      x += keyW + keyGap;
    });
  });

  // Row 3: special-left + letters + backspace
  const y3 = region.y + KEYBOARD_TOP_PAD * scale + 2 * (rowH + rowGap);
  const mid = rows[2];
  const row3Unit = (row1W - keyGap * 7) / 9;
  const sideW = row3Unit * 1.5;
  const midW = mid.length * row3Unit + (mid.length - 1) * keyGap;
  let x3 = row1X;
  keys.push({
    x: x3,
    y: y3,
    w: sideW,
    h: rowH,
    label: layer === "letters" ? "\u21e7" : "#+=",
    keyId: "__shift",
    special: true,
    icon: layer === "letters" ? "shift" : undefined,
  });
  x3 = row1X + (row1W - midW) / 2;
  mid.forEach((key) => {
    keys.push({ x: x3, y: y3, w: row3Unit, h: rowH, label: label(key), keyId: key });
    x3 += row3Unit + keyGap;
  });
  keys.push({
    x: row1X + row1W - sideW,
    y: y3,
    w: sideW,
    h: rowH,
    label: "\u232b",
    keyId: "__backspace",
    special: true,
    icon: "backspace",
  });

  // Row 4: 123/ABC, globe, space, return
  const y4 = region.y + KEYBOARD_TOP_PAD * scale + 3 * (rowH + rowGap);
  const row4Unit = (row1W - keyGap * 3) / 9.4;
  const switchW = row4Unit * 1.6;
  const globeW = row4Unit;
  const spaceW = row4Unit * 5;
  const returnW = row4Unit * 1.8;
  let x4 = row1X;
  keys.push({
    x: x4,
    y: y4,
    w: switchW,
    h: rowH,
    label: layer === "letters" ? "123" : "ABC",
    keyId: "__layer",
    special: true,
  });
  x4 += switchW + keyGap;
  keys.push({ x: x4, y: y4, w: globeW, h: rowH, label: "", keyId: "__globe", special: true, icon: "globe" });
  x4 += globeW + keyGap;
  keys.push({ x: x4, y: y4, w: spaceW, h: rowH, label: "espace", keyId: "space" });
  x4 += spaceW + keyGap;
  keys.push({ x: x4, y: y4, w: returnW, h: rowH, label: "retour", keyId: "__return", special: true });

  return keys;
}

export function drawSendHorizonalIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-size * 0.42, -size * 0.28);
  ctx.lineTo(size * 0.42, 0);
  ctx.lineTo(-size * 0.42, size * 0.28);
  ctx.lineTo(-size * 0.16, 0);
  ctx.lineTo(-size * 0.42, -size * 0.28);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-size * 0.16, 0);
  ctx.lineTo(size * 0.42, 0);
  ctx.stroke();
  ctx.restore();
}

export function drawToolbarGlyph(
  ctx: CanvasRenderingContext2D,
  type: "key" | "card" | "pin" | "keyboard",
  cx: number,
  cy: number,
  scale = 1,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.strokeStyle = "#8fbdff";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (type === "key") {
    ctx.beginPath();
    ctx.arc(-15, 0, 10, 0, Math.PI * 2);
    ctx.moveTo(-5, 0);
    ctx.lineTo(25, 0);
    ctx.moveTo(12, 0);
    ctx.lineTo(12, 8);
    ctx.moveTo(22, 0);
    ctx.lineTo(22, 6);
    ctx.stroke();
  }

  if (type === "card") {
    roundedRectPath(ctx, -24, -14, 48, 32, 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-24, -4);
    ctx.lineTo(24, -4);
    ctx.stroke();
  }

  if (type === "pin") {
    ctx.beginPath();
    ctx.moveTo(0, 26);
    ctx.bezierCurveTo(0, 26, 18, 8, 18, -8);
    ctx.bezierCurveTo(18, -21, -18, -21, -18, -8);
    ctx.bezierCurveTo(-18, 8, 0, 26, 0, 26);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -7, 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (type === "keyboard") {
    roundedRectPath(ctx, -26, -16, 52, 34, 5);
    ctx.stroke();
    [-15, -5, 5, 15].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x, -6);
      ctx.lineTo(x + 0.1, -6);
      ctx.moveTo(x, 3);
      ctx.lineTo(x + 0.1, 3);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(-10, 12);
    ctx.lineTo(10, 12);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawKeyboardWritingFrame(
  ctx: CanvasRenderingContext2D,
  {
    prompt,
    beforeImage,
    speedMultiplier,
    elapsedMs,
    isPlaying,
    grainPattern,
  }: {
    prompt: string;
    beforeImage: HTMLImageElement | null;
    speedMultiplier: number;
    elapsedMs: number;
    isPlaying: boolean;
    grainPattern: CanvasPattern | null;
  },
) {
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
  const keyboardScale = EXPORT_WIDTH / KEYBOARD_REFERENCE_WIDTH;
  const keyboardH = KEYBOARD_REFERENCE_HEIGHT * keyboardScale;
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
  if (beforeImage) {
    drawCoverImage(ctx, beforeImage, pad, croppedImagesTop, slotW, slotH);
  } else {
    ctx.fillStyle = "#e2e2e6";
    ctx.fillRect(pad, croppedImagesTop, slotW, slotH);
  }
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
  ctx.fillStyle = "#ffffff";
  ctx.font = "500 32px 'DM Sans', -apple-system, 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("larpking.com", EXPORT_WIDTH / 2, urlBarY + urlBarH / 2 + 5);

  roundedRectPath(ctx, pad, inputTop, EXPORT_WIDTH - pad * 2, inputH, 30);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const typedCount = isPlaying
    ? typedCountAt(elapsedMs, timeline)
    : timeline.charCount;
  const typedText = prompt.slice(0, typedCount);
  ctx.fillStyle = "#000000";
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
  ctx.fillStyle = "#000000";
  ctx.fill();
  drawSendHorizonalIcon(ctx, sendCx, textY, 38);

  roundedRectPath(ctx, pad, faceTop, EXPORT_WIDTH - pad * 2, faceH, 22);
  ctx.fillStyle = "rgba(255,255,255,0.46)";
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.1)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.48)";
  ctx.lineWidth = 3;
  const faceIconX = pad + 62;
  const faceIconY = faceTop + faceH / 2;
  ctx.beginPath();
  ctx.arc(faceIconX, faceIconY, 16, 0.2, Math.PI * 1.7);
  ctx.stroke();
  ctx.fillStyle = "#111111";
  ctx.font = "600 36px 'DM Sans', -apple-system, 'Segoe UI', sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Use my face", pad + 112, faceIconY);
  const toggleW = 96;
  const toggleH = 56;
  const toggleX = EXPORT_WIDTH - pad - 32 - toggleW;
  const toggleY = faceIconY - toggleH / 2;
  roundedRectPath(ctx, toggleX, toggleY, toggleW, toggleH, toggleH / 2);
  ctx.fillStyle = "#050505";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(toggleX + toggleW - toggleH / 2, faceIconY, toggleH / 2 - 6, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
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
  const underlineLeft = (EXPORT_WIDTH - titleWidth) / 2 - 2;
  const underlineRight = (EXPORT_WIDTH + titleWidth) / 2 + 2;
  const underlineY = titleY + 18;
  const underlineMid = EXPORT_WIDTH / 2;
  ctx.moveTo(underlineLeft, underlineY);
  ctx.bezierCurveTo(
    underlineLeft + titleWidth * 0.26,
    underlineY,
    underlineMid - titleWidth * 0.16,
    underlineY + 1.2,
    underlineMid,
    underlineY + 0.6,
  );
  ctx.bezierCurveTo(
    underlineMid + titleWidth * 0.18,
    underlineY,
    underlineRight - titleWidth * 0.26,
    underlineY - 0.8,
    underlineRight,
    underlineY,
  );
  ctx.stroke();

  const keyboardGradient = ctx.createLinearGradient(0, keyboardY, 0, EXPORT_HEIGHT);
  keyboardGradient.addColorStop(0, "rgba(16,20,31,0.94)");
  keyboardGradient.addColorStop(0.58, "rgba(29,30,37,0.84)");
  keyboardGradient.addColorStop(1, "rgba(10,11,16,0.9)");
  ctx.fillStyle = keyboardGradient;
  ctx.fillRect(0, keyboardY, EXPORT_WIDTH, keyboardH);
  const accessoryH = KEYBOARD_REFERENCE_ACCESSORY_H * keyboardScale;
  ctx.fillStyle = "#222225";
  ctx.fillRect(0, keyboardY, EXPORT_WIDTH, accessoryH);
  const toolbarY = keyboardY + accessoryH / 2;
  const toolbarStartX = 190 * keyboardScale;
  const toolbarGap = 48 * keyboardScale;
  drawToolbarGlyph(ctx, "key", toolbarStartX, toolbarY, 1.15);
  drawToolbarGlyph(ctx, "card", toolbarStartX + toolbarGap, toolbarY, 1.15);
  drawToolbarGlyph(ctx, "pin", toolbarStartX + toolbarGap * 2, toolbarY, 1.15);
  drawToolbarGlyph(ctx, "keyboard", toolbarStartX + toolbarGap * 3, toolbarY, 1.15);

  const pressedIndex = isPlaying ? pressedIndexAt(elapsedMs, timeline) : null;
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

export async function exportKeyboardWritingVideo({
  prompt,
  beforeImageUrl,
  speedMultiplier,
  filename,
}: {
  prompt: string;
  beforeImageUrl: string | null;
  speedMultiplier: number;
  filename: string;
}) {
  const objectUrlsToRevoke: string[] = [];
  let beforeImage: HTMLImageElement | null = null;
  if (beforeImageUrl) {
    const safeUrl = await createCanvasSafeImageUrl(beforeImageUrl);
    if (safeUrl.startsWith("blob:")) objectUrlsToRevoke.push(safeUrl);
    beforeImage = await loadDrawableImage(safeUrl);
  }

  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_WIDTH;
  canvas.height = EXPORT_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non supporté");

  const timeline = buildWritingTimeline(prompt, speedMultiplier);
  const grainPattern = createGrainPattern(ctx);
  const drawFrame = (elapsedMs: number) => {
    drawKeyboardWritingFrame(ctx, {
      prompt,
      beforeImage,
      speedMultiplier,
      elapsedMs,
      isPlaying: true,
      grainPattern,
    });
  };

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
      drawFrame(Math.min(timeline.totalMs, elapsedMs));
      videoTrack.requestFrame?.();
      if (elapsedMs >= timeline.totalMs) {
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
