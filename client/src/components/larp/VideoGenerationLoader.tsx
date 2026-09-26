import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Check, Gem } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BrandMark } from "@/components/BrandMark";
import {
  useGenerationCountdown,
  useGenerationProgress,
} from "@/hooks/use-generation-countdown";
import { acquireGenerationLoaderTheme } from "@/lib/generation-loader-theme";
import { formatClock } from "@/lib/video-generation-timing";
import "./video-generation-loader.css";

export type VideoLoaderWorkflow = "image_to_video" | "video_to_video";

interface VideoGenerationLoaderProps {
  status: "connecting" | "waiting" | "success";
  workflow?: VideoLoaderWorkflow;
  estimatedSeconds: number;
  serverRemainingSeconds?: number | null;
  startedAtMs?: number | null;
  taskId?: string;
  inputImageUrl?: string;
  inputVideoUrl?: string;
  aspectRatio?: string;
  specs?: string[];
  onRevealStart?: () => void;
  onRevealComplete?: () => void;
}

type Copy = {
  eyebrow: Record<VideoLoaderWorkflow, string>;
  chapters: Record<VideoLoaderWorkflow, [string, string, string, string]>;
  remaining: string;
  total: (clock: string) => string;
  connecting: string;
  overtimeTitle: string;
  overtimeHint: string;
  elapsed: string;
  stayHint: string;
  ready: string;
};

const COPY: Record<"fr" | "en" | "es" | "de", Copy> = {
  fr: {
    eyebrow: { image_to_video: "Image → Vidéo", video_to_video: "Vidéo → Vidéo" },
    chapters: {
      image_to_video: [
        "Préparation de la scène",
        "Direction artistique IA",
        "Rendu cinématique",
        "Étalonnage & export",
      ],
      video_to_video: [
        "Analyse de ta vidéo",
        "Lecture du mouvement",
        "Transformation de la scène",
        "Étalonnage & export",
      ],
    },
    remaining: "restant",
    total: (c) => `≈ ${c} au total`,
    connecting: "Envoi au studio…",
    overtimeTitle: "Finalisation du rendu",
    overtimeHint:
      "Les rendus cinéma prennent parfois un peu plus longtemps — ta vidéo arrive.",
    elapsed: "écoulées",
    stayHint: "Ta vidéo sera aussi enregistrée dans ton Historique.",
    ready: "Ta vidéo est prête",
  },
  en: {
    eyebrow: { image_to_video: "Image → Video", video_to_video: "Video → Video" },
    chapters: {
      image_to_video: [
        "Setting the scene",
        "AI art direction",
        "Cinematic render",
        "Grading & export",
      ],
      video_to_video: [
        "Analyzing your video",
        "Reading the motion",
        "Transforming the scene",
        "Grading & export",
      ],
    },
    remaining: "left",
    total: (c) => `≈ ${c} total`,
    connecting: "Sending to the studio…",
    overtimeTitle: "Finishing the render",
    overtimeHint:
      "Cinema renders sometimes take a little longer — your video is on its way.",
    elapsed: "elapsed",
    stayHint: "Your video will also be saved in your History.",
    ready: "Your video is ready",
  },
  es: {
    eyebrow: { image_to_video: "Imagen → Vídeo", video_to_video: "Vídeo → Vídeo" },
    chapters: {
      image_to_video: [
        "Preparando la escena",
        "Dirección artística IA",
        "Render cinematográfico",
        "Etalonaje y exportación",
      ],
      video_to_video: [
        "Analizando tu vídeo",
        "Leyendo el movimiento",
        "Transformando la escena",
        "Etalonaje y exportación",
      ],
    },
    remaining: "restante",
    total: (c) => `≈ ${c} en total`,
    connecting: "Enviando al estudio…",
    overtimeTitle: "Finalizando el render",
    overtimeHint:
      "Los renders de cine a veces tardan un poco más — tu vídeo está llegando.",
    elapsed: "transcurridos",
    stayHint: "Tu vídeo también se guardará en tu Historial.",
    ready: "Tu vídeo está listo",
  },
  de: {
    eyebrow: { image_to_video: "Bild → Video", video_to_video: "Video → Video" },
    chapters: {
      image_to_video: [
        "Szene wird vorbereitet",
        "KI-Art-Direction",
        "Kino-Rendering",
        "Color Grading & Export",
      ],
      video_to_video: [
        "Video wird analysiert",
        "Bewegung wird gelesen",
        "Szene wird verwandelt",
        "Color Grading & Export",
      ],
    },
    remaining: "übrig",
    total: (c) => `≈ ${c} gesamt`,
    connecting: "Wird ans Studio gesendet…",
    overtimeTitle: "Rendering wird abgeschlossen",
    overtimeHint:
      "Kino-Renderings dauern manchmal etwas länger — dein Video kommt gleich.",
    elapsed: "vergangen",
    stayHint: "Dein Video wird auch in deinem Verlauf gespeichert.",
    ready: "Dein Video ist fertig",
  },
};

