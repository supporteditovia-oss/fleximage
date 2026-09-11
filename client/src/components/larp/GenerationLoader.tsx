import { useState, useEffect, useRef, useMemo, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Gem } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BrandMark } from "@/components/BrandMark";
import {
  useGenerationCountdown,
  useGenerationProgress,
} from "@/hooks/use-generation-countdown";
import { acquireGenerationLoaderTheme } from "@/lib/generation-loader-theme";
import "./generation-loader.css";

export function GenerationLoaderBackdrop({ zIndex = 100 }: { zIndex?: number }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="lx-gen-loader__base fixed inset-0"
      style={{ zIndex }}
      aria-hidden
    />,
    document.body,
  );
}

interface GenerationLoaderProps {
  status: "connecting" | "waiting" | "success";
  estimatedSeconds?: number;
  serverRemainingSeconds?: number | null;
  startedAtMs?: number | null;
  taskId?: string;
  inputImageUrl?: string;
  resultUrls?: string[];
  onRevealStart?: () => void;
  onRevealComplete?: () => void;
}

const DEFAULT_ESTIMATE_SECONDS = 50;
const MESSAGE_INTERVAL_MS = 1800;
const EXIT_FADE_MS = 400;
/** Périmètre approx. du cadre 9:16 arrondi (viewBox 100×160). */
const FRAME_PERIMETER = 482;

const SPARKS = [
  { left: "8%", top: "18%", size: 3, dur: "7s", delay: "0s" },
  { left: "22%", top: "72%", size: 2, dur: "9s", delay: "1.2s" },
  { left: "68%", top: "28%", size: 2.5, dur: "8s", delay: "0.6s" },
  { left: "84%", top: "58%", size: 2, dur: "10s", delay: "2s" },
  { left: "46%", top: "8%", size: 2, dur: "8.5s", delay: "1.8s" },
  { left: "92%", top: "82%", size: 3, dur: "7.5s", delay: "0.4s" },
] as const;

