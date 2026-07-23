import { LarpResult } from "@/components/larp/LarpResult";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Gem } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
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
    <div
      className="fixed inset-0 z-40 overflow-hidden px-4 animate-in fade-in duration-500"
      style={{
        background:
          "linear-gradient(160deg, #ffffff 0%, #f5f0e8 48%, #ebe6df 100%)",
      }}
    >
      <span className="absolute left-1/2 top-[calc(1rem+env(safe-area-inset-top))] z-20 flex -translate-x-1/2 items-center gap-2 md:top-6">
        <Gem
          className="h-5 w-5 text-[var(--lx-gold)] md:h-6 md:w-6"
          strokeWidth={1.75}
          aria-hidden
        />
        <BrandMark className="text-xl font-semibold tracking-tight text-[var(--lx-ink)] md:text-2xl" />
      </span>

      <div className="absolute left-1/2 top-[calc(50%-1.25rem)] z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-4 md:top-1/2">
        <LarpResult
          resultUrls={resultUrls}
          larpId={larpId}
          resultType={resultType}
          posterUrl={posterUrl}
        />
        <button
          type="button"
          onClick={onReset}
          className="pointer-events-auto rounded-full border border-[var(--lx-gold)]/40 bg-white/95 px-5 py-2.5 text-sm font-semibold text-[var(--lx-ink)] shadow-md backdrop-blur-sm transition active:scale-[0.98]"
        >
          {t("progress.createAnother")}
        </button>
      </div>
    </div>,
    document.body,
  );
}
