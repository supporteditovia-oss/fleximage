const LAST_GENERATION_KEY = "luxeflexia:last-generation";

export type LastGeneration = {
  taskId: string;
  larpId: string;
  resultUrls: string[];
  resultType: "image" | "video";
  savedAt: number;
};

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function saveLastGeneration(data: LastGeneration): void {
  try {
    sessionStorage.setItem(
      LAST_GENERATION_KEY,
      JSON.stringify({ ...data, savedAt: Date.now() }),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function getLastGeneration(): LastGeneration | null {
  try {
    const raw = sessionStorage.getItem(LAST_GENERATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastGeneration;
    if (!parsed?.taskId || !Array.isArray(parsed.resultUrls)) return null;
    if (Date.now() - (parsed.savedAt || 0) > MAX_AGE_MS) {
      clearLastGeneration();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearLastGeneration(): void {
  try {
    sessionStorage.removeItem(LAST_GENERATION_KEY);
  } catch {
    /* ignore */
  }
}
