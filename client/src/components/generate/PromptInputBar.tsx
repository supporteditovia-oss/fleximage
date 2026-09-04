import {
  SendHorizonal,
  Loader2,
  Shuffle,
  Gem,
  RectangleVertical,
  RectangleHorizontal,
  Mic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTypewriterPlaceholder } from "@/hooks/use-typewriter";
import { useAuth } from "@/hooks/use-auth";
import { useSpeechDictation } from "@/hooks/use-speech-dictation";
import { useToast } from "@/hooks/use-toast";
import {
  getLarpChipsForLocale,
  getLarpIdeasForLocale,
  getRandomPromptPoolForLocale,
} from "@/lib/larp-data";
import { useCallback, useEffect, useMemo, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  LANDSCAPE_ASPECT_RATIO,
  OUTPUT_ASPECT_RATIO,
  type GenerationAspectRatio,
} from "@shared/schema";

interface PromptInputBarProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  canGenerate?: boolean;
  /** Style CTA doré LuxeFlexIA (page /generate uniquement) */
  goldCta?: boolean;
  /** Coût affiché (ex. 10 crédits / image) */
  creditCost?: number;
  aspectRatio?: GenerationAspectRatio;
  onAspectRatioChange?: (value: GenerationAspectRatio) => void;
}

const PROMPT_MIN_HEIGHT_PX = 52;
const PROMPT_MAX_HEIGHT_PX = 168;

function resizePromptField(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  const next = Math.min(
    Math.max(el.scrollHeight, PROMPT_MIN_HEIGHT_PX),
    PROMPT_MAX_HEIGHT_PX,
  );
  el.style.height = `${next}px`;
}

