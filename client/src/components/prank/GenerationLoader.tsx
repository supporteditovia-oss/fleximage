import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

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

  // When success arrives, transition to result
  useEffect(() => {
    if (status === "success" && resultUrls?.length && phase === "logo") {
      const timer = setTimeout(() => setPhase("result"), 600);
      return () => clearTimeout(timer);
    }
  }, [status, resultUrls, phase]);

  const handleRevealDone = useCallback(() => {
    if (onRevealComplete) {
      setTimeout(onRevealComplete, 400);
    }
  }, [onRevealComplete]);

  // Elapsed timer
  const startTime = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime.current) / 1000)), 200);
    return () => clearInterval(id);
  }, []);

  const isBlurring = phase === "blur" || phase === "logo" || phase === "result";
  const showLogo = phase === "logo" || (phase !== "result" && status !== "success");

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
          <div className="relative h-[min(60vh,500px)] md:h-[70vh] aspect-[9/16] rounded-2xl overflow-hidden shadow-xl">
            <motion.img
              src={inputImageUrl}
              alt="Input"
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

      {/* Logo — appears over blurred image */}
      <AnimatePresence>
        {showLogo && phase !== "dissolve" && (
          <motion.div
            key="logo-overlay"
            className="relative z-10 flex flex-col items-center gap-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(8px)" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <img
              src="/assets/turboprank.png"
              alt="TurboPrank"
              className="h-24 md:h-32 object-contain drop-shadow-[0_0_40px_hsl(var(--primary)/0.5)] loader-logo-pulse"
            />
            {/* Spinner + Elapsed timer */}
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-white/70 animate-spin" />
              <span className="text-lg tabular-nums text-white font-semibold">
                {elapsed}s
              </span>
            </div>
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
