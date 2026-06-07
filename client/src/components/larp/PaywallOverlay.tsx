import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Loader2,
  Lock,
  LogOut,
  MoreHorizontal,
  Trash2,
  Unlock,
} from "lucide-react";
import { authFetch } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-supabase";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type PaywallPlan = "discovery" | "essential" | "ultimate";
export type PaywallGenerationMode = "image" | "video";

type PlanCard = {
  id: PaywallPlan;
  euros: string;
  cents: string;
  bonusKey?: string;
  featureKeys: string[];
};

const planCards: PlanCard[] = [
  {
    id: "discovery",
    euros: "8",
    cents: "90",
    featureKeys: ["photo", "realistic", "video", "hd", "history", "support"],
  },
  {
    id: "essential",
    euros: "19",
    cents: "90",
    bonusKey: "essentialBonus",
    featureKeys: ["photo", "marketRealism", "details", "video", "prioritySupport"],
  },
  {
    id: "ultimate",
    euros: "39",
    cents: "90",
    featureKeys: ["photo", "indistinguishable", "video", "ulDetails", "immersion", "vipSupport"],
  },
];

const commonPlanFeatureKeys = ["instantCredits", "monthlyRenewal"];

const socialProofAvatars = [
  { initial: "C", className: "bg-[radial-gradient(circle_at_30%_25%,#93c5fd,#2563eb_58%,#1e3a8a)]" },
  { initial: "M", className: "bg-[radial-gradient(circle_at_30%_25%,#f0abfc,#c026d3_58%,#701a75)]" },
  { initial: "Y", className: "bg-[radial-gradient(circle_at_30%_25%,#86efac,#16a34a_58%,#14532d)]" },
  { initial: "N", className: "bg-[radial-gradient(circle_at_30%_25%,#fdba74,#ea580c_58%,#7c2d12)]" },
];

interface PaywallOverlayProps {
  imageUrl: string;
  isFake?: boolean;
  defaultPlan?: PaywallPlan;
  initialChoosingPlan?: boolean;
  presentation?: "overlay" | "modal";
  variant?: "default" | "insufficientCredits";
  generationMode?: PaywallGenerationMode;
}

