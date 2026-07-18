import { useState, useEffect, useRef, useMemo, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gem } from "lucide-react";
import { useTranslation } from "react-i18next";
import "./generation-loader.css";

interface GenerationLoaderProps {
  status: "connecting" | "waiting" | "success";
  inputImageUrl?: string;
  resultUrls?: string[];
  onRevealComplete?: () => void;
}

const PROGRESS_MESSAGES = [
  "Analyse de ton image...",
  "Demande comprise...",
  "Modification en cours...",
  "Finalisation du rendu...",
] as const;

const COUNTDOWN_SECONDS = 8;
const MESSAGE_INTERVAL_MS = 1800;
const EXIT_FADE_MS = 500;

const PARTICLES = [
  { left: "12%", size: 2, dur: "14s", delay: "0s", drift: "12px" },
  { left: "28%", size: 1.5, dur: "16s", delay: "2s", drift: "-10px" },
  { left: "55%", size: 2, dur: "15s", delay: "4s", drift: "8px" },
  { left: "78%", size: 1.5, dur: "17s", delay: "1s", drift: "-6px" },
  { left: "90%", size: 2, dur: "15.5s", delay: "3.5s", drift: "10px" },
] as const;

export function GenerationLoader({
  status,
  inputImageUrl,
  resultUrls: _resultUrls,
  onRevealComplete,
}: GenerationLoaderProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<"dissolve" | "blur" | "logo" | "result">(
    "dissolve",
  );
  const [messageIndex, setMessageIndex] = useState(0);
  const [messageKey, setMessageKey] = useState(0);
  const [remaining, setRemaining] = useState(COUNTDOWN_SECONDS);
  const [isExiting, setIsExiting] = useState(false);
  const revealFired = useRef(false);

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
    const delay = phase === "logo" ? 400 : phase === "blur" ? 300 : 400;
    const timer = setTimeout(() => setPhase("result"), delay);
    return () => clearTimeout(timer);
  }, [status, phase]);

  // Fin : démarre le fondu et notifie le parent (crossfade), puis laisse le parent démonter
  useEffect(() => {
    if (phase !== "result" || revealFired.current) return;
    revealFired.current = true;
    setIsExiting(true);
    onRevealComplete?.();
  }, [phase, onRevealComplete]);

  useEffect(() => {
    const startedAt = Date.now();
    const id = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - startedAt) / 1000);
      setRemaining(Math.max(0, COUNTDOWN_SECONDS - elapsedSec));
    }, 200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % PROGRESS_MESSAGES.length);
      setMessageKey((k) => k + 1);
    }, MESSAGE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

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
      {/* Fond sombre sobre */}
      <div className="lx-gen-loader__base absolute inset-0" aria-hidden />

      {/* Un seul halo doré subtil */}
      <div className="lx-gen-loader__halo" aria-hidden />

      {/* Poussière dorée très discrète */}
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

      {/* Image floutée en fond */}
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

      {/* Contenu centré (logo, spinner, timer, messages) */}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <AnimatePresence>
          {showContent && (
            <motion.div
              key="loader-content"
              className="flex w-full max-w-sm flex-col items-center justify-center gap-5 px-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <div className="lx-gen-loader__brand">
                <div className="lx-gen-loader__brand-inner">
                  <Gem
                    className="block h-7 w-7 shrink-0 text-[#c9a227] md:h-8 md:w-8"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <span
                    className="block text-3xl font-semibold leading-none tracking-tight text-white md:text-4xl"
                    style={{ fontFamily: "var(--lx-display)" }}
                  >
                    Luxe<span className="text-[#c9a227]">Flex</span>IA
                  </span>
                </div>
              </div>

              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center md:h-24 md:w-24">
                <div className="lx-gen-loader__ring" aria-hidden />
              </div>

              <p
                className="m-0 w-full text-center text-2xl font-semibold leading-none tabular-nums tracking-wide text-[#e8c547] md:text-3xl"
                style={{ fontFamily: "var(--lx-display)" }}
                aria-live="polite"
              >
                <span>{remaining}</span>
                <span className="ml-1.5 text-lg font-medium text-[#e8c547]/80 md:text-xl">
                  sec
                </span>
              </p>

              <div className="relative flex h-7 w-full items-center justify-center">
                <span
                  key={messageKey}
                  className="lx-gen-loader__msg block w-full text-center text-sm font-medium text-[#f5e6b8]/85 md:text-base"
                >
                  {PROGRESS_MESSAGES[messageIndex]}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
