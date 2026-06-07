import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LarpResult } from "@/components/larp/LarpResult";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { createPortal } from "react-dom";

interface UnlockedLarpViewProps {
  resultUrls: string[];
  larpId: string;
  resultType?: "image" | "video";
  posterUrl?: string;
  onReset: () => void;
}

export function UnlockedLarpView({
  resultUrls,
  larpId,
  resultType = "image",
  posterUrl,
  onReset,
}: UnlockedLarpViewProps) {
  const { t } = useTranslation();

  useEffect(() => {
    document.documentElement.removeAttribute("data-fullscreen-overlay");
    document.body.removeAttribute("data-fullscreen-overlay");
    document.documentElement.setAttribute("data-larp-result-mode", "true");
    document.body.setAttribute("data-larp-result-mode", "true");

    return () => {
      document.documentElement.removeAttribute("data-larp-result-mode");
      document.body.removeAttribute("data-larp-result-mode");
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 overflow-hidden bg-background bg-grid px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-[calc(4.75rem+env(safe-area-inset-top))] animate-in fade-in duration-500 md:gap-6 md:px-6 md:pb-24 md:pt-24">
      <h1 className="font-display w-full shrink-0 text-center text-[2rem] font-bold leading-none md:text-3xl">
        <span className="text-primary decoration-primary/30 underline decoration-2 underline-offset-4 sm:decoration-4">
          {t("generate.resultTitle")}
        </span>
      </h1>

      <div className="relative flex min-h-0 min-w-0 shrink items-center justify-center overflow-visible">
        <LarpResult
          resultUrls={resultUrls}
          larpId={larpId}
          resultType={resultType}
          posterUrl={posterUrl}
        />
      </div>

      <Button
        onClick={onReset}
        className="group hidden h-11 shrink-0 gap-2 rounded-full border-0 px-8 text-sm font-semibold shadow-none transition-transform active:scale-95 md:inline-flex"
      >
        {t("generate.createAnother")}
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
      </Button>
    </div>,
    document.body,
  );
}
