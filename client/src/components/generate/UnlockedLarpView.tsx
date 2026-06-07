import { LarpResult } from "@/components/larp/LarpResult";
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
    <div className="fixed inset-0 z-40 overflow-hidden bg-background bg-grid px-4 animate-in fade-in duration-500">
      <img
        src="/assets/larpking.png"
        alt="LarpKing"
        className="absolute left-1/2 top-[calc(1rem+env(safe-area-inset-top))] z-20 h-12 -translate-x-1/2 object-contain drop-shadow-[0_0_28px_hsl(var(--primary)/0.28)] md:top-6 md:h-16"
      />

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
