import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { Gem } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLarpStatus } from "@/hooks/use-larps";
import { useToast } from "@/hooks/use-toast";
import { LarpResult } from "./LarpResult";
import { GenerationLoader, GenerationLoaderBackdrop } from "./GenerationLoader";
import { releaseGenerationLoaderTheme } from "@/lib/generation-loader-theme";
import { useTranslation } from "react-i18next";
import { saveLastGeneration, getLastGeneration } from "@/lib/last-generation";
import { BrandMark } from "@/components/BrandMark";
import { useStudioPath } from "@/hooks/use-studio-path";
import {
  clearInFlightGeneration,
  getInFlightGeneration,
  mergeGenerationTimingLock,
  parseApiCreatedAtMs,
  type GenerationTimingLock,
} from "@/lib/in-flight-generation";

interface GenerationProgressProps {
  taskId: string;
  inputImageUrl?: string;
  onReset: () => void;
  onResultVisible?: () => void;
  resultType?: "image" | "video";
  /** Number of reference images — multi-ref swaps need a longer honest ETA. */
  referenceImageCount?: number;
  /** Server estimate returned at generate-direct start (before first poll). */
  initialEstimatedSeconds?: number;
}

const LX_AUTH_BG =
  "linear-gradient(160deg, #ffffff 0%, #f5f0e8 48%, #ebe6df 100%)";