export function GenerationLoader({
  status,
  estimatedSeconds = DEFAULT_ESTIMATE_SECONDS,
  serverRemainingSeconds = null,
  startedAtMs = null,
  taskId = "loader",
  inputImageUrl,
  resultUrls,
  onRevealStart,
  onRevealComplete,
}: GenerationLoaderProps) {
  const { t } = useTranslation();
  const progressMessages = useMemo(
    () => [
      t("progress.stepAnalyze"),
      t("progress.stepUnderstood"),
      t("progress.stepEditing"),
      t("progress.stepFinishing"),
    ],
    [t],
  );
  const themeBundleRef = useRef(acquireGenerationLoaderTheme(taskId));
  const { theme, isContinuation } = themeBundleRef.current;
  const [phase, setPhase] = useState<"dissolve" | "blur" | "logo">(
    isContinuation ? "logo" : "dissolve",
  );
  const [messageIndex, setMessageIndex] = useState(0);
  const [messageKey, setMessageKey] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [resultPreloaded, setResultPreloaded] = useState(false);
  const revealFired = useRef(false);
  const lockedEstimate = useRef(Math.max(25, Math.round(estimatedSeconds)));

  useEffect(() => {
    lockedEstimate.current = Math.max(
      lockedEstimate.current,
      Math.max(25, Math.round(estimatedSeconds)),
    );
  }, [estimatedSeconds]);

  const remaining = useGenerationCountdown(
    taskId,
    startedAtMs,
    lockedEstimate.current,
    status === "success",
    serverRemainingSeconds,
  );

  const progress = useGenerationProgress(
    taskId,
    startedAtMs,
    lockedEstimate.current,
    status === "success",
  );

  const isOvertime = remaining <= 0 && status !== "success";

  useEffect(() => {
    if (phase !== "dissolve") return;
    const timer = setTimeout(() => setPhase("blur"), 700);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "blur") return;
    const timer = setTimeout(() => setPhase("logo"), 900);
    return () => clearTimeout(timer);
  }, [phase]);

  const resultUrl = resultUrls?.[0] ?? null;

  useEffect(() => {
    if (status !== "success") {
      setResultPreloaded(false);
      return;
    }
    if (!resultUrl) {
      setResultPreloaded(true);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled) setResultPreloaded(true);
    };
    img.onerror = () => {
      if (!cancelled) setResultPreloaded(true);
    };
    img.src = resultUrl;
    return () => {
      cancelled = true;
    };
  }, [status, resultUrl]);

  useEffect(() => {
    if (status !== "success" || !resultPreloaded || revealFired.current) return;
    const timer = window.setTimeout(() => {
      if (revealFired.current) return;
      revealFired.current = true;
      onRevealStart?.();
      setIsExiting(true);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [status, resultPreloaded, onRevealStart]);

  useEffect(() => {
    if (!isExiting) return;
    const timer = window.setTimeout(() => onRevealComplete?.(), EXIT_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [isExiting, onRevealComplete]);

  useEffect(() => {
    const id = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % progressMessages.length);
      setMessageKey((k) => k + 1);
    }, MESSAGE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [progressMessages.length]);

  const isBlurring = phase === "blur" || phase === "logo";
  const progressDash = Math.max(8, progress * FRAME_PERIMETER);
  const progressPct = Math.round(progress * 100);

  const themeStyle = {
    "--lx-accent": theme.accent,
    "--lx-accent-soft": theme.accentSoft,
    "--lx-accent-deep": theme.accentDeep,
    "--lx-glow": theme.glow,
    "--lx-aurora-a": theme.auroraA,
    "--lx-aurora-b": theme.auroraB,
  } as CSSProperties;

  const renderFrame = (imageSrc: string, alt: string, isResult = false) => (
    <div className="lx-gen-loader__viewport">
      <motion.img
        src={imageSrc}
        alt={alt}
        className="lx-gen-loader__photo"
        animate={
          isResult
            ? { filter: "blur(0px) brightness(1) saturate(1.05)", scale: 1 }
            : {
                filter: isBlurring
                  ? "blur(22px) brightness(0.38) saturate(0.8)"
                  : "blur(0px) brightness(1) saturate(1)",
                scale: isBlurring ? 1.06 : 1,
              }
        }
        transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1] }}
      />
      <div className="lx-gen-loader__photo-shade" aria-hidden />
      {!isResult && !isExiting ? (
        <>
          <div className="lx-gen-loader__scan" aria-hidden />
          <div className="lx-gen-loader__prism" aria-hidden />
        </>
      ) : null}

      <svg
        className="lx-gen-loader__frame-ring"
        viewBox="0 0 100 160"
        preserveAspectRatio="none"
        aria-hidden
      >
        <rect
          x="2.5"
          y="2.5"
          width="95"
          height="155"
          rx="10"
          ry="10"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1.8"
          vectorEffect="non-scaling-stroke"
        />
        {!isResult && (
          <rect
            x="2.5"
            y="2.5"
            width="95"
            height="155"
            rx="10"
            ry="10"
            fill="none"
            stroke="url(#lx-frame-progress)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeDasharray={`${progressDash} ${FRAME_PERIMETER}`}
            className="lx-gen-loader__frame-progress"
            vectorEffect="non-scaling-stroke"
          />
        )}
        <defs>
          <linearGradient id="lx-frame-progress" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--lx-accent-deep)" />
            <stop offset="45%" stopColor="var(--lx-accent-soft)" />
            <stop offset="100%" stopColor="var(--lx-accent)" />
          </linearGradient>
        </defs>
      </svg>

      <span className="lx-gen-loader__corner lx-gen-loader__corner--tl" aria-hidden />
      <span className="lx-gen-loader__corner lx-gen-loader__corner--tr" aria-hidden />
      <span className="lx-gen-loader__corner lx-gen-loader__corner--bl" aria-hidden />
      <span className="lx-gen-loader__corner lx-gen-loader__corner--br" aria-hidden />
    </div>
  );

  const loaderTree = (
    <motion.div
      className="lx-gen-loader fixed inset-0 z-[101] overflow-hidden"
      style={themeStyle}
      initial={false}
      animate={{ opacity: 1 }}
      role="status"
      aria-live="polite"
      aria-busy={!isExiting}
    >
      <div className="lx-gen-loader__base absolute inset-0" aria-hidden />
      <div className="lx-gen-loader__aurora absolute inset-0" aria-hidden />
      <div className="lx-gen-loader__rays absolute inset-0" aria-hidden />
      <div className="lx-gen-loader__grain absolute inset-0" aria-hidden />

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {SPARKS.map((s, i) => (
          <span
            key={i}
            className="lx-gen-loader__spark"
            style={
              {
                left: s.left,
                top: s.top,
                width: s.size,
                height: s.size,
                "--dur": s.dur,
                "--delay": s.delay,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="lx-gen-loader__stage">
        {resultUrl && isExiting ? (
          <motion.div
            className="lx-gen-loader__frame-wrap"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: EXIT_FADE_MS / 1000, ease: "easeOut" }}
          >
            {renderFrame(resultUrl, "", true)}
          </motion.div>
        ) : inputImageUrl && !isExiting ? (
          <motion.div
            className="lx-gen-loader__frame-wrap"
            initial={isContinuation ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: isContinuation ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            {renderFrame(inputImageUrl, t("progress.inputAlt"))}
          </motion.div>
        ) : (
          <div className="lx-gen-loader__frame-wrap lx-gen-loader__frame-wrap--empty">
            <div className="lx-gen-loader__viewport lx-gen-loader__viewport--empty">
              <div className="lx-gen-loader__empty-glow" aria-hidden />
            </div>
          </div>
        )}
      </div>

      <motion.div
        className="lx-gen-loader__hud"
        initial={isContinuation ? false : { opacity: 0, y: 24 }}
        animate={{
          opacity: isExiting ? 0 : 1,
          y: isExiting ? 12 : 0,
        }}
        transition={{
          duration: isExiting ? EXIT_FADE_MS / 1000 : isContinuation ? 0 : 0.55,
          delay: isExiting || isContinuation ? 0 : 0.15,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <div className="lx-gen-loader__hud-top">
          <div className="lx-gen-loader__count-block">
            {status === "success" || isOvertime ? (
              <span className="lx-gen-loader__count-symbol" aria-hidden>
                ✦
              </span>
            ) : (
              <>
                <span className="lx-gen-loader__count-num">{remaining}</span>
                <span className="lx-gen-loader__count-unit">
                  {t("progress.seconds")}
                </span>
              </>
            )}
          </div>

          <div className="lx-gen-loader__meter" aria-hidden>
            <div
              className="lx-gen-loader__meter-fill"
              style={{ width: `${progressPct}%` }}
            />
            <span className="lx-gen-loader__meter-label">{progressPct}%</span>
          </div>
        </div>

        <div className="lx-gen-loader__copy">
          {isOvertime && status !== "success" ? (
            <p className="lx-gen-loader__hint">
              {t("progress.almostReady", "Presque prêt — ne quitte pas l'écran…")}
            </p>
          ) : null}
          <p key={messageKey} className="lx-gen-loader__step">
            {status === "success"
              ? t("progress.stepFinishing")
              : progressMessages[messageIndex]}
          </p>
        </div>

        <div className="lx-gen-loader__brand">
          <Gem
            className="lx-gen-loader__brand-gem"
            strokeWidth={1.75}
            aria-hidden
          />
          <BrandMark
            className="lx-gen-loader__brand-text"
            accentClassName="lx-gen-loader__brand-accent"
          />
        </div>
      </motion.div>
    </motion.div>
  );

  if (typeof document === "undefined") return loaderTree;
  return createPortal(loaderTree, document.body);
}
