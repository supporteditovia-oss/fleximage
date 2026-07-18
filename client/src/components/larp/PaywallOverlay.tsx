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
    featureKeys: ["photo", "realistic", "hd", "history", "support"],
  },
  {
    id: "essential",
    euros: "19",
    cents: "90",
    bonusKey: "essentialBonus",
    featureKeys: ["photo", "marketRealism", "details", "prioritySupport"],
  },
  {
    id: "ultimate",
    euros: "39",
    cents: "90",
    featureKeys: ["photo", "indistinguishable", "ulDetails", "immersion", "vipSupport"],
  },
];

const commonPlanFeatureKeys = ["instantCredits", "monthlyRenewal"];

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
      toast({
        variant: "destructive",
        title: t("common.messages.error"),
        description: t("paywall.checkoutError"),
      });
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        variant: "destructive",
        title: t("common.messages.error"),
        description:
          error instanceof Error && error.message
            ? error.message
            : t("paywall.checkoutError"),
      });
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
    ? "paywall-credits-cta-border group relative isolate mt-5 flex w-full transform-gpu cursor-pointer select-none items-center justify-center overflow-visible rounded-full lx-btn-gold py-3.5 text-sm font-bold tracking-tight transition-[filter,opacity,box-shadow] disabled:cursor-not-allowed disabled:opacity-70"
    : "group relative flex w-full transform-gpu cursor-pointer select-none items-center justify-center overflow-hidden rounded-full lx-btn-gold py-3.5 text-sm font-bold tracking-tight disabled:cursor-not-allowed disabled:opacity-70";
  const ctaIconClassName = isInsufficientCredits
    ? "h-4 w-4 text-[#1a1408]"
    : "h-4 w-4 text-[#1a1408]";
  const shouldShowAccountMenu = presentation === "overlay";
  const accountMenu = shouldShowAccountMenu ? (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t("layout.dock.account")}
            className="fixed right-5 top-[calc(1.5rem+clamp(2rem,6svh,2.5rem)/2-1rem)] z-[120] flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--lx-gold)]/35 bg-[var(--lx-surface-2)]/90 text-[var(--lx-muted)] shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-[var(--lx-ink)] md:right-8 md:top-[calc(1.5rem+clamp(2.25rem,6svh,4rem)/2-1rem)]"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="z-[130] min-w-[220px] rounded-xl border border-[var(--lx-gold)]/30 bg-[var(--lx-surface-2)]/95 p-1.5 shadow-2xl shadow-black/20 backdrop-blur-xl"
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
    const bulletClassName = "flex min-w-0 items-start gap-2";
    const mobileHiddenBulletClassName = "hidden min-w-0 items-start gap-2 md:flex";
    const visibleMobilePlanFeatureCount = selectedPlanCard.bonusKey ? 3 : 4;

    return (
      <>
        {accountMenu}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className={
            isModalPresentation
              ? "relative flex min-h-0 w-full flex-1 flex-col overflow-hidden text-[var(--lx-ink)]"
              : "fixed inset-0 z-[101] flex min-h-0 w-full flex-col overflow-y-auto text-[var(--lx-ink)]"
          }
        >
          {/* Landing-like atmosphere */}
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden
            style={{
              background:
                "linear-gradient(160deg, #ffffff 0%, #f5f0e8 42%, #ebe4d8 100%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-90"
            aria-hidden
            style={{
              background:
                "radial-gradient(ellipse 75% 50% at 50% -5%, rgba(201,162,39,0.18) 0%, transparent 58%)",
            }}
          />

          <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-4 py-4 md:px-6 md:py-6">
            {/* Header */}
            <header
              className={
                isModalPresentation
                  ? "shrink-0 pb-4 pt-2 text-center sm:px-8"
                  : "shrink-0 pb-5 pt-1 text-center"
              }
            >
              <h2 className="lx-display text-balance text-2xl font-semibold leading-[1.15] tracking-tight text-[var(--lx-ink)] md:text-4xl">
                {t("paywall.pricingTitle")}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-snug text-[var(--lx-muted)] md:text-base">
                {t("paywall.pricingSubtitle")}
              </p>
            </header>

            {/* Plan cards */}
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="grid shrink-0 grid-cols-3 items-stretch gap-2.5 md:gap-4">
                {planCards.map((plan) => {
                  const isSelected = selectedPlan === plan.id;
                  const isEssential = plan.id === "essential";

                  return (
                    <div key={plan.id} className="relative pt-3">
                      {isEssential && (
                        <span className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-[var(--lx-gold)]/55 bg-[linear-gradient(135deg,#1a1408_0%,#2a2214_100%)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--lx-gold-soft)] shadow-[0_4px_14px_rgba(18,16,14,0.25)] md:px-3 md:text-[10px]">
                          {t("paywall.planBadges.recommended")}
                        </span>
                      )}
                      <motion.button
                        type="button"
                        onClick={() => setSelectedPlan(plan.id)}
                        whileTap={{ scale: 0.98 }}
                        className={`relative flex h-full min-h-[8.25rem] w-full flex-col justify-between overflow-hidden rounded-2xl p-3 text-left transition-all md:min-h-[10.5rem] md:p-5 ${
                          isEssential ? "paywall-essential-card-border isolate" : ""
                        } ${
                          isSelected
                            ? "border border-[var(--lx-gold)] bg-white shadow-[0_16px_40px_rgba(18,16,14,0.12),0_0_0_1px_rgba(201,162,39,0.2)]"
                            : "border border-black/8 bg-[var(--lx-surface-2)]/90 shadow-[0_8px_24px_rgba(18,16,14,0.05)] hover:border-[var(--lx-gold)]/35 hover:bg-white/90"
                        }`}
                      >
                        <div>
                          <h3 className="lx-display text-[13px] font-semibold leading-none text-[var(--lx-ink)] md:text-xl">
                            {t(`paywall.plans.${plan.id}.name`)}
                          </h3>
                          <p className="mt-1.5 text-[10px] font-semibold text-[var(--lx-muted)] line-through md:text-xs">
                            {t(`paywall.plans.${plan.id}.oldPrice`)}
                          </p>
                        </div>

                        <div className="mt-3 flex items-end gap-0.5 md:mt-4 md:gap-1">
                          <span className="lx-display text-[2rem] font-semibold leading-[0.85] text-[var(--lx-ink)] md:text-5xl">
                            {plan.euros}
                          </span>
                          <span className="pb-0.5 text-[12px] font-bold leading-none text-[var(--lx-bronze)] md:pb-1.5 md:text-lg">
                            {plan.cents}
                          </span>
                          <span className="pb-0.5 text-[9px] font-bold leading-none text-[var(--lx-muted)] md:pb-1.5 md:text-sm">
                            {t("paywall.currency")}
                          </span>
                          <span className="hidden pb-1.5 text-sm font-semibold leading-none text-[var(--lx-muted)] md:inline">
                            {t("paywall.perMonthShort")}
                          </span>
                        </div>
                      </motion.button>
                    </div>
                  );
                })}
              </div>

              {/* Features panel */}
              <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-2xl border border-black/6 bg-[var(--lx-surface-2)]/95 p-4 shadow-[0_10px_30px_rgba(18,16,14,0.06)] md:mt-6 md:flex-none md:p-6">
                <p className="lx-display text-base font-semibold text-[var(--lx-ink)] md:text-lg">
                  {t(`paywall.plans.${selectedPlanCard.id}.name`)}
                </p>
                <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[10px] font-medium leading-snug text-[var(--lx-muted)] min-[390px]:text-[11px] md:mt-4 md:gap-x-8 md:gap-y-3 md:text-sm">
                  <li className={bulletClassName}>
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--lx-gold)]" strokeWidth={2.75} />
                    <span>{t(`paywall.plans.${selectedPlanCard.id}.creditsPerMonth`)}</span>
                  </li>
                  <li className={bulletClassName}>
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--lx-gold)]" strokeWidth={2.75} />
                    <span>{t("paywall.generationCosts")}</span>
                  </li>
                  {selectedPlanCard.bonusKey && (
                    <li className={bulletClassName}>
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--lx-gold)]" strokeWidth={2.75} />
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
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--lx-gold)]" strokeWidth={2.75} />
                      <span>{t(`paywall.planFeatures.${feature}`)}</span>
                    </li>
                  ))}
                  {commonPlanFeatureKeys.map((feature) => (
                    <li key={feature} className={mobileHiddenBulletClassName}>
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--lx-gold)]" strokeWidth={2.75} />
                      <span>{t(`paywall.planFeatures.${feature}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Footer CTA */}
            <footer className="mx-auto mt-4 flex w-full shrink-0 flex-col items-center gap-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:mt-6">
              <motion.button
                onClick={handleSubscribe}
                disabled={isLoading}
                whileTap={!isLoading ? { scale: 0.97, y: 1 } : undefined}
                className="lx-btn-gold group relative flex min-h-12 w-full max-w-md items-center justify-center overflow-hidden rounded-full px-8 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70 md:min-h-14 md:text-base"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("common.actions.redirecting")}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    {t("paywall.checkoutCta")}
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-1"
                      strokeWidth={2.75}
                    />
                  </span>
                )}
              </motion.button>

              <p className="flex items-center justify-center gap-1.5 text-center text-[11px] font-medium leading-tight text-[var(--lx-muted)]">
                <Lock className="h-3 w-3 text-[var(--lx-gold)]" strokeWidth={2.5} />
                {t("paywall.securePayment")}
              </p>
            </footer>
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
