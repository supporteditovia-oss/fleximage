const IN_FLIGHT_GENERATION_KEY = "luxeflexia:in-flight-generation";

/** Aligné sur GENERATION_DEDUP_WINDOW_MS côté API. */
const MAX_AGE_MS = 90_000;

export type InFlightGenerationSource = "generate" | "modeles" | "hero";

export type InFlightGeneration = {
  taskId: string;
  estimatedSeconds?: number | null;
  source: InFlightGenerationSource;
  savedAt: number;
};

export function saveInFlightGeneration(
  data: Omit<InFlightGeneration, "savedAt">,
): void {
  try {
    sessionStorage.setItem(
      IN_FLIGHT_GENERATION_KEY,
      JSON.stringify({ ...data, savedAt: Date.now() }),
    );
  } catch {
    /* quota / private mode */
  }
}

export function getInFlightGeneration(): InFlightGeneration | null {
  try {
    const raw = sessionStorage.getItem(IN_FLIGHT_GENERATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InFlightGeneration;
    if (!parsed?.taskId || typeof parsed.taskId !== "string") return null;
    if (Date.now() - (parsed.savedAt || 0) > MAX_AGE_MS) {
      clearInFlightGeneration();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearInFlightGeneration(): void {
  try {
    sessionStorage.removeItem(IN_FLIGHT_GENERATION_KEY);
  } catch {
    /* ignore */
  }
}
