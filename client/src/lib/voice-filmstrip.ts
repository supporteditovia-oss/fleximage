/** Vignettes vidéo pour la timeline CapCut. */
export async function generateVideoFilmstrip(
  videoUrl: string,
  totalSec: number,
  frameCount = 20,
): Promise<string[]> {
  if (totalSec <= 0 || frameCount < 1) return [];

  const video = document.createElement("video");
  video.src = videoUrl;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  /* Pas de crossOrigin sur blob: — ça casse le chargement local. */
  video.style.cssText =
    "position:fixed;left:0;top:0;width:320px;height:180px;opacity:0.01;pointer-events:none;z-index:-1;";
  document.body.appendChild(video);

  const canvas = document.createElement("canvas");
  const thumbW = 128;
  const thumbH = 72;
  canvas.width = thumbW;
  canvas.height = thumbH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    video.remove();
    return [];
  }

  const waitEvent = (event: string, ms: number) =>
    new Promise<void>((resolve) => {
      if (event === "loadedmetadata" && video.readyState >= 1) {
        resolve();
        return;
      }
      if (event === "canplay" && video.readyState >= 2) {
        resolve();
        return;
      }
      const done = () => {
        video.removeEventListener(event, done);
        resolve();
      };
      video.addEventListener(event, done);
      window.setTimeout(done, ms);
    });

  const seekTo = (time: number) =>
    new Promise<void>((resolve) => {
      const target = Math.max(0, time);
      if (Math.abs(video.currentTime - target) < 0.04) {
        resolve();
        return;
      }
      const done = () => {
        video.removeEventListener("seeked", done);
        resolve();
      };
      video.addEventListener("seeked", done);
      try {
        video.currentTime = target;
      } catch {
        resolve();
      }
      window.setTimeout(done, 1800);
    });

  try {
    video.load();
    await waitEvent("loadedmetadata", 12000);
    await waitEvent("canplay", 8000);

    /* Débloque le décodage sur certains MP4 (visualizer, etc.). */
    try {
      await video.play();
      video.pause();
    } catch {
      /* ignore */
    }

    const duration =
      Number.isFinite(video.duration) && video.duration > 0
        ? video.duration
        : totalSec;
    const thumbs: string[] = [];

    for (let i = 0; i < frameCount; i += 1) {
      const t =
        frameCount <= 1
          ? 0
          : Math.min(Math.max(0, duration - 0.1), (i / (frameCount - 1)) * duration);

      await seekTo(t);

      try {
        ctx.drawImage(video, 0, 0, thumbW, thumbH);
        const data = canvas.toDataURL("image/jpeg", 0.78);
        if (data && data.length > 100) thumbs.push(data);
      } catch {
        /* frame illisible */
      }
    }

    return thumbs.length > 0 ? thumbs : [];
  } catch {
    return [];
  } finally {
    video.pause();
    video.removeAttribute("src");
    video.load();
    video.remove();
  }
}

const VIEWPORT_FALLBACK_PX = 320;

/** @deprecated — préférer timelineZoomPxPerSec (viewport + zoom %). */
export function timelinePxPerSec(totalSec: number): number {
  if (totalSec > 180) return 96;
  if (totalSec > 120) return 80;
  if (totalSec > 60) return 64;
  if (totalSec > 30) return 48;
  return 40;
}

export function timelineWidthPx(totalSec: number, pxPerSec: number): number {
  return Math.ceil(totalSec * pxPerSec);
}

/**
 * Zoom équilibré :
 * - 0 % → toute la piste tient dans le viewport (vue d’ensemble)
 * - 100 % → le bloc max (~10 s) occupe ~55 % du viewport (ajustement fin)
 * Progression logarithmique pour éviter le saut brutal 0 % → 10 %.
 */
export function timelineZoomPxPerSec(
  totalSec: number,
  viewportWidthPx: number,
  zoomPct: number,
  maxClipSec = 10,
): number {
  if (totalSec <= 0) return 40;

  const vw = Math.max(240, viewportWidthPx || VIEWPORT_FALLBACK_PX);
  const t = Math.max(0, Math.min(100, zoomPct)) / 100;

  const fitPps = vw / totalSec;
  const focusPps = (vw * 0.55) / Math.max(3, maxClipSec);
  const maxPps = Math.max(fitPps * 1.12, focusPps);
  const minPps = fitPps;

  if (maxPps <= minPps * 1.02) return minPps;
  return minPps * Math.pow(maxPps / minPps, t);
}

/** Zoom par défaut — sélection ~30 % du viewport sur fichiers longs. */
export function defaultTimelineZoomPct(totalSec: number, selectionSec: number): number {
  if (totalSec <= 0) return 25;
  const ratio = (0.3 * totalSec) / Math.max(3, selectionSec);
  if (ratio <= 1.05) return 0;
  const pct = (Math.log(ratio) / Math.log(8)) * 100;
  return Math.min(45, Math.max(12, Math.round(pct / 5) * 5));
}

export const TIMELINE_ZOOM_STEP = 10;

/** Une vignette tous les ~3 s, assez pour couvrir toute la piste. */
export function filmstripFrameCount(totalSec: number, trackWidthPx: number): number {
  const byTime = Math.ceil(totalSec / 3);
  const byWidth = Math.ceil(trackWidthPx / 52);
  return Math.min(72, Math.max(20, byTime, byWidth));
}

/** @deprecated utiliser timelinePxPerSec */
export const TIMELINE_PX_PER_SEC = 84;
