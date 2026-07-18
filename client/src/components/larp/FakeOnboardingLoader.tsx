import { useEffect, useRef, useState, useMemo, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { Gem } from "lucide-react";
import "./fake-onboarding-loader.css";

const MESSAGES = [
  "Analyse de ton image...",
  "Préparation du rendu HD...",
  "Affinage des détails...",
  "Finalisation...",
] as const;

const PARTICLES = [
  { left: "14%", size: 2, dur: "13s", delay: "0s", drift: "10px" },
  { left: "32%", size: 1.5, dur: "15s", delay: "1.8s", drift: "-8px" },
  { left: "58%", size: 2, dur: "14s", delay: "3.2s", drift: "12px" },
  { left: "76%", size: 1.5, dur: "16s", delay: "0.6s", drift: "-6px" },
  { left: "88%", size: 2, dur: "14.5s", delay: "2.4s", drift: "9px" },
] as const;

const DEFAULT_DURATION_MS = 4800;
const MESSAGE_INTERVAL_MS = 1200;

interface FakeOnboardingLoaderProps {
  inputImageUrl?: string | null;
  durationMs?: number;
  onComplete: () => void;
}

export function FakeOnboardingLoader({
  inputImageUrl,
  durationMs = DEFAULT_DURATION_MS,
  onComplete,
}: FakeOnboardingLoaderProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [messageKey, setMessageKey] = useState(0);
  const [progress, setProgress] = useState(0);
  const completed = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const particles = useMemo(() => PARTICLES, []);

  useEffect(() => {
    const startedAt = Date.now();
    const tick = window.setInterval(() => {
      const ratio = Math.min(1, (Date.now() - startedAt) / durationMs);
      setProgress(ratio);
      if (ratio >= 1 && !completed.current) {
        completed.current = true;
        window.clearInterval(tick);
        onCompleteRef.current();
      }
    }, 40);
    return () => window.clearInterval(tick);
  }, [durationMs]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % MESSAGES.length);
      setMessageKey((k) => k + 1);
    }, MESSAGE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <motion.div
      className="lx-fake-loader fixed inset-0 z-[200] overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="lx-fake-loader__base absolute inset-0" aria-hidden />
      <div className="lx-fake-loader__halo" aria-hidden />

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {particles.map((p, i) => (
          <span
            key={i}
            className="lx-fake-loader__particle"
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

      {inputImageUrl ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative aspect-[9/16] h-[min(78svh,640px)] w-auto max-w-[92vw] overflow-hidden rounded-lg shadow-xl md:h-[min(82svh,720px)]">
            <img
              src={inputImageUrl}
              alt=""
              className="absolute inset-0 h-full w-full scale-105 object-cover blur-[22px] brightness-[0.42]"
            />
            <div className="absolute inset-0 bg-black/50" />
          </div>
        </div>
      ) : null}

      <div className="absolute inset-0 z-10 flex items-center justify-center px-6">
        <div className="flex w-full max-w-sm flex-col items-center gap-7">
          <div className="lx-fake-loader__brand">
            <div className="lx-fake-loader__brand-inner">
              <Gem
                className="block h-8 w-8 shrink-0 text-[#c9a227] md:h-10 md:w-10"
                strokeWidth={1.75}
                aria-hidden
              />
              <span
                className="block text-3xl font-semibold leading-none tracking-tight text-white md:text-5xl"
                style={{ fontFamily: "var(--lx-display)" }}
              >
                Luxe<span className="text-[#c9a227]">Flex</span>IA
              </span>
            </div>
          </div>

          <div className="h-1 w-48 overflow-hidden rounded-full bg-white/10 md:w-56">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#c9a227] to-[#e8c547]"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>

          <div className="relative flex h-7 w-full items-center justify-center">
            <span
              key={messageKey}
              className="lx-fake-loader__msg block w-full text-center text-sm font-medium text-[#f5e6b8]/90 md:text-base"
            >
              {MESSAGES[messageIndex]}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
