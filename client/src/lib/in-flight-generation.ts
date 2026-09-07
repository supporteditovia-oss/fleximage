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
  resultType?: "image" | "video";
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

export type GenerationTimingLock = {
  estimate: number;
  startedAtMs: number;
};

/** Verrouille estimate (première valeur) + startedAt (plus tôt gagne) — jamais de remontée. */
export function mergeGenerationTimingLock(
  locked: GenerationTimingLock | null,
  incoming: { estimate?: number | null; startedAtMs?: number | null },
): GenerationTimingLock | null {
  const est =
    incoming.estimate != null && Number.isFinite(incoming.estimate)
      ? Math.max(1, Math.round(incoming.estimate))
      : null;
  const start =
    incoming.startedAtMs != null && Number.isFinite(incoming.startedAtMs)
      ? incoming.startedAtMs
      : null;

  if (!locked) {
    if (est == null) return null;
    return { estimate: est, startedAtMs: start ?? Date.now() };
  }

  return {
    estimate: locked.estimate,
    startedAtMs:
      start != null ? Math.min(locked.startedAtMs, start) : locked.startedAtMs,
  };
}

export function persistInFlightFromApiResult(
  result: {
    taskId: string;
    estimatedSeconds?: number | null;
    createdAt?: string | null;
    deduplicated?: boolean;
  },
  source: InFlightGenerationSource,
  resultType: "image" | "video" = "image",
): void {
  const existing = getInFlightGeneration();
  const sameTask = existing?.taskId === result.taskId;
  const startedAtFromApi = parseApiCreatedAtMs(result.createdAt);
  const startedAtMs = startedAtFromApi ?? (sameTask ? existing!.startedAtMs : Date.now());
  const mergedStartedAtMs =
    sameTask && existing
      ? Math.min(existing.startedAtMs, startedAtMs)
      : startedAtMs;

  const estimatedFromApi =
    typeof result.estimatedSeconds === "number" &&
    Number.isFinite(result.estimatedSeconds)
      ? result.estimatedSeconds
      : resultType === "video"
        ? 150
        : 45;
  const estimatedSeconds =
    sameTask && existing ? existing.estimatedSeconds : estimatedFromApi;

  saveInFlightGeneration({
    taskId: result.taskId,
    estimatedSeconds,
    startedAtMs: mergedStartedAtMs,
    source,
    resultType,
  });
}