export function GenerationProgress({
  taskId,
  inputImageUrl,
  onReset,
  onResultVisible,
  resultType = "image",
  referenceImageCount = 1,
  initialEstimatedSeconds,
}: GenerationProgressProps) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const studioPath = useStudioPath();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, error, isError } = useLarpStatus(taskId);
  const restored = getLastGeneration();
  const restoredReady =
    restored?.taskId === taskId && (restored.resultUrls?.length ?? 0) > 0;
  const [revealDone, setRevealDone] = useState(restoredReady);
  const [revealStarted, setRevealStarted] = useState(restoredReady);
  const [showResult, setShowResult] = useState(restoredReady);
  const [fatalConnectionError, setFatalConnectionError] = useState(false);
  const hasHandledFailure = useRef(false);
  const timingLockRef = useRef<GenerationTimingLock | null>(null);
  const inflightSnapshot = getInFlightGeneration();
  const hasPersistedResult = useRef(false);
  // Grace window before a sustained, unrecoverable connection failure is
  // surfaced. Transient blips (5xx, network) during polling are ignored —
  // the generation keeps running server-side.
  const connectionErrorSince = useRef<number | null>(null);
  const CONNECTION_ERROR_GRACE_MS = 180_000;

  const handleReset = useCallback(() => {
    releaseGenerationLoaderTheme();
    onReset();
  }, [onReset]);
  const hasResultMedia = (data?.resultUrls?.length ?? 0) > 0;
  const displayUrls = hasResultMedia
    ? data!.resultUrls
    : restoredReady
      ? restored!.resultUrls
      : [];
  const displayLarpId = data?.larpId ?? (restoredReady ? restored!.larpId : null);
  const displayResultType =
    data?.resultType ??
    (restoredReady ? restored!.resultType : undefined) ??
    resultType;
  const canShowResult =
    showResult &&
    displayUrls.length > 0 &&
    !!displayLarpId &&
    (data?.status === "success" || restoredReady);

  // Persist successful result so revisiting Créer does not re-bill.
  useEffect(() => {
    if (hasPersistedResult.current) return;
    if (data?.status !== "success" || !hasResultMedia || !data.larpId) return;
    hasPersistedResult.current = true;
    clearInFlightGeneration();
    saveLastGeneration({
      taskId,
      larpId: data.larpId,
      resultUrls: data.resultUrls,
      resultType: data.resultType ?? resultType,
      savedAt: Date.now(),
    });
    void queryClient.invalidateQueries({ queryKey: ["larp-history"] });
  }, [data?.status, data?.larpId, data?.resultUrls, data?.resultType, hasResultMedia, resultType, taskId, queryClient]);

  const primaryResultUrl = displayUrls[0] ?? null;

  useEffect(() => {
    if (!primaryResultUrl || displayResultType === "video") return;
    const img = new Image();
    img.src = primaryResultUrl;
  }, [displayResultType, primaryResultUrl]);

  useEffect(() => {
    if (!hasResultMedia && !restoredReady) return;
    if (data?.status === "success" || restoredReady) {
      setShowResult(true);
    }
  }, [data?.status, hasResultMedia, restoredReady]);

  useEffect(() => {
    if (revealDone) setShowResult(true);
  }, [revealDone]);

  useEffect(() => {
    if (data?.status !== "success" || !hasResultMedia || revealDone) return;
    const timer = setTimeout(() => {
      setRevealStarted(true);
      setRevealDone(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [data?.status, hasResultMedia, revealDone]);

  // Plein écran + masquer Crisp pendant toute la génération (pas seulement sur /create).
  useEffect(() => {
    if (fatalConnectionError || data?.status === "fail") return;
    if (revealStarted) return;
    document.documentElement.setAttribute("data-fullscreen-overlay", "true");
    document.body.setAttribute("data-fullscreen-overlay", "true");
    window.$crisp?.push(["do", "chat:hide"]);
  }, [data?.status, fatalConnectionError, revealStarted]);

  useEffect(() => {
    if (!revealStarted) return;
    document.documentElement.removeAttribute("data-fullscreen-overlay");
    document.body.removeAttribute("data-fullscreen-overlay");
    document.documentElement.setAttribute("data-larp-result-mode", "true");
    document.body.setAttribute("data-larp-result-mode", "true");
    onResultVisible?.();

    return () => {
      document.documentElement.removeAttribute("data-larp-result-mode");
      document.body.removeAttribute("data-larp-result-mode");
    };
  }, [onResultVisible, revealStarted]);

  const loaderStatus =
    !data || isLoading
      ? "connecting"
      : data.status === "success" && hasResultMedia
        ? "success"
        : data.status === "success"
          ? "waiting"
          : "waiting";

  // Track transient connection errors without killing the flow. Once we have
  // ever received data, the generation exists server-side, so we never treat a
  // later connection blip as fatal — we just keep polling until it resolves.
  // A timer guarantees the fatal transition fires even if React stops
  // re-rendering (e.g. polling stalls) once the grace window elapses.
  useEffect(() => {
    if (data || !isError) {
      connectionErrorSince.current = null;
      return;
    }
    if (connectionErrorSince.current === null) {
      connectionErrorSince.current = Date.now();
    }
    const remaining =
      CONNECTION_ERROR_GRACE_MS - (Date.now() - connectionErrorSince.current);
    if (remaining <= 0) {
      setFatalConnectionError(true);
      return;
    }
    const timer = setTimeout(() => setFatalConnectionError(true), remaining);
    return () => clearTimeout(timer);
  }, [isError, error, data]);

  useEffect(() => {
    if (hasHandledFailure.current) return;

    if (fatalConnectionError) {
      clearInFlightGeneration();
      hasHandledFailure.current = true;
      document.documentElement.removeAttribute("data-fullscreen-overlay");
      document.body.removeAttribute("data-fullscreen-overlay");
      document.documentElement.removeAttribute("data-larp-result-mode");
      document.body.removeAttribute("data-larp-result-mode");
      toast({
        title: t("progress.stillWorking", "Génération en cours"),
        description: t(
          "progress.stillWorkingHint",
          "La connexion a eu un coup de mou — rouvre Créer ou Historique dans un instant pour retrouver ta photo.",
        ),
      });
      handleReset();
      navigate(studioPath);
      return;
    }

    if (data?.status === "fail") {
      clearInFlightGeneration();
      hasHandledFailure.current = true;
      document.documentElement.removeAttribute("data-fullscreen-overlay");
      document.body.removeAttribute("data-fullscreen-overlay");
      document.documentElement.removeAttribute("data-larp-result-mode");
      document.body.removeAttribute("data-larp-result-mode");
      const failMessage =
        typeof data.failMessage === "string" &&
        data.failMessage &&
        data.failMessage !== "[object Object]"
          ? data.failMessage
          : t("progress.generationFailedDefault");
      const isPolicyFail =
        /non autoris|not allowed|nicht erlaubt|no est[aá] permitido|nudit|pornograph|aucun jeton|no credits|keine credits|ning[uú]n cr[eé]dito/i.test(
          failMessage,
        );
      toast({
        variant: "destructive",
        title: isPolicyFail ? t("progress.policyFail") : t("progress.generationFailed"),
        description: failMessage,
      });
      // Credits may have been refunded server-side on policy/provider fail.
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      handleReset();
      navigate(studioPath);
    }
  }, [
    data?.status,
    data?.failMessage,
    fatalConnectionError,
    error,
    handleReset,
    navigate,
    queryClient,
    studioPath,
    t,
    toast,
  ]);

  const estimatedSeconds =
    resultType === "video"
      ? 150
      : (() => {
          const polled =
            data?.estimatedSeconds != null && Number.isFinite(data.estimatedSeconds)
              ? data.estimatedSeconds
              : null;
          const fallback =
            initialEstimatedSeconds != null &&
            Number.isFinite(initialEstimatedSeconds)
              ? initialEstimatedSeconds
              : inflightSnapshot?.taskId === taskId
                ? inflightSnapshot.estimatedSeconds
                : referenceImageCount >= 2
                  ? 62
                  : 50;
          return polled ?? fallback;
        })();

  if (taskId) {
    timingLockRef.current = mergeGenerationTimingLock(timingLockRef.current, {
      estimate: estimatedSeconds,
      startedAtMs:
        parseApiCreatedAtMs(data?.createdAt) ??
        (inflightSnapshot?.taskId === taskId
          ? inflightSnapshot.startedAtMs
          : Date.now()),
    });
  }

  const lockedTiming = timingLockRef.current;
  const displayEstimate = lockedTiming?.estimate ?? estimatedSeconds;
  const startedAtMs = lockedTiming?.startedAtMs ?? Date.now();

  const serverRemainingSeconds =
    data?.remainingSeconds != null && Number.isFinite(data.remainingSeconds)
      ? data.remainingSeconds
      : null;

  const isGenerating =
    loaderStatus === "connecting" ||
    loaderStatus === "waiting" ||
    loaderStatus === "success";

  // Show the immersive loader for connecting/waiting/success (until reveal completes)
  const showLoader =
    isGenerating &&
    !revealDone &&
    !fatalConnectionError &&
    data?.status !== "fail";

  if (fatalConnectionError || data?.status === "fail") {
    return null;
  }

  return (
    <>
      {showLoader ? <GenerationLoaderBackdrop zIndex={100} /> : null}
      {showLoader ? (
        <GenerationLoader
          taskId={taskId}
          status={loaderStatus}
          estimatedSeconds={displayEstimate}
          serverRemainingSeconds={serverRemainingSeconds}
          startedAtMs={startedAtMs}
          inputImageUrl={inputImageUrl}
          resultUrls={data?.resultUrls}
          onRevealStart={() => setRevealStarted(true)}
          onRevealComplete={() => setRevealDone(true)}
        />
      ) : null}

      {/* After reveal: show the result */}
      {canShowResult &&
        createPortal(
          <div
            className={`fixed inset-0 overflow-hidden px-4 transition-opacity duration-[400ms] ease-out ${
              revealStarted
                ? "z-[100] opacity-100"
                : "z-[100] opacity-0 pointer-events-none"
            }`}
          >
            {/* Same backdrop as /login & /register (Auth.tsx) */}
            <div
              className="pointer-events-none absolute inset-0"
              aria-hidden
              style={{
                background: LX_AUTH_BG,
                backgroundImage: LX_AUTH_BG,
              }}
            />

            <span className="absolute left-1/2 top-[calc(1rem+env(safe-area-inset-top))] z-20 flex -translate-x-1/2 items-center gap-2 md:top-6">
              <Gem
                className="h-5 w-5 text-[var(--lx-gold)] md:h-6 md:w-6"
                strokeWidth={1.75}
                aria-hidden
              />
              <BrandMark className="text-xl font-semibold tracking-tight text-[var(--lx-ink)] md:text-2xl" />
            </span>

            {/* LARP result with download/share actions */}
            <div className="absolute left-1/2 top-[calc(50%-1.25rem)] z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-4 md:top-1/2">
              <LarpResult
                resultUrls={displayUrls}
                larpId={displayLarpId!}
                resultType={displayResultType}
                posterUrl={inputImageUrl}
              />
              <button
                type="button"
                onClick={handleReset}
                className="pointer-events-auto rounded-full border border-[var(--lx-gold)]/40 bg-white/95 px-5 py-2.5 text-sm font-semibold text-[var(--lx-ink)] shadow-md backdrop-blur-sm transition active:scale-[0.98]"
              >
                {t("progress.createAnother")}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
