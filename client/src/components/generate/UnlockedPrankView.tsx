import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrankResult } from "@/components/prank/PrankResult";
import { useTranslation } from "react-i18next";

interface UnlockedPrankViewProps {
  resultUrls: string[];
  prankId: string;
  onReset: () => void;
}

export function UnlockedPrankView({
  resultUrls,
  prankId,
  onReset,
}: UnlockedPrankViewProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center gap-3 h-[calc(100dvh-12.5rem)] animate-in fade-in duration-500 overflow-hidden">
      <h1 className="font-display text-2xl md:text-3xl font-bold text-center shrink-0">
        <span className="relative inline-block">
          {t("generate.resultTitle")}
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

      <div className="relative min-h-0 flex-1 flex items-center justify-center overflow-hidden">
        <PrankResult resultUrls={resultUrls} prankId={prankId} />
      </div>

      <Button
        onClick={onReset}
        className="group rounded-full h-11 px-8 text-sm font-semibold border-0 shadow-none active:scale-95 transition-transform gap-2 shrink-0"
      >
        {t("generate.createAnother")}
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
      </Button>
    </div>
  );
}
