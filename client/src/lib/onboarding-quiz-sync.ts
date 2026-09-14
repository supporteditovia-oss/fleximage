import { authFetch } from "@/lib/api";
import type { OnboardingQuizAnswers } from "@/lib/onboarding-quiz";

const QUIZ_KEY = "luxeflexia_onboarding_quiz";

function isValidQuiz(value: unknown): value is OnboardingQuizAnswers {
  if (!value || typeof value !== "object") return false;
  const v = value as OnboardingQuizAnswers;
  return Boolean(v.goal && v.vibe && v.format && v.completedAt);
}

export async function syncOnboardingQuizToServer(
  answers: Omit<OnboardingQuizAnswers, "completedAt">,
): Promise<void> {
  const payload: OnboardingQuizAnswers = {
    ...answers,
    completedAt: Date.now(),
  };
  try {
    await authFetch("/api/profile/onboarding-quiz", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  } catch {
    /* offline / table pas encore migrée */
  }
}

export async function hydrateOnboardingQuizFromServer(): Promise<void> {
  try {
    const res = await authFetch("/api/profile/onboarding-quiz");
    const remote = (await res.json()) as OnboardingQuizAnswers | null;

    let local: OnboardingQuizAnswers | null = null;
    try {
      const raw = localStorage.getItem(QUIZ_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as OnboardingQuizAnswers;
        if (isValidQuiz(parsed)) local = parsed;
      }
    } catch {
      /* ignore */
    }

    if (remote && isValidQuiz(remote)) {
      if (!local || remote.completedAt >= local.completedAt) {
        localStorage.setItem(QUIZ_KEY, JSON.stringify(remote));
      } else if (local) {
        await syncOnboardingQuizToServer(local);
      }
    } else if (local) {
      await syncOnboardingQuizToServer(local);
    }
  } catch {
    /* ignore */
  }
}
