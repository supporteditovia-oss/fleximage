import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { XCircle, RotateCcw, ArrowRight } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { usePrankStatus } from "@/hooks/use-pranks";
import { PrankResult } from "./PrankResult";
import { GenerationLoader } from "./GenerationLoader";

interface GenerationProgressProps {
  taskId: string;
  inputImageUrl?: string;
  onRetry: () => void;
  onReset: () => void;
}

export function GenerationProgress({
  taskId,
  inputImageUrl,
  onRetry,
  onReset,
}: GenerationProgressProps) {
  const { data, isLoading, error } = usePrankStatus(taskId);
  const [revealDone, setRevealDone] = useState(false);
  const [showResult, setShowResult] = useState(false);

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
  const loaderStatus =
    !data || isLoading
      ? "connecting"
      : data.status === "success"
        ? "success"
        : "waiting";

  const isGenerating =
    loaderStatus === "connecting" ||
    loaderStatus === "waiting" ||
    loaderStatus === "success";

  // Show the immersive loader for connecting/waiting/success (until reveal completes)
  const showLoader =
    isGenerating && !revealDone && !error && data?.status !== "fail";

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <XCircle className="h-10 w-10 text-destructive" />
        <p className="text-destructive font-medium">Erreur de connexion</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Recommencer
          </Button>
        </div>
      </div>
    );
  }

  if (data?.status === "fail") {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <XCircle className="h-10 w-10 text-destructive" />
        <div className="text-center space-y-1">
          <p className="text-destructive font-medium">Échec de la génération</p>
          <p className="text-sm text-muted-foreground">
            {data.failMessage ||
              "Une erreur est survenue lors de la génération."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Recommencer
          </Button>
          <Button onClick={onRetry}>Réessayer</Button>
        </div>
      </div>
    );
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
        createPortal(
          <div
            className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-6 overflow-hidden px-4 pt-24 pb-24 animate-in fade-in duration-500 bg-background bg-grid"
          >
            {/* Title with SVG underline */}
            <h1 className="font-display text-2xl md:text-3xl font-bold text-center shrink-0">
              <span className="relative inline-block">
                Voici ton prank !
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

            {/* Prank result with download/share actions */}
            <div className="relative min-h-0 min-w-0 flex items-center justify-center overflow-hidden py-2 shrink">
              <PrankResult
                resultUrls={data.resultUrls}
                prankId={data.prankId}
              />
            </div>

            {/* CTA button */}
            <Button
              onClick={onReset}
              className="group rounded-full h-11 px-8 text-sm font-semibold border-0 shadow-none active:scale-95 transition-transform gap-2 shrink-0"
            >
              Créer un autre prank
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>,
          document.body,
        )}
    </>
  );
}
