import { useEffect, useRef, useState } from "react";
import { ImageOff, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createCanvasSafeImageUrl,
  drawCoverImage,
  getSupportedVideoMimeType,
  loadDrawableImage,
} from "@/lib/canvas-image";

// --- Hook model -------------------------------------------------------------
// First half shows the "avant" image, second half the "après" image. The first
// image zooms slightly; the second one starts at the zoom level the first one
// ended at and keeps zooming, for a seamless continuous push-in.
export const DEFAULT_HOOK_DURATION_SECONDS = 3;
export const MIN_HOOK_DURATION_SECONDS = 1;
export const MAX_HOOK_DURATION_SECONDS = 20;
const ZOOM_START = 1;
const ZOOM_MID = 1.12;
const ZOOM_END = 1.26;

export function clampHookDuration(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : DEFAULT_HOOK_DURATION_SECONDS;
  if (!Number.isFinite(parsed)) return DEFAULT_HOOK_DURATION_SECONDS;
  return Math.min(
    MAX_HOOK_DURATION_SECONDS,
    Math.max(MIN_HOOK_DURATION_SECONDS, Math.round(parsed * 10) / 10),
  );
}

export type HookPhase = {
  phase: "before" | "after";
  scale: number;
};

export function hookStateAt(elapsedMs: number, durationMs: number): HookPhase {
  const half = durationMs / 2;
  if (elapsedMs < half) {
    const progress = half > 0 ? Math.min(1, elapsedMs / half) : 1;
    return { phase: "before", scale: ZOOM_START + (ZOOM_MID - ZOOM_START) * progress };
  }
  const progress = half > 0 ? Math.min(1, (elapsedMs - half) / half) : 1;
  return { phase: "after", scale: ZOOM_MID + (ZOOM_END - ZOOM_MID) * progress };
}

export function HookVideoPreview({
  beforeImageUrl,
  afterImageUrl,
  durationSeconds,
  startedAt,
  onEnded = () => {},
  onReplay = () => {},
}: {
  beforeImageUrl: string | null;
  afterImageUrl: string | null;
  durationSeconds: number;
  startedAt: number | null;
  onEnded?: () => void;
  onReplay?: () => void;
}) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const endedRef = useRef(false);
  const durationMs = durationSeconds * 1000;
  const ready = Boolean(beforeImageUrl && afterImageUrl);

  useEffect(() => {
    if (!startedAt || !ready) {
      setElapsedMs(0);
      endedRef.current = false;
      return;
    }
    let raf = 0;
    const tick = () => {
      const elapsed = Math.max(0, Date.now() - startedAt);
      setElapsedMs(Math.min(durationMs, elapsed));
      if (elapsed >= durationMs && !endedRef.current) {
        endedRef.current = true;
        onEnded();
        return;
      }
      raf = window.requestAnimationFrame(tick);
    };
    tick();
    return () => window.cancelAnimationFrame(raf);
  }, [startedAt, ready, durationMs, onEnded]);

  const isPlaying = Boolean(startedAt && ready);
  const { phase, scale } = isPlaying
    ? hookStateAt(elapsedMs, durationMs)
    : { phase: "before" as const, scale: ZOOM_START };

  if (!ready) {
    return (
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-lg border border-border bg-muted/30">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
          <ImageOff className="h-7 w-7" />
          Définissez une image avant et une image après pour générer le hook
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-[9/16] w-full overflow-hidden rounded-lg border border-border bg-black">
      <img
        src={beforeImageUrl ?? undefined}
        alt="Image avant"
        className={cn(
          "absolute inset-0 h-full w-full object-cover",
          phase === "before" ? "opacity-100" : "opacity-0",
        )}
        style={{ transform: `scale(${phase === "before" ? scale : ZOOM_MID})` }}
      />
      <img
        src={afterImageUrl ?? undefined}
        alt="Image après"
        className={cn(
          "absolute inset-0 h-full w-full object-cover",
          phase === "after" ? "opacity-100" : "opacity-0",
        )}
        style={{ transform: `scale(${phase === "after" ? scale : ZOOM_MID})` }}
      />

      {!isPlaying ? (
        <button
          type="button"
          onClick={onReplay}
          className="absolute inset-0 flex items-center justify-center bg-black/10 text-white transition-colors hover:bg-black/20"
          aria-label="Relancer le hook"
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

export async function exportHookVideo({
  beforeImageUrl,
  afterImageUrl,
  durationSeconds,
  filename,
}: {
  beforeImageUrl: string;
  afterImageUrl: string;
  durationSeconds: number;
  filename: string;
}) {
  const objectUrlsToRevoke: string[] = [];

  const safeBefore = await createCanvasSafeImageUrl(beforeImageUrl);
  if (safeBefore.startsWith("blob:")) objectUrlsToRevoke.push(safeBefore);
  const safeAfter = await createCanvasSafeImageUrl(afterImageUrl);
  if (safeAfter.startsWith("blob:")) objectUrlsToRevoke.push(safeAfter);

  const [beforeImage, afterImage] = await Promise.all([
    loadDrawableImage(safeBefore),
    loadDrawableImage(safeAfter),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_WIDTH;
  canvas.height = EXPORT_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non supporté");

  const durationMs = durationSeconds * 1000;

  const drawFrame = (elapsedMs: number) => {
    const { phase, scale } = hookStateAt(elapsedMs, durationMs);
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
    const image = phase === "before" ? beforeImage : afterImage;
    drawCoverImage(ctx, image, 0, 0, EXPORT_WIDTH, EXPORT_HEIGHT, scale);
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
      drawFrame(Math.min(durationMs, elapsedMs));
      videoTrack.requestFrame?.();
      if (elapsedMs >= durationMs) {
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
