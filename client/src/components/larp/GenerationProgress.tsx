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
  resultType?: "image" | "video";
}

export function GenerationProgress({
  taskId,
  inputImageUrl,
  onReset,
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

  // Show dock again when result is displayed (remove fullscreen overlay flag)
  useEffect(() => {
    if (showResult) {
      document.body.removeAttribute("data-fullscreen-overlay");
    }
  }, [showResult]);

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
      document.body.removeAttribute("data-fullscreen-overlay");
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
      document.body.removeAttribute("data-fullscreen-overlay");
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
            className="fixed inset-0 z-30 flex h-[100dvh] max-h-[100dvh] flex-col items-center justify-center gap-3 overflow-hidden px-4 pb-20 pt-20 animate-in fade-in duration-500 bg-background bg-grid md:gap-6 md:pb-24 md:pt-24"
          >
            <h1 className="font-display text-2xl md:text-3xl font-bold text-center shrink-0">
              <span className="text-primary decoration-primary/30 underline decoration-2 underline-offset-4 sm:decoration-4">
                {t("progress.resultTitle")}
              </span>
            </h1>

            {/* LARP result with download/share actions */}
            <div className="relative flex min-h-0 min-w-0 w-full items-center justify-center overflow-visible px-2 py-1 md:py-2 [&>*]:shrink-0">
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
              className="group rounded-full h-11 px-8 text-sm font-semibold border-0 shadow-none active:scale-95 transition-transform gap-2 shrink-0"
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
