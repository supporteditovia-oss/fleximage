import { SendHorizonal, Loader2, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseTextFields } from "@/lib/template-utils";
import { useTypewriterPlaceholder } from "@/hooks/use-typewriter";
import {
  getPrankChipsForLocale,
  getPrankIdeasForLocale,
} from "@/lib/prank-data";
import type { PromptTemplate } from "@shared/schema";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

interface PromptInputBarProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  selectedTemplate: PromptTemplate | null;
  textValues: Record<number, string>;
  onTextValueChange: (index: number, value: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export function PromptInputBar({
  prompt,
  onPromptChange,
  selectedTemplate,
  textValues,
  onTextValueChange,
  onGenerate,
  isGenerating,
}: PromptInputBarProps) {
  const { t, i18n } = useTranslation();
  const prankIdeas = useMemo(
    () => getPrankIdeasForLocale(i18n.resolvedLanguage),
    [i18n.resolvedLanguage],
  );
  const prankChips = useMemo(
    () => getPrankChipsForLocale(i18n.resolvedLanguage),
    [i18n.resolvedLanguage],
  );
  const placeholderRef = useTypewriterPlaceholder(
    prompt,
    prankIdeas,
    t("promptInput.describePlaceholder"),
  );

  const shuffleIdea = () => {
    const random = prankChips[Math.floor(Math.random() * prankChips.length)];
    onPromptChange(random.example);
  };

  return (
    <div className="relative z-10 w-full flex justify-center">
      <div className="flex flex-col gap-2 w-full max-w-md">
        {/* Free mode: single text input */}
        {!selectedTemplate && (
          <div className="flex items-center gap-2 md:gap-3 w-full rounded-3xl border border-border/40 bg-card/90 backdrop-blur px-3 md:px-5 py-2.5 md:py-3.5 shadow-lg shadow-black/5 hover:border-border/60 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
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
              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/5 active:scale-90 transition-all"
              title={t("promptInput.randomIdea")}
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button
              className="shrink-0 w-8 h-8 rounded-full flex md:hidden items-center justify-center text-white bg-primary hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50"
              onClick={onGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <SendHorizonal className="w-4 h-4" />
              )}
            </button>
            <Button
              size="sm"
              className="rounded-full h-9 px-5 shrink-0 text-xs font-semibold border-0 shadow-none active:scale-95 transition-transform hidden md:flex"
              onClick={onGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? t("promptInput.creating") : t("promptInput.create")}
            </Button>
          </div>
        )}

        {/* Template mode: fields overflow upward over image + generate button */}
        {selectedTemplate &&
          (() => {
            const fields = parseTextFields(selectedTemplate);
            return (
              <div className="relative w-full">
                {/* Parameter fields — positioned absolutely, growing upward over the image */}
                {fields.length > 0 && (
                  <div className="absolute bottom-full left-0 right-0 flex flex-col gap-2 pb-2.5">
                    {fields.map((field, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col w-full rounded-3xl border border-border/40 bg-card/90 backdrop-blur px-3 md:px-5 pt-2 pb-2.5 md:pt-2.5 md:pb-3 shadow-lg shadow-black/5 hover:border-border/60 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all"
                      >
                        <span className="text-[10px] font-semibold text-muted-foreground/70 mb-0.5">
                          {field.label ||
                            t("promptInput.textFallbackLabel", { index: idx + 1 })}
                          {field.required && (
                            <span className="text-destructive ml-0.5">
                              *
                            </span>
                          )}
                        </span>
                        <input
                          type="text"
                          value={textValues[idx] || ""}
                          onChange={(e) =>
                            onTextValueChange(idx, e.target.value)
                          }
                          placeholder={field.label
                            ? t("promptInput.enterValue", {
                                label: field.label.toLowerCase(),
                              })
                            : t("promptInput.enterValueFallback")}
                          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                          required={field.required}
                        />
                      </div>
                    ))}
                  </div>
                )}
                {/* Generate button */}
                <Button
                  className="w-full rounded-3xl h-11 text-sm font-semibold shadow-lg shadow-black/5 active:scale-[0.98] transition-transform"
                  onClick={onGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {t("promptInput.creating")}
                    </>
                  ) : (
                    t("promptInput.create")
                  )}
                </Button>
              </div>
            );
          })()}
      </div>
    </div>
  );
}
