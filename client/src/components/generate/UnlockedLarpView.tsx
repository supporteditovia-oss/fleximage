import { LarpResult } from "@/components/larp/LarpResult";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Gem } from "lucide-react";

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
}: UnlockedLarpViewProps) {
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
    <div className="fixed inset-0 z-40 overflow-hidden bg-[var(--lx-surface)] bg-grid px-4 animate-in fade-in duration-500">
      <span className="lx-display absolute left-1/2 top-[calc(1rem+env(safe-area-inset-top))] z-20 flex -translate-x-1/2 items-center gap-2 md:top-6">
        <Gem
          className="h-5 w-5 text-[var(--lx-gold)] md:h-6 md:w-6"
          strokeWidth={1.75}
          aria-hidden
        />
        <span className="text-xl font-semibold tracking-tight text-[var(--lx-ink)] md:text-2xl">
          Luxe<span className="text-[var(--lx-gold)]">Flex</span>IA
        </span>
      </span>

      <div className="absolute left-1/2 top-[calc(50%-1.25rem)] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center md:top-1/2">
        <LarpResult
          resultUrls={resultUrls}
          larpId={larpId}
          resultType={resultType}
          posterUrl={posterUrl}
        />
      </div>
    </div>,
    document.body,
  );
}
