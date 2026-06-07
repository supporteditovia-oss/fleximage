import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LarpResult } from "@/components/larp/LarpResult";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";

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
    document.documentElement.setAttribute("data-larp-result-visible", "true");
    document.body.setAttribute("data-larp-result-visible", "true");
    window.dispatchEvent(new Event("larpking:result-visible"));

    return () => {
      document.documentElement.removeAttribute("data-larp-result-visible");
      document.body.removeAttribute("data-larp-result-visible");
    };
  }, []);

  return (
    <div className="mx-auto flex min-h-[calc(100svh-12rem)] w-full max-w-[28rem] flex-col items-center justify-start gap-3 overflow-visible px-0 pb-8 pt-0 animate-in fade-in duration-500 md:h-[calc(100dvh-12.5rem)] md:max-w-none md:justify-center md:gap-6 md:overflow-hidden md:px-4 md:py-4">
      <h1 className="font-display w-full shrink-0 text-center text-[2rem] font-bold leading-none md:text-3xl">
        <span className="text-primary decoration-primary/30 underline decoration-2 underline-offset-4 sm:decoration-4">
          {t("generate.resultTitle")}
        </span>
      </h1>

      <div className="relative flex min-h-0 min-w-0 w-full flex-1 items-center justify-center overflow-visible px-0 py-1 md:px-2 md:py-2 [&>*]:shrink-0">
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
    </div>
  );
}
