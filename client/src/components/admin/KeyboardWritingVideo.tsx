import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowUp,
  ChevronDown,
  Delete,
  Globe,
  ImagePlus,
  Play,
  Plus,
  ScanFace,
  SendHorizonal,
  Shuffle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createCanvasSafeImageUrl,
  createGrainPattern,
  drawCoverImage,
  getSupportedVideoMimeType,
  loadDrawableImage,
  roundedRectPath,
} from "@/lib/canvas-image";

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

// --- HTML preview -----------------------------------------------------------
function KeyCap({
  label,
  pressed,
  variant = "default",
  className,
}: {
  label: ReactNode;
  pressed?: boolean;
  variant?: "default" | "special";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-9 items-center justify-center rounded-[6px] text-[15px] font-normal text-white shadow-[0_1px_0_rgba(0,0,0,0.45)] transition-colors",
        variant === "special" ? "bg-[#3f414b]/95" : "bg-[#62646d]/95",
        pressed && "scale-105 bg-white text-black shadow-[0_2px_6px_rgba(0,0,0,0.4)]",
        className,
      )}
    >
      {label}
    </div>
  );
}

function ToolbarGlyph({ type }: { type: "key" | "card" | "pin" | "keyboard" }) {
  return (
    <svg
      viewBox="0 0 28 28"
      aria-hidden="true"
      className="h-[20px] w-[20px] overflow-visible"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.25"
    >
      {type === "key" ? (
        <>
          <circle cx="8.5" cy="14" r="4.2" />
          <path d="M12.7 14H25" />
          <path d="M20 14v3" />
          <path d="M23 14v2.2" />
        </>
      ) : null}
      {type === "card" ? (
        <>
          <rect x="4" y="8" width="20" height="14" rx="2.2" />
          <path d="M4 12h20" />
        </>
      ) : null}
      {type === "pin" ? (
        <>
          <path d="M14 24s7-7.2 7-13a7 7 0 0 0-14 0c0 5.8 7 13 7 13Z" />
          <circle cx="14" cy="11" r="2.4" />
        </>
      ) : null}
      {type === "keyboard" ? (
        <>
          <rect x="3.5" y="7" width="21" height="15" rx="2.4" />
          <path d="M7.5 11h.1M11.8 11h.1M16.1 11h.1M20.4 11h.1" />
          <path d="M7.5 15h.1M11.8 15h.1M16.1 15h.1M20.4 15h.1" />
          <path d="M10 19h8" />
        </>
      ) : null}
    </svg>
  );
}

function ExistingLarpsUnderline() {
  return (
    <svg
      viewBox="0 0 286 8"
      aria-hidden="true"
      className="mx-auto mt-1 h-2 w-[262px]"
      fill="none"
      preserveAspectRatio="none"
    >
      <path
        d="M2 4C48 4 78 4.2 126 4.1C176 4 224 3.8 284 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3.2"
      />
    </svg>
  );
}

