import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, Scissors } from "lucide-react";
import {
  defaultTimelineZoomPct,
  filmstripFrameCount,
  generateVideoFilmstrip,
  timelineWidthPx,
  timelineZoomPxPerSec,
} from "@/lib/voice-filmstrip";
import {
  MAX_CLIP_SEC,
  MIN_CLIP_SEC,
  clampTrimMove,
  clampTrimResizeLeft,
  clampTrimResizeRight,
  formatClipTime,
  type VoiceClip,
} from "@/lib/voice-capture";

type VoiceCapCutTrimProps = {
  totalSec: number;
  trimStart: number;
  trimEnd: number;
  clip: VoiceClip | null;
  previewUrl?: string | null;
  previewIsVideo?: boolean;
  isDecoding?: boolean;
  onRangeChange: (start: number, end: number) => void;
  onMediaDuration?: (sec: number) => void;
};

type DragKind = "left" | "right" | "move";

function isMobileMedia(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function seekMediaTo(
  el: HTMLMediaElement,
  timeSec: number,
  opts?: { pauseFirst?: boolean },
): Promise<void> {
  return new Promise((resolve) => {
    const target = Math.max(0, timeSec);
    if (Math.abs(el.currentTime - target) < 0.04) {
      resolve();
      return;
    }

    const done = () => {
      el.removeEventListener("seeked", done);
      resolve();
    };

    el.addEventListener("seeked", done);

    try {
      if (opts?.pauseFirst && !el.paused) el.pause();
      if (isMobileMedia() && !el.paused) el.pause();
      el.currentTime = target;
    } catch {
      resolve();
      return;
    }

    window.setTimeout(done, 1200);
  });
}

function touchDistance(touches: TouchList): number {
  if (touches.length < 2) return 0;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

/** Timeline CapCut — molette / pinch + swipe + vignettes + lecture HD. */
export function VoiceCapCutTrim({
  totalSec,
  trimStart,
  trimEnd,
  clip,
  previewUrl,
  previewIsVideo,
  isDecoding,
  onRangeChange,
  onMediaDuration,
}: VoiceCapCutTrimProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const previewIsVideoRef = useRef(Boolean(previewIsVideo));
  const monitorCleanupRef = useRef<(() => void) | null>(null);
  const dragRef = useRef<{
    kind: DragKind;
    pointerId: number;
    originX: number;
    start0: number;
    end0: number;
  } | null>(null);
  const stopPreviewRef = useRef<(() => void) | null>(null);
  const trimStartRef = useRef(trimStart);
  const trimEndRef = useRef(trimEnd);
  const playingRef = useRef(false);
  const playheadRafRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playheadTime, setPlayheadTime] = useState<number | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [thumbsLoading, setThumbsLoading] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [zoomPct, setZoomPct] = useState(() =>
    defaultTimelineZoomPct(totalSec, trimEnd - trimStart),
  );
  const zoomPctRef = useRef(zoomPct);
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);

  trimEndRef.current = trimEnd;
  trimStartRef.current = trimStart;
  playingRef.current = playing;
  zoomPctRef.current = zoomPct;

  const pxPerSec = timelineZoomPxPerSec(totalSec, viewportWidth, zoomPct, MAX_CLIP_SEC);
  const selectionSec = trimEnd - trimStart;
  const trackWidthPx = timelineWidthPx(totalSec, pxPerSec);
  const leftPx = trimStart * pxPerSec;
  const widthPx = selectionSec * pxPerSec;
  const canPreview = Boolean(previewUrl || clip);
  const frameCount = filmstripFrameCount(totalSec, trackWidthPx);
  const thumbCount = thumbnails.length > 0 ? thumbnails.length : frameCount;
  const thumbSlotPx = trackWidthPx / thumbCount;

  previewUrlRef.current = previewUrl ?? null;
  previewIsVideoRef.current = Boolean(previewIsVideo);

  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;

    const measure = () => {
      const w = scroll.clientWidth;
      if (w > 0) setViewportWidth(w);
    };

    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(scroll);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    if (!previewUrl || !previewIsVideo || totalSec <= 0) {
      setThumbnails([]);
      return;
    }

    let cancelled = false;
    setThumbsLoading(true);
    void generateVideoFilmstrip(previewUrl, totalSec, frameCount).then((frames) => {
      if (!cancelled) {
        setThumbnails(frames);
        setThumbsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [previewUrl, previewIsVideo, totalSec, frameCount]);

  useEffect(() => {
    return () => {
      stopPreviewRef.current?.();
      stopPreviewRef.current = null;
    };
  }, []);

  const applyZoomDelta = useCallback(
    (delta: number, anchorClientX?: number) => {
      const scroll = scrollRef.current;
      if (!scroll || viewportWidth <= 0) return;

      const prevPct = zoomPctRef.current;
      const nextPct = Math.min(100, Math.max(0, prevPct + delta));
      if (nextPct === prevPct) return;

      const oldPps = timelineZoomPxPerSec(totalSec, viewportWidth, prevPct, MAX_CLIP_SEC);
      const newPps = timelineZoomPxPerSec(totalSec, viewportWidth, nextPct, MAX_CLIP_SEC);

      zoomPctRef.current = nextPct;
      setZoomPct(nextPct);

      if (anchorClientX == null) return;

      const rect = scroll.getBoundingClientRect();
      const anchorScrollX = anchorClientX - rect.left + scroll.scrollLeft;
      const anchorTime = (anchorScrollX / (totalSec * oldPps)) * totalSec;
      const newAnchorScrollX = (anchorTime / totalSec) * (totalSec * newPps);
      scroll.scrollLeft = Math.max(
        0,
        newAnchorScrollX - (anchorClientX - rect.left),
      );
    },
    [totalSec, viewportWidth],
  );

  useEffect(() => {
    const audio = audioRef.current;
    const video = videoRef.current;
    if (!previewUrl) return;

    if (previewIsVideo && video) {
      video.src = previewUrl;
      video.preload = "auto";
      video.playsInline = true;
      video.volume = 1;
      video.muted = false;
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
    } else if (audio) {
      audio.src = previewUrl;
      audio.preload = "auto";
      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
    }
  }, [previewUrl, previewIsVideo]);

  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const step = Math.sign(-e.deltaY) * Math.max(3, Math.min(10, Math.abs(e.deltaY) * 0.04));
      applyZoomDelta(step, e.clientX);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchRef.current = {
          dist: touchDistance(e.touches),
          zoom: zoomPctRef.current,
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const pinch = pinchRef.current;
      if (!pinch || e.touches.length < 2) return;
      e.preventDefault();
      const dist = touchDistance(e.touches);
      if (pinch.dist <= 0) return;
      const scale = dist / pinch.dist;
      const next = Math.min(100, Math.max(0, pinch.zoom + (scale - 1) * 55));
      if (Math.abs(next - zoomPctRef.current) < 0.4) return;

      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const delta = next - zoomPctRef.current;
      applyZoomDelta(delta, midX);
      pinchRef.current = { dist, zoom: zoomPctRef.current };
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchRef.current = null;
    };

    scroll.addEventListener("wheel", onWheel, { passive: false });
    scroll.addEventListener("touchstart", onTouchStart, { passive: true });
    scroll.addEventListener("touchmove", onTouchMove, { passive: false });
    scroll.addEventListener("touchend", onTouchEnd);
    scroll.addEventListener("touchcancel", onTouchEnd);
    return () => {
      scroll.removeEventListener("wheel", onWheel);
      scroll.removeEventListener("touchstart", onTouchStart);
      scroll.removeEventListener("touchmove", onTouchMove);
      scroll.removeEventListener("touchend", onTouchEnd);
      scroll.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [applyZoomDelta]);

  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll || viewportWidth <= 0) return;
    const pps = timelineZoomPxPerSec(totalSec, viewportWidth, zoomPctRef.current, MAX_CLIP_SEC);
    const selCenter = trimStart * pps + ((trimEnd - trimStart) * pps) / 2;
    const target = selCenter - scroll.clientWidth / 2;
    scroll.scrollLeft = Math.max(0, Math.min(target, scroll.scrollWidth - scroll.clientWidth));
  }, [trimStart, trimEnd, totalSec, viewportWidth]);

  const secFromX = useCallback(
    (clientX: number) => {
      const scroll = scrollRef.current;
      if (!scroll || totalSec <= 0) return 0;
      const rect = scroll.getBoundingClientRect();
      const x = clientX - rect.left + scroll.scrollLeft;
      const trackW = totalSec * pxPerSec;
      const ratio = Math.max(0, Math.min(1, x / trackW));
      return ratio * totalSec;
    },
    [totalSec, pxPerSec],
  );

  const getActivePreviewEl = useCallback((): HTMLVideoElement | HTMLAudioElement | null => {
    if (!previewUrlRef.current) return null;
    if (previewIsVideoRef.current && videoRef.current) return videoRef.current;
    return audioRef.current;
  }, []);

  const silenceInactivePreview = useCallback((active: HTMLMediaElement | null) => {
    const audio = audioRef.current;
    const video = videoRef.current;
    if (audio && audio !== active) {
      audio.pause();
      if (previewIsVideoRef.current) {
        audio.removeAttribute("src");
        audio.load();
      }
    }
    if (video && video !== active) {
      video.pause();
      if (!previewIsVideoRef.current) {
        video.removeAttribute("src");
        video.load();
      }
    }
  }, []);

  const stopPlayheadLoop = () => {
    if (playheadRafRef.current != null) {
      cancelAnimationFrame(playheadRafRef.current);
      playheadRafRef.current = null;
    }
  };

  const beginPreviewMonitor = (el: HTMLMediaElement) => {
    monitorCleanupRef.current?.();
    stopPreviewRef.current?.();
    stopPlayheadLoop();
    setPlayheadTime(trimStartRef.current);

    const checkEnd = (): boolean => {
      const t = el.currentTime;
      setPlayheadTime(t);

      if (previewUrlRef.current) {
        if (t >= trimEndRef.current - 0.03) {
          el.pause();
          try {
            el.currentTime = trimStartRef.current;
          } catch {
            /* ignore */
          }
          stopPreview();
          return true;
        }
      } else if (Number.isFinite(el.duration) && t >= el.duration - 0.03) {
        el.pause();
        stopPreview();
        return true;
      }
      return false;
    };

    const onTimeUpdate = () => {
      if (!playingRef.current) return;
      checkEnd();
    };

    const intervalId = window.setInterval(() => {
      if (!playingRef.current) return;
      checkEnd();
    }, 80);

    const tick = () => {
      if (!playingRef.current) return;
      if (checkEnd()) return;
      playheadRafRef.current = requestAnimationFrame(tick);
    };

    el.addEventListener("timeupdate", onTimeUpdate);
    playheadRafRef.current = requestAnimationFrame(tick);

    const cleanup = () => {
      el.removeEventListener("timeupdate", onTimeUpdate);
      window.clearInterval(intervalId);
      stopPlayheadLoop();
    };

    monitorCleanupRef.current = cleanup;
    stopPreviewRef.current = cleanup;
  };

  useEffect(() => {
    return () => stopPlayheadLoop();
  }, []);

  const syncPreviewToSelection = useCallback(
    async (autoplay: boolean) => {
      const el = getActivePreviewEl();
      if (!el) return;

      const shouldPlay = autoplay && playingRef.current;
      if (shouldPlay) el.pause();

      silenceInactivePreview(el);
      await seekMediaTo(el, trimStartRef.current, { pauseFirst: true });
      setPlayheadTime(trimStartRef.current);

      if (shouldPlay) {
        beginPreviewMonitor(el);
        try {
          await el.play();
        } catch {
          stopPreview();
        }
      }
    },
    [getActivePreviewEl, silenceInactivePreview],
  );

  useEffect(() => {
    if (!playing) return;
    void syncPreviewToSelection(true);
  }, [trimStart, playing, syncPreviewToSelection]);

  const stopPreview = () => {
    monitorCleanupRef.current?.();
    monitorCleanupRef.current = null;
    stopPlayheadLoop();
    stopPreviewRef.current?.();
    stopPreviewRef.current = null;
    audioRef.current?.pause();
    videoRef.current?.pause();
    setPlayheadTime(null);
    setPlaying(false);
  };

  const playElement = async (el: HTMLVideoElement | HTMLAudioElement) => {
    const url = previewUrlRef.current;
    if (!url) return false;

    silenceInactivePreview(el);
    el.src = url;
    el.volume = 1;
    if (el instanceof HTMLVideoElement) {
      el.muted = false;
      el.playsInline = true;
      el.setAttribute("playsinline", "");
      el.preservesPitch = true;
    }

    if (el.readyState < 1) {
      await new Promise<void>((resolve) => {
        el.addEventListener("loadedmetadata", () => resolve(), { once: true });
        window.setTimeout(resolve, 5000);
      });
    }

    await seekMediaTo(el, trimStartRef.current, { pauseFirst: true });
    beginPreviewMonitor(el);
    await el.play();
    return true;
  };

  const togglePlay = () => {
    if (playing) {
      stopPreview();
      return;
    }

    if (!previewUrl) {
      const audio = audioRef.current;
      if (!audio || !clip) return;
      audio.src = clip.url;
      audio.currentTime = 0;
      beginPreviewMonitor(audio);
      void audio.play().then(() => setPlaying(true)).catch(() => stopPreview());
      return;
    }

    void (async () => {
      try {
        if (previewIsVideoRef.current && videoRef.current) {
          await playElement(videoRef.current);
          setPlaying(true);
          return;
        }
        if (audioRef.current) {
          await playElement(audioRef.current);
          setPlaying(true);
        }
      } catch {
        stopPreview();
      }
    })();
  };

  const endDrag = () => {
    dragRef.current = null;
    if (scrollRef.current) scrollRef.current.style.touchAction = "pan-x";
    window.removeEventListener("pointermove", onWindowPointerMove);
    window.removeEventListener("pointerup", onWindowPointerUp);
    window.removeEventListener("pointercancel", onWindowPointerUp);
  };

  const onWindowPointerMove = (e: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    const deltaSec = secFromX(e.clientX) - secFromX(drag.originX);
    let nextStart = drag.start0;
    let nextEnd = drag.end0;

    if (drag.kind === "left") {
      const next = clampTrimResizeLeft(
        totalSec,
        drag.start0,
        drag.end0,
        drag.start0 + deltaSec,
      );
      nextStart = next.start;
      nextEnd = next.end;
    } else if (drag.kind === "right") {
      const next = clampTrimResizeRight(
        totalSec,
        drag.start0,
        drag.end0,
        drag.end0 + deltaSec,
      );
      nextStart = next.start;
      nextEnd = next.end;
    } else {
      const next = clampTrimMove(
        totalSec,
        drag.start0,
        drag.end0,
        drag.start0 + deltaSec,
      );
      nextStart = next.start;
      nextEnd = next.end;
    }

    onRangeChange(nextStart, nextEnd);

    if (playingRef.current) {
      trimStartRef.current = nextStart;
      trimEndRef.current = nextEnd;
      void syncPreviewToSelection(true);
    }
  };

  const onWindowPointerUp = (e: PointerEvent) => {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
    const wasPlaying = playingRef.current;
    endDrag();
    if (wasPlaying) {
      void syncPreviewToSelection(true);
    }
  };

  const beginDrag = (kind: DragKind, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (scrollRef.current) scrollRef.current.style.touchAction = "none";
    dragRef.current = {
      kind,
      pointerId: e.pointerId,
      originX: e.clientX,
      start0: trimStart,
      end0: trimEnd,
    };
    window.addEventListener("pointermove", onWindowPointerMove);
    window.addEventListener("pointerup", onWindowPointerUp);
    window.addEventListener("pointercancel", onWindowPointerUp);
  };

  const onTrackPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest(".vs-capcut__handle")) return;
    if ((e.target as HTMLElement).closest(".vs-capcut__body")) return;
    const sec = secFromX(e.clientX);
    const dur = trimEnd - trimStart;
    const next = clampTrimMove(totalSec, trimStart, trimEnd, sec - dur / 2);
    onRangeChange(next.start, next.end);
  };

  const playheadPx =
    playheadTime != null
      ? Math.max(leftPx, Math.min(leftPx + widthPx, playheadTime * pxPerSec))
      : null;

  return (
    <div className="vs-capcut">
      <div className="vs-capcut__alert">
        <Scissors className="h-4 w-4 shrink-0" aria-hidden />
        <div>
          <strong>Fichier trop long ({formatClipTime(totalSec)})</strong>
          <p>
            Bloc {MIN_CLIP_SEC}–{MAX_CLIP_SEC} s · tire les <strong>bandes blanches</strong>{" "}
            · swipe · molette ou pinch pour zoomer · ▶ lit la sélection.
          </p>
        </div>
      </div>

      <div className="vs-capcut__head">
        <span className="vs-capcut__range">
          {formatClipTime(trimStart)} → {formatClipTime(trimEnd)}
          <em> ({formatClipTime(selectionSec)} sélectionnées)</em>
        </span>
        <div className="vs-capcut__head-actions">
          <button
            type="button"
            className="vs-capcut__play"
            onClick={togglePlay}
            disabled={!canPreview}
            aria-label="Écouter la sélection"
          >
            {playing ? (
              <Pause className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Play className="h-3.5 w-3.5" aria-hidden />
            )}
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="vs-capcut__scroll">
        <div
          ref={innerRef}
          className="vs-capcut__track-inner"
          style={{ width: trackWidthPx }}
          onPointerDown={onTrackPointerDown}
          role="group"
          aria-label="Timeline de découpe"
        >
          <div className="vs-capcut__filmstrip" aria-hidden>
            {thumbnails.length > 0
              ? thumbnails.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt=""
                    className="vs-capcut__thumb"
                    style={{ width: thumbSlotPx }}
                    draggable={false}
                  />
                ))
              : Array.from({ length: frameCount }).map((_, i) => (
                  <span
                    key={i}
                    className={`vs-capcut__frame${thumbsLoading ? " is-loading" : ""}`}
                    style={{ width: thumbSlotPx }}
                  />
                ))}
          </div>

          <div
            className="vs-capcut__shade vs-capcut__shade--left"
            style={{ width: leftPx }}
            aria-hidden
          />
          <div
            className="vs-capcut__shade vs-capcut__shade--right"
            style={{
              left: leftPx + widthPx,
              width: Math.max(0, trackWidthPx - leftPx - widthPx),
            }}
            aria-hidden
          />

          <div
            className="vs-capcut__selection"
            style={{ left: leftPx, width: widthPx }}
          >
            <button
              type="button"
              className="vs-capcut__handle vs-capcut__handle--left"
              aria-label="Réduire le début"
              onPointerDown={(e) => beginDrag("left", e)}
            >
              <span className="vs-capcut__grip" aria-hidden />
            </button>
            <button
              type="button"
              className="vs-capcut__body"
              aria-label="Déplacer la sélection"
              onPointerDown={(e) => beginDrag("move", e)}
            />
            <button
              type="button"
              className="vs-capcut__handle vs-capcut__handle--right"
              aria-label="Réduire la fin"
              onPointerDown={(e) => beginDrag("right", e)}
            >
              <span className="vs-capcut__grip" aria-hidden />
            </button>
            <span className="vs-capcut__dur">{formatClipTime(selectionSec)}</span>
          </div>

          {playing && playheadPx != null ? (
            <span
              className="vs-capcut__playhead"
              style={{ left: playheadPx }}
              aria-hidden
            />
          ) : null}
        </div>
      </div>

      <div className="vs-capcut__labels">
        <span>0:00</span>
        <span className="vs-capcut__swipe-hint">← swipe · molette / pinch →</span>
        <span>{formatClipTime(totalSec)}</span>
      </div>

      {isDecoding ? (
        <p className="vs-capcut__decoding">Préparation HD de l’extrait pour le clonage…</p>
      ) : null}

      <video
        ref={videoRef}
        className="vs-capcut__media"
        playsInline
        preload="auto"
        onLoadedMetadata={(event) => {
          const dur = event.currentTarget.duration;
          if (Number.isFinite(dur) && dur > 0) {
            onMediaDuration?.(dur);
          }
        }}
      />
      <audio ref={audioRef} className="vs-capcut__media" preload="auto" />
    </div>
  );
}

type VoiceClipPreviewProps = {
  clip: VoiceClip;
  label?: string;
};

export function VoiceClipPreview({ clip, label }: VoiceClipPreviewProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnd = () => setPlaying(false);
    audio.addEventListener("ended", onEnd);
    return () => audio.removeEventListener("ended", onEnd);
  }, [clip.url]);

  useEffect(() => {
    setPlaying(false);
    audioRef.current?.pause();
  }, [clip.url]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    audio.src = clip.url;
    audio.currentTime = 0;
    void audio.play();
    setPlaying(true);
  };

  return (
    <div className="vs-clip-preview">
      <button type="button" className="vs-clip-preview__btn" onClick={toggle}>
        {playing ? (
          <Pause className="h-4 w-4" aria-hidden />
        ) : (
          <Play className="h-4 w-4" aria-hidden />
        )}
        Écouter mon extrait
      </button>
      <span className="vs-clip-preview__meta">
        {label ?? formatClipTime(clip.durationSec)}
      </span>
      <audio ref={audioRef} className="sr-only" preload="auto" />
    </div>
  );
}
