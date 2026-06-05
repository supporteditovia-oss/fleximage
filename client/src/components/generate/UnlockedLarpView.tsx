import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LarpResult } from "@/components/larp/LarpResult";
import { useTranslation } from "react-i18next";

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

  return (
    <div className="flex h-[calc(100dvh-12.5rem)] flex-col items-center justify-center gap-3 overflow-hidden px-4 py-4 animate-in fade-in duration-500">
      <h1 className="font-display text-2xl md:text-3xl font-bold text-center shrink-0">
        <span className="text-primary decoration-primary/30 underline decoration-2 underline-offset-4 sm:decoration-4">
          {t("generate.resultTitle")}
        </span>
      </h1>

      <div className="relative flex min-h-0 min-w-0 w-full items-center justify-center overflow-visible px-2 [&>*]:shrink-0">
        <LarpResult
          resultUrls={resultUrls}
          larpId={larpId}
          resultType={resultType}
          posterUrl={posterUrl}
        />
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
