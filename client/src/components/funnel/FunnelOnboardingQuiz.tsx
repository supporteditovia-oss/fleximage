import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FunnelProgressBar } from "@/components/funnel/FunnelProgressBar";
import type {
  OnboardingFormat,
  OnboardingGoal,
  OnboardingQuizAnswers,
  OnboardingVibe,
} from "@/lib/onboarding-quiz";

const GOALS: OnboardingGoal[] = ["social", "fun", "pro"];
const VIBES: OnboardingVibe[] = [
  "dubai",
  "yacht",
  "supercar",
  "jet",
  "celebrity",
  "outfit",
];
const FORMATS: OnboardingFormat[] = ["image", "video"];

type FunnelOnboardingQuizProps = {
  inputImageUrl?: string | null;
  onComplete: (answers: Omit<OnboardingQuizAnswers, "completedAt">) => void;
};

export function FunnelOnboardingQuiz({
  inputImageUrl,
  onComplete,
}: FunnelOnboardingQuizProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<OnboardingGoal | null>(null);
  const [vibe, setVibe] = useState<OnboardingVibe | null>(null);
  const [format, setFormat] = useState<OnboardingFormat | null>(null);

  const stepLabelKey = useMemo(() => {
    if (step === 0) return "onboardingQuiz.step1Label";
    if (step === 1) return "onboardingQuiz.step2Label";
    return "onboardingQuiz.step3Label";
  }, [step]);

  const canContinue =
    (step === 0 && goal) || (step === 1 && vibe) || (step === 2 && format);

  const handleContinue = () => {
    if (step < 2) {
      setStep((s) => s + 1);
      return;
    }
    if (!goal || !vibe || !format) return;
    onComplete({ goal, vibe, format });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex flex-col items-center justify-center overflow-y-auto px-4 py-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      style={{
        background:
          "linear-gradient(160deg, #ffffff 0%, #f5f0e8 48%, #ebe6df 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 75% 50% at 50% -5%, rgba(201,162,39,0.16) 0%, transparent 58%)",
        }}
      />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-6">
        <FunnelProgressBar current={step + 1} total={3} labelKey={stepLabelKey} />

        {inputImageUrl ? (
          <div className="relative aspect-[3/4] w-24 overflow-hidden rounded-2xl border border-[var(--lx-gold)]/35 shadow-lg sm:w-28">
            <img
              src={inputImageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="w-full space-y-4 text-center"
          >
            {step === 0 ? (
              <>
                <h1 className="lx-display text-2xl font-semibold tracking-tight text-[var(--lx-ink)]">
                  {t("onboardingQuiz.step1Title")}
                </h1>
                <p className="text-sm font-medium text-[var(--lx-muted)]">
                  {t("onboardingQuiz.step1Subtitle")}
                </p>
                <div className="grid gap-2 pt-1">
                  {GOALS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setGoal(id)}
                      className={`rounded-2xl border px-4 py-3.5 text-left text-sm font-semibold transition-all ${
                        goal === id
                          ? "border-[var(--lx-gold)] bg-white shadow-md"
                          : "border-black/8 bg-[var(--lx-surface-2)]/90 hover:border-[var(--lx-gold)]/40"
                      }`}
                    >
                      {t(`onboardingQuiz.goals.${id}`)}
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <h1 className="lx-display text-2xl font-semibold tracking-tight text-[var(--lx-ink)]">
                  {t("onboardingQuiz.step2Title")}
                </h1>
                <p className="text-sm font-medium text-[var(--lx-muted)]">
                  {t("onboardingQuiz.step2Subtitle")}
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {VIBES.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setVibe(id)}
                      className={`rounded-2xl border px-3 py-3.5 text-sm font-semibold transition-all ${
                        vibe === id
                          ? "border-[var(--lx-gold)] bg-white shadow-md"
                          : "border-black/8 bg-[var(--lx-surface-2)]/90 hover:border-[var(--lx-gold)]/40"
                      }`}
                    >
                      <span className="mr-1.5" aria-hidden>
                        {t(`onboardingQuiz.vibeEmoji.${id}`)}
                      </span>
                      {t(`onboardingQuiz.vibes.${id}`)}
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <h1 className="lx-display text-2xl font-semibold tracking-tight text-[var(--lx-ink)]">
                  {t("onboardingQuiz.step3Title")}
                </h1>
                <p className="text-sm font-medium text-[var(--lx-muted)]">
                  {t("onboardingQuiz.step3Subtitle")}
                </p>
                <div className="grid gap-2 pt-1">
                  {FORMATS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setFormat(id)}
                      className={`rounded-2xl border px-4 py-3.5 text-left text-sm font-semibold transition-all ${
                        format === id
                          ? "border-[var(--lx-gold)] bg-white shadow-md"
                          : "border-black/8 bg-[var(--lx-surface-2)]/90 hover:border-[var(--lx-gold)]/40"
                      }`}
                    >
                      {t(`onboardingQuiz.formats.${id}`)}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </motion.div>
        </AnimatePresence>

        <button
          type="button"
          disabled={!canContinue}
          onClick={handleContinue}
          className="lx-btn-gold flex min-h-12 w-full max-w-md items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
        >
          {step < 2 ? t("onboardingQuiz.continue") : t("onboardingQuiz.finish")}
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
