const IN_FLIGHT_GENERATION_KEY = "luxeflexia:in-flight-generation";
export const GENERATION_IN_FLIGHT_EVENT = "luxeflexia:generation-in-flight";

/** Génération OneShot/Kie peut durer ~2–3 min avec fallback. */
const MAX_AGE_MS = 5 * 60_000;

export type InFlightGenerationSource = "generate" | "modeles" | "hero";

export type InFlightGeneration = {
  taskId: string;
  estimatedSeconds: number;
  /** Horodatage réel du début (created_at serveur en ms). */
  startedAtMs: number;
  source: InFlightGenerationSource;
  savedAt: number;
};

export function notifyInFlightGenerationChanged(): void {
  window.dispatchEvent(new CustomEvent(GENERATION_IN_FLIGHT_EVENT));
}

export function saveInFlightGeneration(
  data: Omit<InFlightGeneration, "savedAt">,
): void {
  try {
    sessionStorage.setItem(
      IN_FLIGHT_GENERATION_KEY,
      JSON.stringify({ ...data, savedAt: Date.now() }),
    );
    notifyInFlightGenerationChanged();
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
    if (
      parsed.startedAtMs == null ||
      !Number.isFinite(Number(parsed.startedAtMs))
    ) {
      return null;
    }
    if (
      parsed.estimatedSeconds == null ||
      !Number.isFinite(Number(parsed.estimatedSeconds))
    ) {
      return null;
    }
    if (Date.now() - (parsed.savedAt || 0) > MAX_AGE_MS) {
      clearInFlightGeneration();
      return null;
    }
    return {
      ...parsed,
      startedAtMs: Number(parsed.startedAtMs),
      estimatedSeconds: Number(parsed.estimatedSeconds),
    };
  } catch {
    return null;
  }
}

export function clearInFlightGeneration(): void {
  try {
    sessionStorage.removeItem(IN_FLIGHT_GENERATION_KEY);
    notifyInFlightGenerationChanged();
  } catch {
    /* ignore */
  }
}

export function parseApiCreatedAtMs(createdAt: unknown): number | null {
  if (typeof createdAt !== "string" || !createdAt.trim()) return null;
  const ms = new Date(createdAt).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function persistInFlightFromApiResult(
  result: {
    taskId: string;
    estimatedSeconds?: number | null;
    createdAt?: string | null;
  },
  source: InFlightGenerationSource,
): void {
  const startedAtMs = parseApiCreatedAtMs(result.createdAt) ?? Date.now();
  const estimatedSeconds =
    typeof result.estimatedSeconds === "number" &&
    Number.isFinite(result.estimatedSeconds)
      ? result.estimatedSeconds
      : 45;
  saveInFlightGeneration({
    taskId: result.taskId,
    estimatedSeconds,
    startedAtMs,
    source,
  });
}
