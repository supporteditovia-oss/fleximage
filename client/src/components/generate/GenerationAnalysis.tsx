import { useEffect, useState } from "react";

const ANALYSIS_STEPS = [
  "Analyse de ton image...",
  "Demande comprise...",
  "Modification en cours...",
  "Finalisation du rendu...",
] as const;

const STEP_DURATION_MS = 1750;
const TOTAL_DURATION_MS = ANALYSIS_STEPS.length * STEP_DURATION_MS;

interface GenerationAnalysisProps {
  onComplete: () => void;
}

export function GenerationAnalysis({ onComplete }: GenerationAnalysisProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    let raf = 0;
    let completed = false;

    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const nextProgress = Math.min(100, (elapsed / TOTAL_DURATION_MS) * 100);
      setProgress(nextProgress);
      setStepIndex(
        Math.min(
          ANALYSIS_STEPS.length - 1,
          Math.floor(elapsed / STEP_DURATION_MS),
        ),
      );

      if (elapsed >= TOTAL_DURATION_MS) {
        if (!completed) {
          completed = true;
          onComplete();
        }
        return;
      }

      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [onComplete]);

  return (
    <div
      className="mx-auto w-full max-w-md animate-in fade-in duration-500"
      role="status"
      aria-live="polite"
    >
      <div className="rounded-2xl border border-[var(--lx-gold)]/25 bg-white/85 px-5 py-4 shadow-[0_12px_32px_rgba(18,16,14,0.08)] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--lx-gold)] opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--lx-gold)]" />
          </span>
          <p className="min-w-0 flex-1 text-sm font-semibold tracking-tight text-[var(--lx-ink)]">
            {ANALYSIS_STEPS[stepIndex]}
            <span className="ml-0.5 inline-block w-6 text-left text-[var(--lx-gold)]">
              <span className="lx-analysis-dots" aria-hidden="true">
                ...
              </span>
            </span>
          </p>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/5">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#e8c547_0%,#c9a227_55%,#8b6914_100%)] transition-[width] duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <style>{`
        @keyframes lx-analysis-dots {
          0%, 20% { opacity: 0.25; }
          50% { opacity: 1; }
          100% { opacity: 0.25; }
        }
        .lx-analysis-dots {
          animation: lx-analysis-dots 1.1s ease-in-out infinite;
          letter-spacing: 0.05em;
        }
      `}</style>
    </div>
  );
}