export function PaywallOverlay({
  imageUrl,
  isFake,
  defaultPlan = "essential",
  initialChoosingPlan = false,
  presentation = "overlay",
  variant = "default",
  generationMode = "image",
}: PaywallOverlayProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isChoosingPlan, setIsChoosingPlan] = useState(initialChoosingPlan);
  const [selectedPlan, setSelectedPlan] = useState<PaywallPlan>(defaultPlan);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { deleteProfile, isDeleting } = useProfile();
  const { toast } = useToast();

  useEffect(() => {
    setSelectedPlan(defaultPlan);
    setIsChoosingPlan(initialChoosingPlan);
    setIsLoading(false);
  }, [defaultPlan, imageUrl, initialChoosingPlan]);

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch("/api/stripe/create-checkout", {
        method: "POST",
        body: JSON.stringify({ plan: selectedPlan }),
      });
      const { url } = await res.json();
      if (url) {
        window.location.href = url;
        return;
      }
    } catch (error) {
      console.error("Checkout error:", error);
    }
    setIsLoading(false);
  };

  const handlePrimaryAction = () => {
    if (!isChoosingPlan) {
      setIsChoosingPlan(true);
      return;
    }

    void handleSubscribe();
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) return;

    try {
      await deleteProfile(user.id);
      toast({
        title: t("settings.deleteDialog.deletedTitle"),
        description: t("settings.deleteDialog.deletedDescription"),
      });
      await signOut();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.messages.error"),
        description: error.message,
      });
    }
  };

  const isInsufficientCredits = variant === "insufficientCredits";
  const isVideo = generationMode === "video";
  const overlaySubtitle = isInsufficientCredits
    ? t("generate.insufficientCreditsTitle")
    : t(isVideo ? "paywall.subtitleVideo" : "paywall.subtitleImage");
  const overlayTitle = isInsufficientCredits
    ? t("generate.insufficientCreditsDescription")
    : t(isVideo ? "paywall.titleVideo" : "paywall.titleImage");
  const primaryCta = isInsufficientCredits
    ? t("paywall.creditsCta")
    : t(isVideo ? "paywall.unlockCtaVideo" : "paywall.unlockCtaImage");
  const textBlockClassName = isInsufficientCredits
    ? "absolute left-6 right-6 top-[48%] z-20 flex flex-col items-center text-center"
    : "absolute bottom-[116px] left-6 right-6 z-20 flex flex-col items-center text-center";
  const lockClassName = isInsufficientCredits
    ? "absolute left-1/2 top-[34%] z-20 -translate-x-1/2 -translate-y-1/2"
    : "absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2";
  const ctaClassName = isInsufficientCredits
    ? "paywall-credits-cta-border group relative isolate mt-5 flex w-full transform-gpu cursor-pointer select-none items-center justify-center overflow-visible rounded-lg bg-white py-3.5 text-sm font-bold tracking-tight text-slate-950 shadow-[0_10px_28px_rgba(15,23,42,0.16)] transition-[filter,opacity,box-shadow] hover:brightness-105 hover:shadow-[0_12px_32px_rgba(15,23,42,0.20)] active:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
    : "group relative flex w-full transform-gpu cursor-pointer select-none items-center justify-center overflow-hidden rounded-lg bg-primary py-3.5 text-sm font-bold tracking-tight text-primary-foreground ring-1 ring-primary/70 transition-[filter,opacity] hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-70";
  const ctaIconClassName = isInsufficientCredits
    ? "h-4 w-4 text-slate-950"
    : "h-4 w-4";
  const shouldShowAccountMenu = presentation === "overlay";
  const accountMenu = shouldShowAccountMenu ? (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t("layout.dock.account")}
            className="fixed right-5 top-[calc(1.5rem+clamp(2rem,6svh,2.5rem)/2-1rem)] z-[120] flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-card/90 text-muted-foreground/70 shadow-sm backdrop-blur transition-colors hover:bg-muted/30 hover:text-foreground md:right-8 md:top-[calc(1.5rem+clamp(2.25rem,6svh,4rem)/2-1rem)]"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="z-[130] min-w-[220px] rounded-xl border-border/80 bg-white/95 p-1.5 shadow-2xl shadow-black/20 backdrop-blur-xl"
        >
          <DropdownMenuItem
            onClick={() => void signOut()}
            className="rounded-lg px-3 py-2.5 font-medium"
          >
            <LogOut className="h-4 w-4" />
            {t("common.actions.signOut")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setDeleteDialogOpen(true);
            }}
            className="rounded-lg px-3 py-2.5 font-medium text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            {t("settings.account.deleteAccount")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="z-[140] w-[calc(100vw-2rem)] max-w-sm rounded-2xl border-border/80 bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.deleteDialog.irreversibleText")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="mt-0 rounded-full">
              {t("common.actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteAccount();
              }}
              disabled={isDeleting}
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("common.actions.delete")}
                </span>
              ) : (
                t("common.actions.delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  ) : null;

  if (isChoosingPlan) {
    const isModalPresentation = presentation === "modal";
    const selectedPlanCard =
      planCards.find((plan) => plan.id === selectedPlan) ?? planCards[0];
    const shellClassName = isModalPresentation
      ? "flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-white text-foreground"
      : "flex h-full min-h-0 w-full flex-col overflow-visible px-3 py-3 text-foreground md:px-4 md:py-4";
    const innerClassName =
      "mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col";
    const headerClassName = isModalPresentation
      ? "shrink-0 px-4 pb-2 pt-3 text-center sm:px-14"
      : "flex shrink-0 flex-col gap-2 px-1 pb-2 text-center";
    const gridWrapperClassName =
      "flex min-h-0 flex-1 flex-col overflow-hidden px-1 pb-2 md:flex-none md:items-center md:justify-start md:overflow-visible md:px-0 md:pt-7";
    const gridClassName =
      "grid w-full shrink-0 grid-cols-3 items-end gap-2 pt-7 md:max-w-[720px] md:gap-3 md:pt-0";
    const footerClassName =
      isModalPresentation
        ? "mx-auto flex w-full max-w-[720px] shrink-0 flex-col items-center justify-center gap-2 border-t border-border/50 bg-white/95 px-1 pt-3 backdrop-blur-sm pb-[max(1rem,env(safe-area-inset-bottom))]"
        : "mx-auto flex w-full max-w-[720px] shrink-0 flex-col items-center justify-center gap-2 px-1 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]";
    const bulletClassName = "flex min-w-0 gap-1.5";
    const mobileHiddenBulletClassName = "hidden min-w-0 gap-1.5 md:flex";
    const visibleMobilePlanFeatureCount = selectedPlanCard.bonusKey ? 3 : 4;

    return (
      <>
        {accountMenu}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className={shellClassName}
        >
          <div className={innerClassName}>
            <div className={headerClassName}>
              <div>
                <h2 className="font-display text-xl font-bold leading-tight text-center text-foreground md:text-3xl">
                  <span className="text-primary decoration-primary/30 underline decoration-2 underline-offset-4 sm:decoration-4">
                    {t("paywall.pricingTitle")}
                  </span>
                </h2>
              </div>
            </div>

            <div className={gridWrapperClassName}>
              <div className={gridClassName}>
            {planCards.map((plan) => {
              const isSelected = selectedPlan === plan.id;

              return (
                <div
                  key={plan.id}
                  className="relative"
                >
                  {plan.id === "essential" && (
                    <span className="pointer-events-none absolute left-1/2 top-0 z-20 hidden -translate-x-1/2 -translate-y-1/2 rounded-full border border-foreground/15 bg-foreground px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-background shadow-sm md:inline-flex">
                      {t("paywall.planBadges.recommended")}
                    </span>
                  )}
                <motion.button
                  type="button"
                  onClick={() => setSelectedPlan(plan.id)}
                  whileTap={{ scale: 0.985 }}
                  className={`relative flex w-full flex-col overflow-hidden rounded-lg p-2.5 text-left transition-all md:p-3 ${
                    plan.id === "essential"
                      ? "min-h-[7.75rem] md:min-h-[9.5rem] md:pt-4"
                      : "min-h-[7.5rem] md:min-h-[9.25rem]"
                  } ${
                    plan.id === "essential" ? "paywall-essential-card-border isolate border-0" : ""
                  } ${
                    isSelected
                      ? plan.id === "essential"
                        ? "bg-white shadow-[0_18px_45px_rgba(0,0,0,0.10)]"
                        : "border border-foreground/80 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_18px_45px_rgba(0,0,0,0.10)]"
                      : plan.id === "essential"
                        ? "bg-muted/25 hover:bg-muted/40"
                        : "border border-border/70 bg-muted/25 hover:border-foreground/25 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5 md:gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-[13px] font-bold leading-none md:text-lg">
                        {t(`paywall.plans.${plan.id}.name`)}
                      </h3>
                      <p className="mt-1 text-[10px] font-semibold text-muted-foreground line-through">
                        {t(`paywall.plans.${plan.id}.oldPrice`)}
                      </p>
                    </div>

                  </div>

                  <div className="mt-2 flex items-end gap-0.5 md:mt-3 md:gap-1">
                    <span className="font-display text-[1.9rem] font-bold leading-[0.86] tracking-normal md:text-4xl">
                      {plan.euros}
                    </span>
                    <span className="pb-0.5 text-[11px] font-bold leading-none text-muted-foreground md:pb-1 md:text-base">
                      {plan.cents}
                    </span>
                    <span className="pb-0.5 text-[9px] font-bold leading-none text-muted-foreground md:pb-1 md:text-xs">
                      {t("paywall.currency")}
                    </span>
                    <span className="hidden pb-1 text-xs font-bold leading-none text-muted-foreground md:inline">
                      {t("paywall.perMonthShort")}
                    </span>
                  </div>

                </motion.button>
                </div>
              );
            })}
              </div>
              <div className="mt-4 min-h-[8.5rem] w-full flex-1 overflow-hidden px-1 py-2 md:mt-6 md:min-h-0 md:max-w-[720px] md:flex-none md:overflow-visible md:px-1 md:py-0">
                <p className="text-sm font-bold text-foreground">
                  {t(`paywall.plans.${selectedPlanCard.id}.name`)}
                </p>
                <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[10px] font-semibold leading-tight text-foreground/78 min-[390px]:text-[11px] md:gap-x-8 md:gap-y-3 md:text-xs">
                  <li className={bulletClassName}>
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" strokeWidth={3} />
                    <span>{t(`paywall.plans.${selectedPlanCard.id}.creditsPerMonth`)}</span>
                  </li>
                  <li className={bulletClassName}>
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" strokeWidth={3} />
                    <span>{t("paywall.generationCosts")}</span>
                  </li>
                  {selectedPlanCard.bonusKey && (
                    <li className={bulletClassName}>
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" strokeWidth={3} />
                      <span>{t(`paywall.planBonuses.${selectedPlanCard.bonusKey}`)}</span>
                    </li>
                  )}
                  {selectedPlanCard.featureKeys.map((feature, index) => (
                    <li
                      key={feature}
                      className={
                        index < visibleMobilePlanFeatureCount
                          ? bulletClassName
                          : mobileHiddenBulletClassName
                      }
                    >
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" strokeWidth={3} />
                      <span>{t(`paywall.planFeatures.${feature}`)}</span>
                    </li>
                  ))}
                  {commonPlanFeatureKeys.map((feature) => (
                    <li key={feature} className={mobileHiddenBulletClassName}>
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" strokeWidth={3} />
                      <span>{t(`paywall.planFeatures.${feature}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className={footerClassName}>
              <div className="flex items-center justify-center gap-2.5 text-center">
                <div className="flex shrink-0 -space-x-2" aria-hidden="true">
                  {socialProofAvatars.map((avatar) => (
                    <span
                      key={avatar.initial}
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-black text-white shadow-sm ${avatar.className}`}
                    >
                      {avatar.initial}
                    </span>
                  ))}
                </div>
                <p className="min-w-0 text-[11px] font-bold leading-tight text-muted-foreground sm:text-xs">
                  {t("paywall.socialProof")}
                </p>
              </div>
              <motion.button
                onClick={handleSubscribe}
                disabled={isLoading}
                whileTap={!isLoading ? { scale: 0.97, y: 1 } : undefined}
                className="group relative flex min-h-11 w-full items-center justify-center overflow-hidden rounded-lg bg-foreground px-7 text-sm font-bold text-background ring-1 ring-foreground/20 transition-[filter,opacity] hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-70 md:min-h-12 md:px-10 md:text-base"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("common.actions.redirecting")}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    {t("paywall.checkoutCta")}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={3} />
                  </span>
                )}
              </motion.button>
              <p className="flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold leading-tight text-muted-foreground/65">
                <Lock className="h-3 w-3" strokeWidth={2.6} />
                {t("paywall.securePayment")}
              </p>
            </div>
          </div>
        </motion.div>
      </>
    );
  }
  return (
    <div className="relative mx-auto aspect-[9/16] h-[min(78svh,640px)] w-auto max-w-[92vw] self-center overflow-hidden rounded-lg shadow-xl md:h-[min(82svh,720px)]">
      {accountMenu}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={t("paywall.imageAlt")}
          className={`absolute inset-0 h-full w-full origin-center object-cover ${
            isFake ? "scale-125 blur-[24px] brightness-50" : ""
          }`}
        />
      ) : (
        <div
          className="absolute inset-0 h-full w-full"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--primary) / 0.15) 0%, hsl(var(--background)) 40%, hsl(var(--muted)) 70%, hsl(var(--primary) / 0.1) 100%)",
            filter: "blur(30px) brightness(0.5)",
            transform: "scale(1.25)",
          }}
        />
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent via-30% to-black/90" />

      <div className={lockClassName}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
          className="flex h-20 w-20 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur-md"
        >
          <Lock className="h-10 w-10" strokeWidth={2.8} />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut", delay: 0.16 }}
        className={textBlockClassName}
      >
        <p className="mb-1 text-center text-[13px] font-bold text-white/75">
          {overlaySubtitle}
        </p>
        <h2 className="text-center font-display text-[22px] font-bold leading-tight text-white">
          {overlayTitle}
        </h2>
        {isInsufficientCredits && (
          <motion.button
            onClick={handlePrimaryAction}
            disabled={isLoading}
            whileTap={!isLoading ? { scale: 0.95, y: 1 } : undefined}
            className={`${ctaClassName} ${
              !isLoading ? "paywall-cta-pulse" : ""
            }`}
          >
            <span className="paywall-cta-label-stable relative z-10 flex items-center justify-center gap-2">
              <Unlock className={ctaIconClassName} strokeWidth={3} />
              {primaryCta}
            </span>
          </motion.button>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
        className="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center p-4 pt-2"
      >
        {!isInsufficientCredits && (
          <motion.button
            onClick={handlePrimaryAction}
            disabled={isLoading}
            whileTap={!isLoading ? { scale: 0.95, y: 1 } : undefined}
            className={`${ctaClassName} ${
              !isLoading ? "paywall-cta-pulse" : ""
            }`}
          >
            <span className="paywall-cta-label-stable flex items-center justify-center gap-2">
              <Unlock className={ctaIconClassName} strokeWidth={3} />
              {primaryCta}
            </span>
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}
