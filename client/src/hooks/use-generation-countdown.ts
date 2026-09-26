import { useEffect, useRef, useState } from "react";
import { videoPollRemainingFromStart } from "@/lib/video-generation-timing";

/** Temps restant = estimate fixe − elapsed depuis le démarrage serveur. */
export function computeGenerationRemaining(
  startedAtMs: number,
  estimatedSeconds: number,
  nowMs: number = Date.now(),
): number {
  const estimate = Math.max(1, Math.round(estimatedSeconds));
  const elapsed = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
  return Math.max(0, estimate - elapsed);
}

export function computeServerAnchoredRemaining(
  anchorRemainingSeconds: number,
  anchorAtMs: number,
  nowMs: number = Date.now(),
): number {
  const anchor = Math.max(0, Math.round(anchorRemainingSeconds));
  const drift = Math.max(0, Math.floor((nowMs - anchorAtMs) / 1000));
  return Math.max(0, anchor - drift);
}

export type CountdownSyncMode = "shorten" | "video_server";

/**
 * Compte à rebours monotone, tick client 4×/s.
 * - shorten (image) : le serveur ne peut que raccourcir l'estimation locale.
 * - video_server : remaining ancré sur le poll API (courbe + overtime), décrément local entre deux polls.
 */
export function useGenerationCountdown(
  taskId: string,
  startedAtMs: number | null | undefined,
  estimatedSeconds: number,
  isComplete: boolean,
  serverRemainingSeconds?: number | null,
  syncMode: CountdownSyncMode = "shorten",
): number {
  const estimate = Math.max(1, Math.round(estimatedSeconds));
  const floorRef = useRef<number | null>(null);
  const localStartRef = useRef<number | null>(null);
  const serverAnchorRef = useRef<{ value: number; atMs: number } | null>(null);
  const lastServerRemainingRef = useRef<number | null>(null);
  const taskRef = useRef(taskId);
  const [, setTick] = useState(0);

  if (taskRef.current !== taskId) {
    taskRef.current = taskId;
    floorRef.current = null;
    localStartRef.current = null;
    serverAnchorRef.current = null;
    lastServerRemainingRef.current = null;
  }

  if (!isComplete && localStartRef.current === null) {
    localStartRef.current =
      startedAtMs != null && Number.isFinite(startedAtMs)
        ? startedAtMs
        : Date.now();
  }

  useEffect(() => {
    if (isComplete) return;

    const tick = () => setTick((n) => n + 1);
    const id = window.setInterval(tick, 250);
    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isComplete, taskId]);

  if (isComplete) {
    floorRef.current = 0;
    serverAnchorRef.current = null;
    return 0;
  }

  const effectiveStart =
    startedAtMs != null && Number.isFinite(startedAtMs)
      ? startedAtMs
      : (localStartRef.current ?? Date.now());

  if (syncMode === "video_server") {
    if (
      typeof serverRemainingSeconds === "number" &&
      Number.isFinite(serverRemainingSeconds)
    ) {
      const rounded = Math.max(0, Math.round(serverRemainingSeconds));
      if (lastServerRemainingRef.current !== rounded) {
        lastServerRemainingRef.current = rounded;
        serverAnchorRef.current = { value: rounded, atMs: Date.now() };
      }
    }
    const anchor = serverAnchorRef.current;
    if (anchor) {
      return computeServerAnchoredRemaining(anchor.value, anchor.atMs);
    }
    return videoPollRemainingFromStart(estimate, effectiveStart);
  }

  let candidate = computeGenerationRemaining(effectiveStart, estimate);

  if (
    typeof serverRemainingSeconds === "number" &&
    Number.isFinite(serverRemainingSeconds)
  ) {
    candidate = Math.min(candidate, Math.max(0, Math.round(serverRemainingSeconds)));
  }

  if (floorRef.current === null) {
    floorRef.current = candidate;
  } else {
    floorRef.current = Math.min(floorRef.current, candidate);
  }

  return floorRef.current;
}

/** Progression 0–1 pour la barre / anneau. */
export function useGenerationProgress(
  taskId: string,
  startedAtMs: number | null | undefined,
  estimatedSeconds: number,
  isComplete: boolean,
  serverRemainingSeconds?: number | null,
  syncMode: CountdownSyncMode = "shorten",
): number {
  const estimate = Math.max(1, Math.round(estimatedSeconds));
  const localStartRef = useRef<number | null>(null);
  const taskRef = useRef(taskId);
  const [, setTick] = useState(0);

  if (taskRef.current !== taskId) {
    taskRef.current = taskId;
    localStartRef.current = null;
  }

  if (!isComplete && localStartRef.current === null) {
    localStartRef.current =
      startedAtMs != null && Number.isFinite(startedAtMs)
        ? startedAtMs
        : Date.now();
  }

  useEffect(() => {
    if (isComplete) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 250);
    return () => window.clearInterval(id);
  }, [isComplete, taskId]);

  if (isComplete) return 1;

  const effectiveStart =
    startedAtMs != null && Number.isFinite(startedAtMs)
      ? startedAtMs
      : (localStartRef.current ?? Date.now());

  if (syncMode === "video_server") {
    let remaining: number;
    if (
      typeof serverRemainingSeconds === "number" &&
      Number.isFinite(serverRemainingSeconds)
    ) {
      remaining = Math.max(0, Math.round(serverRemainingSeconds));
    } else {
      remaining = videoPollRemainingFromStart(estimate, effectiveStart);
    }
    const ratio = 1 - remaining / estimate;
    return Math.min(0.99, Math.max(0, ratio));
  }

  const elapsed = Math.max(0, (Date.now() - effectiveStart) / 1000);
  return Math.min(0.98, elapsed / estimate);
}