/** Bornes de fin de chapitre (fraction de l'estimation). */
const CHAPTER_ENDS = [0.1, 0.24, 0.86, 1] as const;
const FPS = 24;
const EXIT_FADE_MS = 650;
const FILM_CELLS = 8;

function resolveCopy(lang: string | undefined): Copy {
  const key = (lang || "fr").slice(0, 2) as keyof typeof COPY;
  return COPY[key] ?? COPY.fr;
}

function aspectToCss(aspect: string | undefined): string {
  const match = /^(\d+):(\d+)$/.exec(aspect || "");
  return match ? `${match[1]} / ${match[2]}` : "9 / 16";
}

function formatTimecode(ms: number): string {
  const totalFrames = Math.floor((Math.max(0, ms) / 1000) * FPS);
  const ff = totalFrames % FPS;
  const totalSec = Math.floor(totalFrames / FPS);
  const ss = totalSec % 60;
  const mm = Math.floor(totalSec / 60) % 60;
  const hh = Math.floor(totalSec / 3600);
  return [hh, mm, ss, ff].map((n) => String(n).padStart(2, "0")).join(":");
}

/** Extrait une vignette d'une vidéo locale (blob) pour la pellicule. */
function useVideoPoster(videoUrl: string | undefined): string | null {
  const [poster, setPoster] = useState<string | null>(null);
  useEffect(() => {
    setPoster(null);
    if (!videoUrl) return;
    let cancelled = false;
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.crossOrigin = "anonymous";
    const capture = () => {
      if (cancelled || !video.videoWidth) return;
      try {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 360 / video.videoWidth);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
        setPoster(canvas.toDataURL("image/jpeg", 0.72));
      } catch {
        /* canvas tainted — la pellicule reste en dégradé */
      }
    };
    video.addEventListener("loadeddata", () => {
      video.currentTime = Math.min(0.6, (video.duration || 1) / 2);
    });
    video.addEventListener("seeked", capture);
    video.src = videoUrl;
    return () => {
      cancelled = true;
      video.removeAttribute("src");
      video.load();
    };
  }, [videoUrl]);
  return poster;
}

export function VideoGenerationLoaderBackdrop({ zIndex = 100 }: { zIndex?: number }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="lx-vid-loader__backdrop fixed inset-0" style={{ zIndex }} aria-hidden />,
    document.body,
  );
}

