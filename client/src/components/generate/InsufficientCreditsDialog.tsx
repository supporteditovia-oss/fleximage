import { ArrowRight, Coins, Sparkles, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type GenerationMode = "image" | "video";

interface InsufficientCreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCredits: number;
  requiredCredits: number;
  generationMode: GenerationMode;
  onUpgrade: () => void;
}

export function InsufficientCreditsDialog({
  open,
  onOpenChange,
  currentCredits,
  requiredCredits,
  generationMode,
  onUpgrade,
}: InsufficientCreditsDialogProps) {
  const { t } = useTranslation();
  const missingCredits = Math.max(requiredCredits - currentCredits, 0);
  const modeLabel =
    generationMode === "video"
      ? t("generate.modeVideo")
      : t("generate.modeImage");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(calc(100vw-1.5rem),31rem)] overflow-hidden rounded-[2rem] border border-white/70 bg-white p-0 text-foreground shadow-[0_28px_90px_rgba(15,23,42,0.22)] [&>button]:right-5 [&>button]:top-5 [&>button]:z-30 [&>button]:border [&>button]:border-white/70 [&>button]:bg-white/80 [&>button]:backdrop-blur-md">
        <div className="relative isolate overflow-hidden px-6 pb-6 pt-7 sm:px-7">
          <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-sky-300/35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-24 h-56 w-56 rounded-full bg-primary/18 blur-3xl" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/80 to-transparent" />

          <div className="relative">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-200/70 bg-sky-50/90 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-sky-700 shadow-sm">
              <Zap className="h-3.5 w-3.5" strokeWidth={2.8} />
              {t("generate.insufficientCreditsModal.badge")}
            </div>

            <DialogTitle className="max-w-[18rem] font-display text-3xl font-bold leading-[0.95] tracking-tight text-slate-950 sm:text-4xl">
              {t("generate.insufficientCreditsModal.title")}
            </DialogTitle>
            <DialogDescription className="mt-3 max-w-sm text-sm font-medium leading-6 text-slate-600">
              {t("generate.insufficientCreditsModal.description", {
                mode: modeLabel.toLowerCase(),
              })}
            </DialogDescription>

            <div className="mt-6 grid grid-cols-3 gap-2.5">
              <div className="rounded-2xl border border-slate-200/80 bg-white/75 p-3 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  {t("generate.insufficientCreditsModal.current")}
                </p>
                <p className="mt-2 flex items-baseline gap-1 font-display text-2xl font-bold text-slate-950">
                  {currentCredits}
                  <span className="text-xs font-bold text-slate-400">
                    cr.
                  </span>
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/75 p-3 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  {t("generate.insufficientCreditsModal.required")}
                </p>
                <p className="mt-2 flex items-baseline gap-1 font-display text-2xl font-bold text-slate-950">
                  {requiredCredits}
                  <span className="text-xs font-bold text-slate-400">
                    cr.
                  </span>
                </p>
              </div>
              <div className="rounded-2xl border border-sky-200/90 bg-sky-50/80 p-3 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-sky-500">
                  {t("generate.insufficientCreditsModal.missing")}
                </p>
                <p className="mt-2 flex items-baseline gap-1 font-display text-2xl font-bold text-sky-700">
                  {missingCredits}
                  <span className="text-xs font-bold text-sky-400">
                    cr.
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200/80 bg-slate-950 p-4 text-white shadow-[0_18px_45px_rgba(15,23,42,0.22)]">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-950">
                  <Coins className="h-5 w-5" strokeWidth={2.7} />
                </div>
                <div>
                  <p className="text-sm font-bold">
                    {t("generate.insufficientCreditsModal.planHintTitle")}
                  </p>
                  <p className="mt-1 text-xs font-medium leading-5 text-white/68">
                    {t("generate.insufficientCreditsModal.planHintDescription")}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                onClick={onUpgrade}
                className="group h-12 flex-1 rounded-full bg-slate-950 text-sm font-bold text-white shadow-[0_14px_35px_rgba(15,23,42,0.20)] hover:brightness-110"
              >
                <Sparkles className="h-4 w-4 text-sky-300" strokeWidth={2.7} />
                {t("generate.insufficientCreditsModal.cta")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={2.7} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="h-12 rounded-full px-5 text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                {t("generate.insufficientCreditsModal.secondaryCta")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
