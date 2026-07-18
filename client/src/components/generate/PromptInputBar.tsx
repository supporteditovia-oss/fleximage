import { SendHorizonal, Loader2, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTypewriterPlaceholder } from "@/hooks/use-typewriter";
import {
  getLarpChipsForLocale,
  getLarpIdeasForLocale,
} from "@/lib/larp-data";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

interface PromptInputBarProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  canGenerate?: boolean;
  /** Style CTA doré LuxeFlexIA (page /generate uniquement) */
  goldCta?: boolean;
}

export function PromptInputBar({
  prompt,
  onPromptChange,
  onGenerate,
  isGenerating,
  canGenerate = true,
  goldCta = false,
}: PromptInputBarProps) {
  const { t, i18n } = useTranslation();
  const larpIdeas = useMemo(
    () => getLarpIdeasForLocale(i18n.resolvedLanguage),
    [i18n.resolvedLanguage],
  );
  const larpChips = useMemo(
    () => getLarpChipsForLocale(i18n.resolvedLanguage),
    [i18n.resolvedLanguage],
  );
  const placeholderRef = useTypewriterPlaceholder(
    prompt,
    larpIdeas,
    t("promptInput.describePlaceholder"),
  );

  const shuffleIdea = () => {
    const random = larpChips[Math.floor(Math.random() * larpChips.length)];
    onPromptChange(random.example);
  };

  return (
    <div className="relative z-10 w-full flex justify-center">
      <div className="flex flex-col gap-2 w-full max-w-md">
        <div className="flex items-center gap-2 md:gap-3 w-full rounded-lg border border-border/80 bg-white/85 backdrop-blur px-3 md:px-5 py-2.5 md:py-3.5 shadow-sm shadow-black/5 hover:border-foreground/30 focus-within:border-foreground/50 focus-within:ring-2 focus-within:ring-foreground/10 transition-all">
          <input
            ref={placeholderRef}
            type="text"
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder={t("promptInput.describePlaceholder")}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
          />
          <button
            onClick={shuffleIdea}
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all"
            title={t("promptInput.randomIdea")}
            type="button"
          >
            <Shuffle className="w-4 h-4" />
          </button>
          <button
            className={`shrink-0 w-8 h-8 rounded-lg flex md:hidden items-center justify-center active:scale-95 transition-all disabled:opacity-50 ${
              goldCta
                ? "text-[#1a1408] bg-[linear-gradient(135deg,#e8c547_0%,#c9a227_45%,#8b6914_100%)] shadow-[0_4px_14px_rgba(201,162,39,0.28)] hover:brightness-105"
                : "text-white bg-primary hover:bg-primary/90"
            }`}
            onClick={onGenerate}
            disabled={isGenerating || !canGenerate}
            type="button"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <SendHorizonal className="w-4 h-4" />
            )}
          </button>
          <Button
            size="sm"
            className={`rounded-full h-9 px-5 shrink-0 text-xs font-semibold border-0 active:scale-95 transition-transform hidden md:flex ${
              goldCta
                ? "text-[#1a1408] bg-[linear-gradient(135deg,#e8c547_0%,#c9a227_45%,#8b6914_100%)] shadow-[0_4px_18px_rgba(201,162,39,0.28)] hover:brightness-105 hover:opacity-100"
                : "shadow-none"
            }`}
            onClick={onGenerate}
            disabled={isGenerating || !canGenerate}
            type="button"
          >
            {isGenerating ? t("promptInput.creating") : t("promptInput.create")}
          </Button>
        </div>
      </div>
    </div>
  );
}