export function VideoGenerationLoader({
  status,
  workflow = "image_to_video",
  estimatedSeconds,
  serverRemainingSeconds = null,
  startedAtMs = null,
  taskId = "video-loader",
  inputImageUrl,
  inputVideoUrl,
  aspectRatio,
  specs,
  onRevealStart,
  onRevealComplete,
}: VideoGenerationLoaderProps) {
  const { i18n } = useTranslation();
  const copy = resolveCopy(i18n.language);

  const sessionRef = useRef<ReturnType<typeof acquireGenerationLoaderTheme> | null>(
    null,
  );
  if (sessionRef.current === null) {
    sessionRef.current = acquireGenerationLoaderTheme(taskId, estimatedSeconds);
  }
  const { isContinuation, countdownSessionId, countdownStartedAtMs } =
    sessionRef.current;

  const lockedEstimate = useRef(Math.max(30, Math.round(estimatedSeconds)));
  const effectiveStartedAtMs = startedAtMs ?? countdownStartedAtMs;
  const isSuccess = status === "success";

  const remaining = useGenerationCountdown(
    countdownSessionId,
    effectiveStartedAtMs,
    lockedEstimate.current,
    isSuccess,
    serverRemainingSeconds,
  );
  const progress = useGenerationProgress(
    countdownSessionId,
    effectiveStartedAtMs,
    lockedEstimate.current,
    isSuccess,
  );

  const elapsedSec = Math.max(0, Math.floor((Date.now() - effectiveStartedAtMs) / 1000));
  const isOvertime = !isSuccess && remaining <= 0;
  const [isExiting, setIsExiting] = useState(false);
  const revealFired = useRef(false);

  useEffect(() => {
    if (!isSuccess || revealFired.current) return;
    const timer = window.setTimeout(() => {
      revealFired.current = true;
      onRevealStart?.();
      setIsExiting(true);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [isSuccess, onRevealStart]);

  useEffect(() => {
    if (!isExiting) return;
    const timer = window.setTimeout(() => onRevealComplete?.(), EXIT_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [isExiting, onRevealComplete]);

  const timecodeRef = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (timecodeRef.current) {
        timecodeRef.current.textContent = formatTimecode(
          Date.now() - effectiveStartedAtMs,
        );
      }
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, [effectiveStartedAtMs]);

  const videoPoster = useVideoPoster(inputVideoUrl);
  const stillUrl = inputImageUrl || videoPoster || undefined;

  const chapters = copy.chapters[workflow];
  const activeChapter = isSuccess
    ? chapters.length
    : Math.max(0, CHAPTER_ENDS.findIndex((end) => progress < end));
  const chapterLabel =
    status === "connecting" && progress < CHAPTER_ENDS[0]
      ? copy.connecting
      : isSuccess
        ? copy.ready
        : isOvertime
          ? copy.overtimeTitle
          : chapters[Math.min(activeChapter, chapters.length - 1)];

  const develop = isSuccess ? 1 : Math.min(1, progress);
  const mediaStyle = {
    filter: `blur(${(16 * (1 - develop) + 1.5).toFixed(1)}px) grayscale(${(
      0.85 *
      (1 - develop)
    ).toFixed(2)}) brightness(${(0.5 + 0.4 * develop).toFixed(2)}) contrast(1.08)`,
  } as CSSProperties;

  const progressPct = Math.round((isSuccess ? 1 : progress) * 100);
  const filmCells = useMemo(() => Array.from({ length: FILM_CELLS }), []);

  const renderFilmStrip = (side: "left" | "right") => (
    <div className={`lx-vid-loader__film lx-vid-loader__film--${side}`} aria-hidden>
      <div className="lx-vid-loader__film-track">
        {[0, 1].map((loop) => (
          <div key={loop} className="lx-vid-loader__film-loop">
            {filmCells.map((_, i) => (
              <div key={i} className="lx-vid-loader__film-cell">
                {stillUrl ? (
                  <img
                    src={stillUrl}
                    alt=""
                    className="lx-vid-loader__film-img"
                    style={{ objectPosition: `${50 + ((i % 3) - 1) * 18}% 50%` }}
                    draggable={false}
                  />
                ) : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  const tree = (
    <motion.div
      className="lx-vid-loader fixed inset-0 z-[101] overflow-hidden"
      initial={isContinuation ? false : { opacity: 0 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: isExiting ? EXIT_FADE_MS / 1000 : 0.6, ease: "easeOut" }}
      role="status"
      aria-live="polite"
      aria-busy={!isExiting}
    >
      <div className="lx-vid-loader__backdrop absolute inset-0" aria-hidden />
      <div className="lx-vid-loader__halo absolute inset-0" aria-hidden />
      <div className="lx-vid-loader__flare" aria-hidden />
      <div className="lx-vid-loader__grain absolute inset-0" aria-hidden />
      <div className="lx-vid-loader__vignette absolute inset-0" aria-hidden />

      <header className="lx-vid-loader__bar lx-vid-loader__bar--top">
        <div className="lx-vid-loader__rec">
          <span className="lx-vid-loader__rec-dot" aria-hidden />
          <span className="lx-vid-loader__rec-label">REC</span>
          <span ref={timecodeRef} className="lx-vid-loader__timecode">
            00:00:00:00
          </span>
        </div>
        <div className="lx-vid-loader__brand">
          <Gem className="lx-vid-loader__brand-gem" strokeWidth={1.6} aria-hidden />
          <BrandMark
            className="lx-vid-loader__brand-text"
            accentClassName="lx-vid-loader__brand-accent"
          />
        </div>
      </header>

      <div className="lx-vid-loader__stage">
        <p className="lx-vid-loader__eyebrow">
          <span className="lx-vid-loader__eyebrow-line" aria-hidden />
          {copy.eyebrow[workflow]}
          <span className="lx-vid-loader__eyebrow-line" aria-hidden />
        </p>

        <div className="lx-vid-loader__rig">
          {renderFilmStrip("left")}

          <div
            className={`lx-vid-loader__frame${isSuccess ? " is-ready" : ""}`}
            style={{ aspectRatio: aspectToCss(aspectRatio) }}
          >
            <div className="lx-vid-loader__media">
              {inputVideoUrl ? (
                <video
                  src={inputVideoUrl}
                  className="lx-vid-loader__media-el"
                  style={mediaStyle}
                  autoPlay
                  muted
                  loop
                  playsInline
                  aria-hidden
                />
              ) : stillUrl ? (
                <img
                  src={stillUrl}
                  alt=""
                  className="lx-vid-loader__media-el lx-vid-loader__media-el--still"
                  style={mediaStyle}
                  draggable={false}
                />
              ) : (
                <div className="lx-vid-loader__media-empty" />
              )}
            </div>
            <div className="lx-vid-loader__sweep" aria-hidden />
            <div className="lx-vid-loader__scanline" aria-hidden />
            <div className="lx-vid-loader__reticle" aria-hidden>
              <span />
              <span />
            </div>
            <span className="lx-vid-loader__bracket lx-vid-loader__bracket--tl" aria-hidden />
            <span className="lx-vid-loader__bracket lx-vid-loader__bracket--tr" aria-hidden />
            <span className="lx-vid-loader__bracket lx-vid-loader__bracket--bl" aria-hidden />
            <span className="lx-vid-loader__bracket lx-vid-loader__bracket--br" aria-hidden />
            {specs?.length ? (
              <div className="lx-vid-loader__specs" aria-hidden>
                {specs.map((spec) => (
                  <span key={spec}>{spec}</span>
                ))}
              </div>
            ) : null}
            <div className="lx-vid-loader__flash" aria-hidden />
          </div>

          {renderFilmStrip("right")}
        </div>

        <div className="lx-vid-loader__readout">
          {isSuccess ? (
            <span className="lx-vid-loader__clock lx-vid-loader__clock--symbol">✦</span>
          ) : isOvertime ? (
            <>
              <span className="lx-vid-loader__clock">{formatClock(elapsedSec)}</span>
              <span className="lx-vid-loader__clock-unit">{copy.elapsed}</span>
            </>
          ) : (
            <>
              <span className="lx-vid-loader__clock">{formatClock(remaining)}</span>
              <span className="lx-vid-loader__clock-unit">{copy.remaining}</span>
            </>
          )}
        </div>
        <p key={chapterLabel} className="lx-vid-loader__chapter">
          {chapterLabel}
        </p>
        <p className="lx-vid-loader__sub">
          {isOvertime
            ? copy.overtimeHint
            : isSuccess
              ? " "
              : `${copy.total(formatClock(lockedEstimate.current))} · ${copy.stayHint}`}
        </p>
      </div>

      <footer className="lx-vid-loader__bar lx-vid-loader__bar--bottom">
        <div className="lx-vid-loader__timeline">
          <div className="lx-vid-loader__track">
            <div
              className="lx-vid-loader__track-fill"
              style={{ width: `${progressPct}%` }}
            />
            {CHAPTER_ENDS.slice(0, -1).map((end) => (
              <span
                key={end}
                className={`lx-vid-loader__keyframe${progress >= end || isSuccess ? " is-done" : ""}`}
                style={{ left: `${end * 100}%` }}
                aria-hidden
              />
            ))}
            <span
              className="lx-vid-loader__playhead"
              style={{ left: `${progressPct}%` }}
              aria-hidden
            >
              <span className="lx-vid-loader__playhead-tag">{progressPct}%</span>
            </span>
          </div>
          <ol className="lx-vid-loader__chapters">
            {chapters.map((label, i) => {
              const state =
                i < activeChapter ? "done" : i === activeChapter ? "active" : "todo";
              return (
                <li
                  key={label}
                  className={`lx-vid-loader__chapter-item is-${state}`}
                >
                  {state === "done" ? (
                    <Check className="lx-vid-loader__chapter-check" strokeWidth={2.4} aria-hidden />
                  ) : (
                    <span className="lx-vid-loader__chapter-index">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  )}
                  <span className="lx-vid-loader__chapter-label">{label}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </footer>
    </motion.div>
  );

  if (typeof document === "undefined") return tree;
  return createPortal(tree, document.body);
}
