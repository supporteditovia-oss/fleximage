import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface GenerationLoaderProps {
  status: "connecting" | "waiting" | "success";
  inputImageUrl?: string;
  resultUrls?: string[];
  onRevealComplete?: () => void;
}

export function GenerationLoader({
  status,
  inputImageUrl,
  resultUrls,
  onRevealComplete,
}: GenerationLoaderProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<"dissolve" | "blur" | "logo" | "result">(
    "dissolve",
  );

  // Phase 1 → 2: after layout dissolves, start blurring the image
  useEffect(() => {
    if (phase !== "dissolve") return;
    const timer = setTimeout(() => setPhase("blur"), 800);
    return () => clearTimeout(timer);
  }, [phase]);

  // Phase 2 → 3: after blur settles, reveal the logo
  useEffect(() => {
    if (phase !== "blur") return;
    const timer = setTimeout(() => setPhase("logo"), 1200);
    return () => clearTimeout(timer);
  }, [phase]);

  // When success arrives, transition to result (even if still dissolving — fast
  // image generations used to stall because this required phase === "logo").
  useEffect(() => {
    if (status !== "success" || phase === "result") return;
    const delay = phase === "logo" ? 600 : phase === "blur" ? 400 : 500;
    const timer = setTimeout(() => setPhase("result"), delay);
    return () => clearTimeout(timer);
  }, [status, phase]);

  // Guarantee hand-off even if Framer onAnimationComplete does not fire.
  useEffect(() => {
    if (phase !== "result") return;
    const timer = setTimeout(() => onRevealComplete?.(), 1200);
    return () => clearTimeout(timer);
  }, [phase, onRevealComplete]);

  const handleRevealDone = useCallback(() => {
    if (onRevealComplete) {
      setTimeout(onRevealComplete, 400);
    }
  }, [onRevealComplete]);

  // "Préparation" first, then elapsed timer (timer does not count prep time).
  const PREPARING_MS = 2000;
  const mountedAt = useRef(Date.now());
  const startTime = useRef<number | null>(null);
  const [showTimer, setShowTimer] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const remaining = Math.max(0, PREPARING_MS - (Date.now() - mountedAt.current));
    const id = setTimeout(() => {
      startTime.current = Date.now();
      setShowTimer(true);
    }, remaining);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!showTimer) return;
    const id = setInterval(() => {
      if (startTime.current === null) return;
      setElapsed(
        Math.floor((Date.now() - startTime.current) / 1000),
      );
    }, 200);
    return () => clearInterval(id);
  }, [showTimer]);

  const isBlurring = phase === "blur" || phase === "logo" || phase === "result";
  const showLogo = phase !== "result";

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Dark backdrop that dissolves the page behind */}
      <motion.div
        className="absolute inset-0 bg-background bg-grid"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, ease: "easeInOut" }}
      />

      {/* Input image — centered, blurs progressively */}
      {inputImageUrl && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="relative aspect-[9/16] h-[min(78svh,640px)] w-auto max-w-[92vw] rounded-lg overflow-hidden shadow-xl md:h-[min(82svh,720px)]">
            <motion.img
              src={inputImageUrl}
              alt={t("progress.inputAlt")}
              className="absolute inset-0 w-full h-full object-cover"
              animate={{
                filter: isBlurring ? "blur(24px) brightness(0.7)" : "blur(0px) brightness(1)",
                scale: isBlurring ? 1.08 : 1,
              }}
              transition={{ duration: 1.8, ease: [0.4, 0, 0.2, 1] }}
            />
          </div>
        </motion.div>
      )}

      {/* Logo + status — visible immediately with "Préparation", then timer */}
      <AnimatePresence>
        {showLogo && (
          <motion.div
            key="logo-overlay"
            className="relative z-10 flex flex-col items-center gap-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(8px)" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <img
              src="/assets/larpking.png"
              alt="LarpKing"
              className="h-24 md:h-32 object-contain drop-shadow-[0_0_40px_hsl(var(--primary)/0.5)] loader-logo-pulse"
            />
            <Loader2 className="h-6 w-6 animate-spin text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]" />
            <span
              className={`text-lg font-semibold text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] ${showTimer ? "tabular-nums" : ""}`}
            >
              {showTimer ? `${elapsed}s` : t("progress.preparing")}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result reveal — flash only, then hand off to result view */}
      <AnimatePresence>
        {phase === "result" && (
          <motion.div
            key="result"
            className="relative z-10"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            onAnimationComplete={handleRevealDone}
          >
            {/* Flash */}
            <motion.div
              className="fixed inset-0 bg-white pointer-events-none z-20"
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