function AppleKeyboard({
  layer,
  pressedKey,
  shiftActive,
}: {
  layer: KeyboardLayer;
  pressedKey: KeyTarget | null;
  shiftActive: boolean;
}) {
  const rows = layer === "letters" ? LETTER_ROWS : NUMBER_ROWS;
  const isPressed = (keyId: string) =>
    pressedKey?.layer === layer && pressedKey.keyId === keyId;

  return (
    <div className="select-none bg-[linear-gradient(180deg,rgba(20,24,35,0.92),rgba(29,30,37,0.82)_58%,rgba(13,14,18,0.88))] pb-1.5 pt-0 backdrop-blur-2xl shadow-[0_-18px_42px_rgba(55,112,255,0.18)]">
      <div className="flex h-10 items-center justify-end gap-7 bg-[#222225] pl-24 pr-4 text-[#8fbdff]">
        <ToolbarGlyph type="key" />
        <ToolbarGlyph type="card" />
        <ToolbarGlyph type="pin" />
        <ToolbarGlyph type="keyboard" />
      </div>
      <div className="space-y-2 px-1 pt-2">
        <div className="flex gap-[5px]">
          {rows[0].map((key) => (
            <KeyCap
              key={key}
              label={layer === "letters" && shiftActive ? key.toUpperCase() : key}
              pressed={isPressed(key)}
              className="flex-1"
            />
          ))}
        </div>
        <div className="flex gap-[5px] px-2">
          {rows[1].map((key) => (
            <KeyCap
              key={key}
              label={layer === "letters" && shiftActive ? key.toUpperCase() : key}
              pressed={isPressed(key)}
              className="flex-1"
            />
          ))}
        </div>
        <div className="flex items-stretch gap-[5px]">
          <KeyCap
            label={layer === "letters" ? <ArrowUp className="h-4 w-4" /> : "#+="}
            variant="special"
            pressed={layer === "letters" && shiftActive}
            className="flex-[1.5] text-[13px]"
          />
          {rows[2].map((key) => (
            <KeyCap
              key={key}
              label={layer === "letters" && shiftActive ? key.toUpperCase() : key}
              pressed={isPressed(key)}
              className="flex-1"
            />
          ))}
          <KeyCap
            label={<Delete className="h-4 w-4" />}
            variant="special"
            className="flex-[1.5]"
          />
        </div>
        <div className="flex items-stretch gap-[5px]">
          <KeyCap label={layer === "letters" ? "123" : "ABC"} variant="special" className="flex-[1.6] text-[13px]" />
          <KeyCap label={<Globe className="h-4 w-4" />} variant="special" className="flex-1" />
          <KeyCap label="espace" pressed={isPressed("space")} className="flex-[5] text-[13px]" />
          <KeyCap label="retour" variant="special" className="flex-[1.8] text-[13px]" />
        </div>
      </div>
    </div>
  );
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
  const [elapsedMs, setElapsedMs] = useState(0);
  const endedRef = useRef(false);
  const timeline = useMemo(
    () => buildWritingTimeline(prompt, speedMultiplier),
    [prompt, speedMultiplier],
  );

  useEffect(() => {
    if (!startedAt || !prompt) {
      setElapsedMs(0);
      endedRef.current = false;
      return;
    }
    let raf = 0;
    const tick = () => {
      const elapsed = Math.max(0, Date.now() - startedAt);
      setElapsedMs(Math.min(timeline.totalMs, elapsed));
      if (elapsed >= timeline.totalMs && !endedRef.current) {
        endedRef.current = true;
        onEnded();
        return;
      }
      raf = window.requestAnimationFrame(tick);
    };
    tick();
    return () => window.cancelAnimationFrame(raf);
  }, [startedAt, prompt, timeline.totalMs, onEnded]);

  const isPlaying = Boolean(startedAt && prompt);
  const typedCount = isPlaying ? typedCountAt(elapsedMs, timeline) : prompt.length;
  const pressedIndex = isPlaying ? pressedIndexAt(elapsedMs, timeline) : null;
  const pressedKey = pressedIndex !== null ? charToKey(prompt[pressedIndex]) : null;
  const shiftActive = pressedKey?.shift ?? false;
  const activeLayer = resolveActiveLayer(prompt, pressedIndex, typedCount);
  const typedText = prompt.slice(0, typedCount);

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
    <div
      className="relative aspect-[9/16] w-full overflow-hidden rounded-lg border border-border bg-background bg-grid"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <div className="absolute inset-x-0 top-0 z-20 flex h-[48px] items-center bg-[#30363a] px-3">
        <div className="relative flex h-[31px] w-full items-center justify-center rounded-full bg-[#6a7076] pt-0.5 text-[16px] font-medium tracking-[-0.02em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_1px_2px_rgba(0,0,0,0.18)]">
          <span>larpking.com</span>
        </div>
      </div>
      <div className="absolute inset-x-0 top-[48px] h-[78px] overflow-hidden px-3">
        <div className="flex -translate-y-[52%] gap-2.5">
          <div className="relative aspect-[9/16] flex-1 overflow-hidden rounded-2xl border border-border bg-muted/40">
            {beforeImageUrl ? (
              <img
                src={beforeImageUrl}
                alt="Image avant"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <ImagePlus className="h-7 w-7" />
              </div>
            )}
          </div>
          <div className="relative aspect-[9/16] flex-1 rounded-2xl border-2 border-dashed border-foreground/25 bg-white/20">
            <div className="absolute inset-0 flex items-center justify-center text-foreground/30">
              <Plus className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-3 top-[22.5%] space-y-3">
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-white px-3 py-2.5 shadow-sm">
          <div className="min-w-0 flex-1 truncate text-[13px] leading-tight text-black">
            {typedText}
            <span
              className={cn(
                "ml-px inline-block h-[15px] w-[2px] translate-y-[3px] rounded-full bg-[#0a84ff] align-middle",
                isPlaying ? "" : "animate-pulse",
              )}
            />
          </div>
          <Shuffle className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black text-white">
            <SendHorizonal className="h-4 w-4" />
          </span>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border/80 bg-white/45 px-4 py-3 text-[13px] font-medium text-foreground shadow-sm backdrop-blur-sm">
          <span className="inline-flex items-center gap-2">
            <ScanFace className="h-4 w-4 text-muted-foreground" />
            Use my face
          </span>
          <span className="relative h-7 w-12 rounded-full bg-black shadow-inner">
            <span className="absolute right-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow" />
          </span>
        </div>

        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground">
            View templates
            <ChevronDown className="h-3 w-3" />
          </span>
        </div>
      </div>

      <div className="absolute inset-x-0 top-[51%] text-center">
        <div
          className="mx-auto inline-block text-[20px] font-extrabold leading-none tracking-[-0.035em] text-black"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <span>Choose from existing LARPs</span>
          <ExistingLarpsUnderline />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0">
        <AppleKeyboard layer={activeLayer} pressedKey={pressedKey} shiftActive={shiftActive} />
      </div>

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

export type DrawableKey = {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  keyId: string;
  special?: boolean;
};

export function drawCanvasKey(
  ctx: CanvasRenderingContext2D,
  key: DrawableKey,
  pressed: boolean,
) {
  roundedRectPath(ctx, key.x, key.y, key.w, key.h, 10);
  ctx.fillStyle = pressed ? "#ffffff" : key.special ? "#3f414b" : "#62646d";
  ctx.fill();
  ctx.fillStyle = pressed ? "#000000" : "#ffffff";
  ctx.font = `400 ${key.label.length > 2 ? 26 : 38}px -apple-system, "Segoe UI", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(key.label, key.x + key.w / 2, key.y + key.h / 2 + 2);
}

export function buildKeyboardKeys(
  layer: KeyboardLayer,
  shiftActive: boolean,
  region: { x: number; y: number; w: number; h: number },
): DrawableKey[] {
  const rows = layer === "letters" ? LETTER_ROWS : NUMBER_ROWS;
  const pad = 14;
  const keyGap = 12;
  const rowGap = 18;
  const innerX = region.x + pad;
  const innerW = region.w - pad * 2;
  const rowH = (region.h - pad * 2 - rowGap * 3) / 4;
  const baseKeyW = (innerW - keyGap * 9) / 10;
  const keys: DrawableKey[] = [];

  const label = (key: string) =>
    layer === "letters" && shiftActive ? key.toUpperCase() : key;

  // Row 1 & 2 (10 full-width keys each)
  [rows[0], rows[1]].forEach((row, rowIndex) => {
    const y = region.y + pad + rowIndex * (rowH + rowGap);
    const totalW = row.length * baseKeyW + (row.length - 1) * keyGap;
    let x = innerX + (innerW - totalW) / 2;
    row.forEach((key) => {
      keys.push({ x, y, w: baseKeyW, h: rowH, label: label(key), keyId: key });
      x += baseKeyW + keyGap;
    });
  });

  // Row 3: special-left + letters + backspace
  const y3 = region.y + pad + 2 * (rowH + rowGap);
  const sideW = baseKeyW * 1.4;
  const mid = rows[2];
  const midW = mid.length * baseKeyW + (mid.length - 1) * keyGap;
  let x3 = innerX;
  keys.push({
    x: x3,
    y: y3,
    w: sideW,
    h: rowH,
    label: layer === "letters" ? "\u21e7" : "#+=",
    keyId: "__shift",
    special: true,
  });
  x3 = innerX + (innerW - midW) / 2;
  mid.forEach((key) => {
    keys.push({ x: x3, y: y3, w: baseKeyW, h: rowH, label: label(key), keyId: key });
    x3 += baseKeyW + keyGap;
  });
  keys.push({
    x: innerX + innerW - sideW,
    y: y3,
    w: sideW,
    h: rowH,
    label: "\u232b",
    keyId: "__backspace",
    special: true,
  });

  // Row 4: 123/ABC, globe, space, return
  const y4 = region.y + pad + 3 * (rowH + rowGap);
  const switchW = baseKeyW * 1.6;
  const globeW = baseKeyW * 1.2;
  const returnW = baseKeyW * 1.9;
  const spaceW = innerW - switchW - globeW - returnW - keyGap * 3;
  let x4 = innerX;
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
  keys.push({ x: x4, y: y4, w: globeW, h: rowH, label: "\u{1F310}", keyId: "__globe", special: true });
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

  const drawFrame = (elapsedMs: number) => {
    ctx.save();
    ctx.fillStyle = "hsl(0 0% 96%)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (grainPattern) {
      ctx.fillStyle = grainPattern;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(0, 0, canvas.width, keyboardY);
      ctx.globalAlpha = 1;
    }

    // Image slots stay 9:16, but only this visible window is shown.
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

    // Full browser bar, not floating: dark chrome + address capsule.
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

    // Input bar
    roundedRectPath(ctx, pad, inputTop, EXPORT_WIDTH - pad * 2, inputH, 30);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 2;
    ctx.stroke();

    const typedCount = typedCountAt(elapsedMs, timeline);
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

    // Send circle
    const sendR = 30;
    const sendCx = EXPORT_WIDTH - pad - 28 - sendR;
    ctx.beginPath();
    ctx.arc(sendCx, textY, sendR, 0, Math.PI * 2);
    ctx.fillStyle = "#000000";
    ctx.fill();
    drawSendHorizonalIcon(ctx, sendCx, textY, 38);

    // Use my face
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

    // View templates
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

    // Choose title
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

    // Keyboard
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
    recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
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
