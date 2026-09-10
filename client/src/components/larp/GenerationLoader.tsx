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
import "./generation-loader.css";

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

const PARTICLES = [
  { left: "12%", size: 2, dur: "14s", delay: "0s", drift: "12px" },
  { left: "28%", size: 1.5, dur: "16s", delay: "2s", drift: "-10px" },
  { left: "55%", size: 2, dur: "15s", delay: "4s", drift: "8px" },
  { left: "78%", size: 1.5, dur: "17s", delay: "1s", drift: "-6px" },
  { left: "90%", size: 2, dur: "15.5s", delay: "3.5s", drift: "10px" },
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
  const [phase, setPhase] = useState<"dissolve" | "blur" | "logo">("dissolve");
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
  const particles = useMemo(() => PARTICLES, []);

  const loaderTree = (
    <motion.div
      className="lx-gen-loader fixed inset-0 z-[101] overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      role="status"
      aria-live="polite"
      aria-busy={!isExiting}
    >
      <div className="lx-gen-loader__base absolute inset-0" aria-hidden />
      <div className="lx-gen-loader__grain absolute inset-0" aria-hidden />
      <div className="lx-gen-loader__halo" aria-hidden />
      <div className="lx-gen-loader__halo lx-gen-loader__halo--secondary" aria-hidden />

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {particles.map((p, i) => (
          <span
            key={i}
            className="lx-gen-loader__particle"
            style={
              {
                left: p.left,
                width: p.size,
                height: p.size,
                "--dur": p.dur,
                "--delay": p.delay,
                "--drift": p.drift,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {resultUrl && isExiting && (
        <motion.div
          className="absolute inset-0 z-[5] flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: EXIT_FADE_MS / 1000, ease: "easeOut" }}
          aria-hidden
        >
          <div className="lx-gen-loader__frame relative aspect-[9/16] h-[min(78svh,640px)] w-auto max-w-[92vw] overflow-hidden rounded-xl shadow-2xl md:h-[min(82svh,720px)]">
            <img
              src={resultUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20" />
          </div>
        </motion.div>
      )}

      {inputImageUrl && !isExiting && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="lx-gen-loader__frame relative aspect-[9/16] h-[min(78svh,640px)] w-auto max-w-[92vw] overflow-hidden rounded-xl shadow-2xl md:h-[min(82svh,720px)]">
            <motion.img
              src={inputImageUrl}
              alt={t("progress.inputAlt")}
              className="absolute inset-0 h-full w-full object-cover"
              animate={{
                filter: isBlurring
                  ? "blur(28px) brightness(0.42) saturate(0.85)"
                  : "blur(0px) brightness(1) saturate(1)",
                scale: isBlurring ? 1.08 : 1,
              }}
              transition={{ duration: 1.6, ease: [0.4, 0, 0.2, 1] }}
            />
            <div className="absolute inset-0 bg-black/50" />
            <div className="lx-gen-loader__vignette absolute inset-0" aria-hidden />
          </div>
        </motion.div>
      )}

      <div className="absolute inset-0 z-10 flex w-full items-center justify-center px-4">
        <motion.div
          className="lx-gen-loader__panel-wrap"
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{
            opacity: isExiting ? 0 : 1,
            y: isExiting ? -8 : 0,
            scale: isExiting ? 0.98 : 1,
          }}
          transition={{
            duration: isExiting ? EXIT_FADE_MS / 1000 : 0.5,
            delay: isExiting ? 0 : 0.06,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <div className="lx-gen-loader__panel" aria-hidden />
          <div className="lx-gen-loader__panel-shimmer" aria-hidden />

          <div className="lx-gen-loader__panel-content">
            <div className="lx-gen-loader__brand">
              <div className="lx-gen-loader__brand-inner">
                <span
                  className="inline-flex max-w-full items-center justify-center gap-2 text-[clamp(1.35rem,5.5vw,2rem)] font-semibold leading-none text-white"
                  style={{ fontFamily: "var(--lx-display)" }}
                >
                  <Gem
                    className="h-[0.88em] w-[0.88em] shrink-0 text-[#e8c547]"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <BrandMark
                    className="min-w-0 text-inherit font-semibold leading-none"
                    accentClassName="text-[#e8c547]"
                  />
                </span>
              </div>
            </div>

            <div className="lx-gen-loader__orb">
              <svg
                className="lx-gen-loader__orb-svg"
                viewBox="0 0 100 100"
                aria-hidden
              >
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth="3"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="url(#lx-gen-progress)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${Math.max(6, progress * 263.89)} 263.89`}
                  className="lx-gen-loader__orb-progress"
                />
                <defs>
                  <linearGradient id="lx-gen-progress" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#f0d875" />
                    <stop offset="55%" stopColor="#e8c547" />
                    <stop offset="100%" stopColor="#c9a227" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="lx-gen-loader__orb-center">
                {status === "success" || isOvertime ? (
                  <span className="lx-gen-loader__orb-label">✦</span>
                ) : (
                  <>
                    <span className="lx-gen-loader__orb-time">{remaining}</span>
                    <span className="lx-gen-loader__orb-unit">
                      {t("progress.seconds")}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="lx-gen-loader__track" aria-hidden>
              <div
                className="lx-gen-loader__track-fill"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>

            <div className="lx-gen-loader__status-block">
              {isOvertime && status !== "success" ? (
                <p className="lx-gen-loader__status-hint">
                  {t("progress.almostReady", "Presque prêt — ne quitte pas l'écran…")}
                </p>
              ) : null}
              <span key={messageKey} className="lx-gen-loader__msg">
                {status === "success"
                  ? t("progress.stepFinishing")
                  : progressMessages[messageIndex]}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );

  if (typeof document === "undefined") return loaderTree;
  return createPortal(loaderTree, document.body);
}
