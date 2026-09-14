import { VIDEO_V2V_PRESETS } from "@/lib/video-studio-config";

const QUIZ_KEY = "luxeflexia_onboarding_quiz";

export type OnboardingGoal = "social" | "fun" | "pro";
export type OnboardingVibe =
  | "dubai"
  | "yacht"
  | "supercar"
  | "jet"
  | "celebrity"
  | "outfit";
export type OnboardingFormat = "image" | "video";

export type OnboardingQuizAnswers = {
  goal: OnboardingGoal;
  vibe: OnboardingVibe;
  format: OnboardingFormat;
  completedAt: number;
};

export function saveOnboardingQuiz(
  answers: Omit<OnboardingQuizAnswers, "completedAt">,
): void {
  try {
    const payload: OnboardingQuizAnswers = {
      ...answers,
      completedAt: Date.now(),
    };
    localStorage.setItem(QUIZ_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function getOnboardingQuiz(): OnboardingQuizAnswers | null {
  try {
    const raw = localStorage.getItem(QUIZ_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OnboardingQuizAnswers;
    if (!parsed?.goal || !parsed?.vibe || !parsed?.format) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isOnboardingQuizComplete(): boolean {
  return getOnboardingQuiz() !== null;
}

export function clearOnboardingQuiz(): void {
  try {
    localStorage.removeItem(QUIZ_KEY);
  } catch {
    /* ignore */
  }
}

function vibePrompt(vibe: OnboardingVibe): string {
  const preset = VIDEO_V2V_PRESETS.find((entry) => entry.id === vibe);
  return preset?.prompt?.trim() ?? "";
}

/** Fusionne le prompt landing avec la scène choisie dans le quiz. */
export function buildPromptFromQuiz(
  basePrompt: string,
  answers: Pick<OnboardingQuizAnswers, "vibe" | "goal">,
): string {
  const scene = vibePrompt(answers.vibe);
  const trimmed = basePrompt.trim();
  if (!scene) return trimmed;
  if (trimmed && trimmed.toLowerCase().includes(scene.slice(0, 24).toLowerCase())) {
    return trimmed;
  }
  return trimmed ? `${trimmed}\n${scene}` : scene;
}

export function getVibeLabelKey(vibe: OnboardingVibe): string {
  return `onboardingQuiz.vibes.${vibe}`;
}
