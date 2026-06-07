import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ArrowRight } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useLarpStatus } from "@/hooks/use-larps";
import { useToast } from "@/hooks/use-toast";
import { LarpResult } from "./LarpResult";
import { GenerationLoader } from "./GenerationLoader";
import { useTranslation } from "react-i18next";

interface GenerationProgressProps {
  taskId: string;
  inputImageUrl?: string;
  onReset: () => void;
  onResultVisible?: () => void;
  resultType?: "image" | "video";
}

export function GenerationProgress({
  taskId,
  inputImageUrl,
  onReset,
  onResultVisible,
  resultType = "image",
}: GenerationProgressProps) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data, isLoading, error, isError } = useLarpStatus(taskId);
  const [revealDone, setRevealDone] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [fatalConnectionError, setFatalConnectionError] = useState(false);
  const hasHandledFailure = useRef(false);
  // Grace window before a sustained, unrecoverable connection failure is
  // surfaced. Transient blips (5xx, network) during polling are ignored —
  // the generation keeps running server-side.
  const connectionErrorSince = useRef<number | null>(null);
  const CONNECTION_ERROR_GRACE_MS = 60_000;
  const hasResultMedia = (data?.resultUrls?.length ?? 0) > 0;

  // Wait for loader exit animation before showing result
  useEffect(() => {
    if (revealDone) {
      const timer = setTimeout(() => setShowResult(true), 500);
      return () => clearTimeout(timer);
    }
  }, [revealDone]);

  // Fallback if loader reveal never completes (e.g. animation edge case).
  useEffect(() => {
    if (data?.status !== "success" || !hasResultMedia || revealDone) return;
    const timer = setTimeout(() => setRevealDone(true), 5000);
    return () => clearTimeout(timer);
  }, [data?.status, hasResultMedia, revealDone]);

  // Swap the fullscreen loader for a clean result surface.
  useEffect(() => {
    if (showResult) {
      document.documentElement.removeAttribute("data-fullscreen-overlay");
      document.body.removeAttribute("data-fullscreen-overlay");
      document.documentElement.setAttribute("data-larp-result-mode", "true");
      document.body.setAttribute("data-larp-result-mode", "true");
      onResultVisible?.();
    }

    return () => {
      if (showResult) {
        document.documentElement.removeAttribute("data-larp-result-mode");
        document.body.removeAttribute("data-larp-result-mode");
      }
    };
  }, [onResultVisible, showResult]);

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
      hasHandledFailure.current = true;
      document.documentElement.removeAttribute("data-fullscreen-overlay");
      document.body.removeAttribute("data-fullscreen-overlay");
      document.documentElement.removeAttribute("data-larp-result-mode");
      document.body.removeAttribute("data-larp-result-mode");
      toast({
        variant: "destructive",
        title: t("progress.connectionError"),
        description: error?.message ?? t("progress.connectionError"),
      });
      onReset();
      navigate("/generate");
      return;
    }

    if (data?.status === "fail") {
      hasHandledFailure.current = true;
      document.documentElement.removeAttribute("data-fullscreen-overlay");
      document.body.removeAttribute("data-fullscreen-overlay");
      document.documentElement.removeAttribute("data-larp-result-mode");
      document.body.removeAttribute("data-larp-result-mode");
      toast({
        variant: "destructive",
        title: t("progress.generationFailed"),
        description: data.failMessage || t("progress.generationFailedDefault"),
      });
      onReset();
      navigate("/generate");
    }
  }, [
    data?.status,
    data?.failMessage,
    fatalConnectionError,
    error,
    navigate,
    onReset,
    t,
    toast,
  ]);

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
      {/* Immersive fullscreen loader via portal-like fixed overlay */}
      <AnimatePresence>
        {showLoader && (
          <GenerationLoader
            status={loaderStatus}
            inputImageUrl={inputImageUrl}
            resultUrls={data?.resultUrls}
            onRevealComplete={() => setRevealDone(true)}
          />
        )}
      </AnimatePresence>

      {/* After reveal: show the result */}
      {showResult &&
        data?.status === "success" &&
        hasResultMedia &&
        createPortal(
          <div
            className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 overflow-hidden bg-background bg-grid px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-[calc(4.75rem+env(safe-area-inset-top))] animate-in fade-in duration-500 md:gap-6 md:px-6 md:pb-24 md:pt-24"
          >
            <h1 className="font-display w-full shrink-0 text-center text-[2rem] font-bold leading-none md:text-3xl">
              <span className="text-primary decoration-primary/30 underline decoration-2 underline-offset-4 sm:decoration-4">
                {t("progress.resultTitle")}
              </span>
            </h1>

            {/* LARP result with download/share actions */}
            <div className="relative flex min-h-0 min-w-0 shrink items-center justify-center overflow-visible">
              <LarpResult
                resultUrls={data.resultUrls}
                larpId={data.larpId}
                resultType={data.resultType ?? resultType}
                posterUrl={inputImageUrl}
              />
            </div>

            {/* CTA button */}
            <Button
              onClick={onReset}
              className="group hidden h-11 shrink-0 gap-2 rounded-full border-0 px-8 text-sm font-semibold shadow-none transition-transform active:scale-95 md:inline-flex"
            >
              {t("progress.createAnother")}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>,
          document.body,
        )}
    </>
  );
}
