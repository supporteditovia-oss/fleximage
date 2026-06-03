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
  const { data, isLoading, error } = useLarpStatus(taskId);
  const [revealDone, setRevealDone] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const hasHandledFailure = useRef(false);

  // Wait for loader exit animation before showing result
  useEffect(() => {
    if (revealDone) {
      const timer = setTimeout(() => setShowResult(true), 500);
      return () => clearTimeout(timer);
    }
  }, [revealDone]);

  // Show dock again when result is displayed (remove fullscreen overlay flag)
  useEffect(() => {
    if (showResult) {
      document.body.removeAttribute("data-fullscreen-overlay");
    }
  }, [showResult]);

  // Determine loader status
  const hasResultMedia = (data?.resultUrls?.length ?? 0) > 0;

  const loaderStatus =
    !data || isLoading
      ? "connecting"
      : data.status === "success" && hasResultMedia
        ? "success"
        : data.status === "success"
          ? "waiting"
          : "waiting";

  useEffect(() => {
    if (hasHandledFailure.current) return;

    if (error) {
      hasHandledFailure.current = true;
      document.body.removeAttribute("data-fullscreen-overlay");
      toast({
        variant: "destructive",
        title: t("progress.connectionError"),
        description: error.message,
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
  }, [data?.status, data?.failMessage, error, navigate, onReset, t, toast]);

  const isGenerating =
    loaderStatus === "connecting" ||
    loaderStatus === "waiting" ||
    loaderStatus === "success";

  // Show the immersive loader for connecting/waiting/success (until reveal completes)
  const showLoader =
    isGenerating && !revealDone && !error && data?.status !== "fail";

  if (error || data?.status === "fail") {
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
            className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-6 overflow-hidden px-4 pt-24 pb-24 animate-in fade-in duration-500 bg-background bg-grid"
          >
            {/* Title with SVG underline */}
            <h1 className="font-display text-2xl md:text-3xl font-bold text-center shrink-0">
              <span className="relative inline-block">
                {t("progress.resultTitle")}
                <svg
                  className="pointer-events-none absolute left-0 right-0 mx-auto bottom-[-0.25em] md:bottom-[-0.35em] w-full h-[0.3em] md:h-[0.34em] text-primary/50"
                  viewBox="0 0 100 12"
                  fill="none"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 8 Q 50 2 98 8"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinecap="round"
                  ></path>
                </svg>
              </span>
            </h1>

            {/* LARP result with download/share actions */}
            <div className="relative flex min-h-0 min-w-0 w-full flex-1 items-center justify-center overflow-hidden px-2 py-2">
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
