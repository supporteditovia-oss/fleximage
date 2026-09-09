const PREFILL_KEY = "luxeflexia:video-studio-prefill";

export type VideoStudioPrefill = {
  imageUrl: string;
  sourceLarpId?: string;
  savedAt: number;
};

export function saveVideoStudioPrefill(data: Omit<VideoStudioPrefill, "savedAt">): void {
  try {
    sessionStorage.setItem(
      PREFILL_KEY,
      JSON.stringify({ ...data, savedAt: Date.now() }),
    );
  } catch {
    /* ignore */
  }
}

export function consumeVideoStudioPrefill(): VideoStudioPrefill | null {
  try {
    const raw = sessionStorage.getItem(PREFILL_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PREFILL_KEY);
    const parsed = JSON.parse(raw) as VideoStudioPrefill;
    if (!parsed?.imageUrl) return null;
    if (Date.now() - (parsed.savedAt || 0) > 30 * 60_000) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function navigateToVideoStudio(
  setLocation: (path: string) => void,
  params: { imageUrl: string; sourceLarpId?: string },
): void {
  saveVideoStudioPrefill(params);
  setLocation("/video-ia");
}
