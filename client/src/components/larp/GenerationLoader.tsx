import { useState, useEffect, useRef, useMemo, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gem } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BrandMark } from "@/components/BrandMark";
import "./generation-loader.css";

interface GenerationLoaderProps {
  status: "connecting" | "waiting" | "success";
  /** Server-side ETA (seconds) — synced on every poll. */
  estimatedSeconds?: number;
  /** Remaining seconds computed server-side from created_at + estimate. */
  serverRemainingSeconds?: number | null;
  inputImageUrl?: string;
  resultUrls?: string[];
  onRevealComplete?: () => void;
}

const DEFAULT_ESTIMATE_SECONDS = 50;
const MESSAGE_INTERVAL_MS = 1800;
const EXIT_FADE_MS = 350;

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
  inputImageUrl,
  resultUrls: _resultUrls,
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
  const [phase, setPhase] = useState<"dissolve" | "blur" | "logo" | "result">(
    "dissolve",
  );
  const [messageIndex, setMessageIndex] = useState(0);
  const [messageKey, setMessageKey] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const revealFired = useRef(false);
  const startedAt = useRef(Date.now());
  const [estimate, setEstimate] = useState(
    Math.max(25, Math.round(estimatedSeconds)),
  );

  useEffect(() => {
    setEstimate((prev) =>
      Math.max(prev, Math.max(25, Math.round(estimatedSeconds))),
    );
  }, [estimatedSeconds]);

  useEffect(() => {
    if (phase !== "dissolve") return;
    const timer = setTimeout(() => setPhase("blur"), 800);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "blur") return;
    const timer = setTimeout(() => setPhase("logo"), 1200);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (status !== "success" || phase === "result") return;
    setPhase("result");
  }, [status, phase]);

  useEffect(() => {
    if (phase !== "result" || revealFired.current) return;
    revealFired.current = true;
    setIsExiting(true);
    onRevealComplete?.();
  }, [phase, onRevealComplete]);

  useEffect(() => {
    const id = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % progressMessages.length);
      setMessageKey((k) => k + 1);
    }, MESSAGE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [progressMessages.length]);

  const localRemaining = Math.max(0, estimate - elapsedSec);
  const polledRemaining =
    serverRemainingSeconds != null && Number.isFinite(serverRemainingSeconds)
      ? Math.max(0, Math.round(serverRemainingSeconds))
      : null;

  let remaining =
    status === "success"
      ? 0
      : polledRemaining != null
        ? polledRemaining
        : localRemaining;

  const finishing = status !== "success" && remaining === 0;

  const isBlurring = phase === "blur" || phase === "logo" || phase === "result";
  const showContent = !isExiting;
  const particles = useMemo(() => PARTICLES, []);

  return (
    <motion.div
      className="lx-gen-loader fixed inset-0 z-[100] overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{
        duration: isExiting ? EXIT_FADE_MS / 1000 : 0.45,
        ease: "easeInOut",
      }}
    >
      <div className="lx-gen-loader__base absolute inset-0" aria-hidden />
      <div className="lx-gen-loader__halo" aria-hidden />

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

      {inputImageUrl && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: isExiting ? 0 : 1 }}
          transition={{ duration: 0.45 }}
        >
          <div className="relative aspect-[9/16] h-[min(78svh,640px)] w-auto max-w-[92vw] overflow-hidden rounded-lg shadow-xl md:h-[min(82svh,720px)]">
            <motion.img
              src={inputImageUrl}
              alt={t("progress.inputAlt")}
              className="absolute inset-0 h-full w-full object-cover"
              animate={{
                filter: isBlurring
                  ? "blur(24px) brightness(0.45)"
                  : "blur(0px) brightness(1)",
                scale: isBlurring ? 1.06 : 1,
              }}
              transition={{ duration: 1.8, ease: [0.4, 0, 0.2, 1] }}
            />
            <div className="absolute inset-0 bg-black/45" />
          </div>
        </motion.div>
      )}

      <div className="absolute inset-0 z-10 flex w-full items-center justify-center px-4">
        <AnimatePresence>
          {showContent && (
            <motion.div
              key="loader-content"
              className="flex w-full max-w-sm flex-col items-center justify-center gap-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <div className="flex w-full items-center justify-center">
                <div className="lx-gen-loader__brand">
                  <div className="lx-gen-loader__brand-inner">
                    <span
                      className="inline-flex max-w-full items-center justify-center gap-2.5 text-[clamp(1.5rem,6vw,2.25rem)] font-semibold leading-none text-white"
                      style={{ fontFamily: "var(--lx-display)" }}
                    >
                      <Gem
                        className="h-[0.9em] w-[0.9em] shrink-0 text-[#c9a227]"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                      <BrandMark
                        className="min-w-0 text-inherit font-semibold leading-none"
                        accentClassName="text-[#c9a227]"
                      />
                    </span>
                  </div>
                </div>
              </div>

              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center md:h-24 md:w-24">
                <div className="lx-gen-loader__ring" aria-hidden />
              </div>

              <div className="flex flex-col items-center gap-1.5">
                <p
                  className="m-0 w-full text-center text-2xl font-semibold leading-none tabular-nums tracking-wide text-[#e8c547] md:text-3xl"
                  style={{ fontFamily: "var(--lx-display)" }}
                  aria-live="polite"
                >
                  <span>{remaining}</span>
                  <span className="ml-1.5 text-lg font-medium text-[#e8c547]/80 md:text-xl">
                    {t("progress.seconds")}
                  </span>
                </p>
                {finishing && (
                  <p className="m-0 text-center text-xs font-medium text-[#f5e6b8]/70">
                    {t("progress.stepFinishing")}
                  </p>
                )}
              </div>

              <div className="relative flex h-7 w-full items-center justify-center">
                <span
                  key={messageKey}
                  className="lx-gen-loader__msg block w-full text-center text-sm font-medium text-[#f5e6b8]/85 md:text-base"
                >
                  {progressMessages[messageIndex]}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
