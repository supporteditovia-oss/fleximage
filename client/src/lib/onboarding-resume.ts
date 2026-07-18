const RESUME_KEY = "luxeflexia_onboarding_resume";
const RESUME_TTL_MS = 60 * 60 * 1000; // 1 hour

export type OnboardingResume = {
  prompt: string;
  generationMode: "image" | "video";
  timestamp: number;
};

/**
 * Lightweight localStorage intent so the fake loader → blur/padlock flow
 * still resumes after Google OAuth on mobile Safari when IndexedDB drops
 * the large photo draft.
 */
export function markOnboardingResume(
  data: Omit<OnboardingResume, "timestamp">,
): void {
  try {
    const payload: OnboardingResume = {
      prompt: data.prompt,
      generationMode: data.generationMode,
      timestamp: Date.now(),
    };
    localStorage.setItem(RESUME_KEY, JSON.stringify(payload));
  } catch {
    // quota / private mode — ignore
  }
}

export function getOnboardingResume(): OnboardingResume | null {
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OnboardingResume;
    if (!parsed?.timestamp || Date.now() - parsed.timestamp > RESUME_TTL_MS) {
      clearOnboardingResume();
      return null;
    }
    return {
      prompt: typeof parsed.prompt === "string" ? parsed.prompt : "",
      generationMode: parsed.generationMode === "video" ? "video" : "image",
      timestamp: parsed.timestamp,
    };
  } catch {
    return null;
  }
}

export function clearOnboardingResume(): void {
  try {
    localStorage.removeItem(RESUME_KEY);
  } catch {
    // ignore
  }
}

export function dataUrlToFile(
  dataUrl: string,
  filename = "onboarding-preview.jpg",
): File | null {
  try {
    const [header, body] = dataUrl.split(",");
    if (!header || !body) return null;
    const mimeMatch = /data:([^;]+)/.exec(header);
    const mime = mimeMatch?.[1] || "image/jpeg";
    const binary = atob(body);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new File([bytes], filename, { type: mime });
  } catch {
    return null;
  }
}