export function PromptInputBar({
  prompt,
  onPromptChange,
  onGenerate,
  isGenerating,
  canGenerate = true,
  goldCta = false,
  creditCost,
  aspectRatio = OUTPUT_ASPECT_RATIO,
  onAspectRatioChange,
}: PromptInputBarProps) {
  const { t, i18n } = useTranslation();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const larpIdeas = useMemo(
    () => getLarpIdeasForLocale(i18n.resolvedLanguage),
    [i18n.resolvedLanguage],
  );
  const larpChips = useMemo(
    () => getLarpChipsForLocale(i18n.resolvedLanguage),
    [i18n.resolvedLanguage],
  );
  const randomPromptPool = useMemo(
    () => getRandomPromptPoolForLocale(i18n.resolvedLanguage),
    [i18n.resolvedLanguage],
  );
  const placeholderRef = useTypewriterPlaceholder(
    prompt,
    larpIdeas,
    t("promptInput.describePlaceholder"),
  );

  const syncPromptHeight = useCallback(() => {
    resizePromptField(placeholderRef.current);
  }, [placeholderRef]);

  useEffect(() => {
    syncPromptHeight();
  }, [prompt, syncPromptHeight]);

  const shuffleIdea = () => {
    const pool = randomPromptPool.length > 0 ? randomPromptPool : larpChips.map((c) => c.example);
    const random = pool[Math.floor(Math.random() * pool.length)];
    if (random) onPromptChange(random);
  };

  const {
    listening: dictating,
    error: dictationError,
    toggle: toggleDictation,
    adoptUserText,
  } = useSpeechDictation({
    enabled: isAdmin,
    lang: i18n.resolvedLanguage || "fr",
    baseText: prompt,
    onText: onPromptChange,
  });

  useEffect(() => {
    if (!dictationError) return;
    toast({
      title: "Micro",
      description: dictationError,
      variant: "destructive",
    });
  }, [dictationError, toast]);

  const showCreditCost = typeof creditCost === "number" && creditCost > 0;
  const isLandscape = aspectRatio === LANDSCAPE_ASPECT_RATIO;

  const toggleAspectRatio = () => {
    if (!onAspectRatioChange) return;
    onAspectRatioChange(
      isLandscape ? OUTPUT_ASPECT_RATIO : LANDSCAPE_ASPECT_RATIO,
    );
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isGenerating && canGenerate) onGenerate();
    }
  };

  return (
    <div className="relative z-10 flex w-full justify-center">
      <div className="flex w-full max-w-md flex-col gap-2 md:max-w-xl">
        <div className="lx-prompt-composer group/composer w-full rounded-2xl border border-[var(--lx-gold)]/20 bg-white/90 px-3.5 py-3 shadow-[0_8px_32px_rgba(18,16,14,0.06)] backdrop-blur-md transition-all hover:border-[var(--lx-gold)]/35 focus-within:border-[var(--lx-gold)]/45 focus-within:shadow-[0_12px_40px_rgba(201,162,39,0.12)] focus-within:ring-2 focus-within:ring-[var(--lx-gold)]/15 md:px-4 md:py-3.5">
          <textarea
            ref={placeholderRef}
            value={prompt}
            rows={2}
            onChange={(e) => {
              const next = e.target.value;
              onPromptChange(next);
              adoptUserText(next);
            }}
            onInput={syncPromptHeight}
            onKeyDown={handleKeyDown}
            placeholder={t("promptInput.describePlaceholder")}
            className="lx-prompt-field w-full resize-none overflow-y-auto bg-transparent text-[15px] leading-relaxed text-[#1a1408] outline-none placeholder:text-muted-foreground/65 md:text-base md:leading-relaxed"
            aria-label={t("promptInput.describePlaceholder")}
          />

          <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[var(--lx-gold)]/12 pt-2.5">
            <div className="flex min-w-0 items-center gap-1">
              {onAspectRatioChange ? (
                <button
                  type="button"
                  onClick={toggleAspectRatio}
                  className="flex h-8 shrink-0 items-center justify-center gap-1 rounded-lg px-1.5 text-muted-foreground transition-all hover:bg-[var(--lx-gold)]/8 hover:text-foreground active:scale-90"
                  title={
                    isLandscape
                      ? t("promptInput.aspectLandscape", {
                          defaultValue: "Format paysage (16:9)",
                        })
                      : t("promptInput.aspectPortrait", {
                          defaultValue: "Format portrait (9:16)",
                        })
                  }
                  aria-label={
                    isLandscape
                      ? t("promptInput.aspectLandscape", {
                          defaultValue: "Format paysage (16:9)",
                        })
                      : t("promptInput.aspectPortrait", {
                          defaultValue: "Format portrait (9:16)",
                        })
                  }
                >
                  {isLandscape ? (
                    <RectangleHorizontal className="h-4 w-4" strokeWidth={2} />
                  ) : (
                    <RectangleVertical className="h-4 w-4" strokeWidth={2} />
                  )}
                  <span className="text-[10px] font-bold tabular-nums tracking-tight">
                    {aspectRatio}
                  </span>
                </button>
              ) : null}
              <button
                onClick={shuffleIdea}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-[var(--lx-gold)]/8 hover:text-foreground active:scale-90"
                title={t("promptInput.randomIdea")}
                type="button"
              >
                <Shuffle className="h-4 w-4" />
              </button>
              {isAdmin ? (
                <button
                  onClick={toggleDictation}
                  className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all active:scale-90 md:flex ${
                    dictating
                      ? "bg-[var(--lx-gold)]/18 text-[var(--lx-gold)] shadow-[0_0_0_1px_rgba(201,162,39,0.45)]"
                      : "text-muted-foreground hover:bg-[var(--lx-gold)]/8 hover:text-foreground"
                  }`}
                  title={dictating ? "Arrêter la dictée" : "Dicter le prompt"}
                  aria-label={dictating ? "Arrêter la dictée" : "Dicter le prompt"}
                  aria-pressed={dictating}
                  type="button"
                >
                  <Mic className={`h-4 w-4 ${dictating ? "animate-pulse" : ""}`} />
                </button>
              ) : null}
            </div>

            <button
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all active:scale-95 disabled:opacity-50 md:hidden ${
                goldCta
                  ? "bg-[linear-gradient(135deg,#e8c547_0%,#c9a227_45%,#8b6914_100%)] text-[#1a1408] shadow-[0_4px_14px_rgba(201,162,39,0.28)] hover:brightness-105"
                  : "bg-primary text-white hover:bg-primary/90"
              }`}
              onClick={onGenerate}
              disabled={isGenerating || !canGenerate}
              type="button"
              title={
                showCreditCost
                  ? t("promptInput.creditCostHint", { count: creditCost })
                  : undefined
              }
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SendHorizonal className="h-4 w-4" />
              )}
            </button>

            <Button
              size="sm"
              className={`hidden h-9 shrink-0 rounded-full border-0 px-5 text-xs font-semibold transition-transform active:scale-95 md:flex ${
                goldCta
                  ? "bg-[linear-gradient(135deg,#e8c547_0%,#c9a227_45%,#8b6914_100%)] text-[#1a1408] shadow-[0_4px_18px_rgba(201,162,39,0.28)] hover:opacity-100 hover:brightness-105"
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

        {showCreditCost && (
          <div
            className="flex items-center justify-center gap-2 rounded-lg border border-[var(--lx-gold)]/50 bg-[linear-gradient(135deg,rgba(232,197,71,0.18),rgba(201,162,39,0.1))] px-3 py-2 text-center shadow-sm"
            role="note"
          >
            <Gem
              className="h-4 w-4 shrink-0 text-[var(--lx-gold)]"
              strokeWidth={1.75}
              aria-hidden
            />
            <span className="text-[13px] font-bold tracking-wide text-[#3d320c] sm:text-sm">
              {t("promptInput.creditCostHint", { count: creditCost })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
