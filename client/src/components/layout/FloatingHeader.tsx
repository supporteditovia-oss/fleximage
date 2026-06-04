import * as React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { PaywallOverlay } from "@/components/larp/PaywallOverlay";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentPlan, type CurrentPlanType } from "@/hooks/use-billing";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import { createPortalSession } from "@/lib/stripe";
import { useToast } from "@/hooks/use-toast";
import { CalendarClock, CreditCard, Crown, Loader2 } from "lucide-react";
import { CreditsTokenIcon } from "@/components/icons/CreditsTokenIcon";

interface FloatingHeaderProps {
  variant?: "landing" | "app";
}

export default function FloatingHeader({ variant = "landing" }: FloatingHeaderProps) {
  const { user, profile, isLoading } = useAuth();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [hidden, setHidden] = React.useState(false);
  const [creditsOpen, setCreditsOpen] = React.useState(false);
  const [creditsPaywallOpen, setCreditsPaywallOpen] = React.useState(false);
  const [portalLoading, setPortalLoading] = React.useState(false);
  const lastScrollY = React.useRef(0);
  const {
    data: plan,
    isFetching: isPlanFetching,
    refetch: refetchCurrentPlan,
  } = useCurrentPlan({ enabled: variant === "app" && !!user });

  React.useEffect(() => {
    if (!isMobile) return;
    const onScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastScrollY.current && currentY > 60) {
        setHidden(true);
      } else if (currentY < lastScrollY.current) {
        setHidden(false);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMobile]);

  // Hide header when virtual keyboard opens on mobile
  React.useEffect(() => {
    if (!isMobile || !window.visualViewport) return;

    const vv = window.visualViewport;
    const onResize = () => {
      const keyboardOpen = vv.height < window.innerHeight * 0.75;
      setHidden(keyboardOpen);
    };

    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, [isMobile]);

  const logoHref = variant === "app" ? "/generate" : "/";
  const displayedCredits = plan?.credits ?? profile?.credits ?? 0;
  const hasKnownCreditBalance =
    typeof plan?.credits === "number" || typeof profile?.credits === "number";
  const isCreditBalanceEmpty = hasKnownCreditBalance && displayedCredits <= 0;
  const hasActiveSubscription = Boolean(
    plan?.isSubscriber || profile?.is_subscriber || profile?.role === "admin",
  );
  const shouldOpenPaywallFromCredits = Boolean(user && !hasActiveSubscription);
  const planType = (plan?.planType ?? "free") as CurrentPlanType;
  const planLabels: Record<CurrentPlanType, string> = {
    free: t("billing.plans.free"),
    admin: t("billing.plans.admin"),
    unknown: t("billing.plans.unknown"),
    discovery: t("billing.plans.discovery"),
    essential: t("billing.plans.essential"),
    ultimate: t("billing.plans.ultimate"),
  };
  const statusLabel = plan?.cancelAtPeriodEnd
    ? t("billing.status.cancelAtPeriodEnd")
    : t(`billing.status.${plan?.subscriptionStatus || "inactive"}`, {
        defaultValue: plan?.subscriptionStatus || t("billing.status.inactive"),
      });
  const periodEndLabel = plan?.currentPeriodEnd
    ? new Intl.DateTimeFormat(i18n.resolvedLanguage ?? "fr", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(plan.currentPeriodEnd))
    : null;

  React.useEffect(() => {
    if (creditsOpen && variant === "app" && user) {
      void refetchCurrentPlan();
    }
  }, [creditsOpen, refetchCurrentPlan, user, variant]);

  const handleCreditsOpenChange = (open: boolean) => {
    if (open && shouldOpenPaywallFromCredits) {
      setCreditsOpen(false);
      setCreditsPaywallOpen(true);
      return;
    }

    setCreditsOpen(open);
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const returnPath = window.location.pathname === "/generate" ? "/generate" : "/settings";
      const url = await createPortalSession(returnPath);
      if (url) {
        window.location.href = url;
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.messages.error"),
        description: error.message,
      });
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className={`floating-header fixed top-6 left-0 right-0 z-50 px-5 md:px-8 pointer-events-none transition-all duration-300 ${
      hidden ? "-translate-y-24 opacity-0" : "translate-y-0 opacity-100"
    }`}>
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="relative flex w-full flex-col items-center justify-center gap-2 md:flex-row md:gap-0"
      >
        {/* Logo — centered */}
        <Link
          href={logoHref}
          className="pointer-events-auto flex max-w-[42vw] shrink min-w-0 cursor-pointer hover:opacity-80 transition-opacity sm:max-w-[36vw] md:max-w-[260px]"
        >
          <img
            src="/assets/larpking.png"
            alt="LarpKing"
            className="h-[clamp(2rem,6svh,2.5rem)] w-auto max-w-full object-contain md:h-[clamp(2.25rem,6svh,4rem)]"
          />
        </Link>

        {variant === "landing" && user && !isLoading && (
          <Link href="/app" className="pointer-events-auto md:hidden">
            <Button
              size="sm"
              className="rounded-full px-4 text-xs font-semibold border-0 shadow-none active:scale-95 transition-transform"
            >
              {t("layout.header.app")}
            </Button>
          </Link>
        )}

        {/* Right side */}
        {variant === "app" ? (
          <>
          <Popover open={creditsOpen} onOpenChange={handleCreditsOpenChange}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`floating-header-credits absolute right-0 flex items-center gap-1.5 rounded-full border border-border/80 bg-white/85 px-3 py-1.5 text-sm font-semibold text-foreground shadow-sm shadow-black/10 backdrop-blur-xl transition hover:bg-white pointer-events-auto ${
                  isCreditBalanceEmpty ? "credits-zero-attention" : ""
                }`}
                aria-label={t("billing.openCreditsMenu")}
              >
                <CreditsTokenIcon className="h-5 w-5" />
                <span className="tabular-nums" aria-live="polite">
                  {displayedCredits}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={8}
              className="w-[min(calc(100vw-2rem),22rem)] overflow-hidden rounded-lg border-border/80 bg-white/95 p-0 shadow-xl shadow-black/10 backdrop-blur-xl"
            >
              <div className="border-b border-border/60 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  {t("billing.creditsTitle")}
                </p>
                <div className="mt-2 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <CreditsTokenIcon className="h-7 w-7" />
                    <span className="font-display text-3xl font-bold leading-none">
                      {displayedCredits}
                    </span>
                  </div>
                  {isPlanFetching && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>

              <div className="space-y-3 px-4 py-3">
                <div className="flex items-start gap-3">
                  <Crown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{planLabels[planType]}</p>
                    <p className="text-xs text-muted-foreground">{statusLabel}</p>
                  </div>
                </div>

                {plan?.creditsPerCycle !== null && plan?.creditsPerCycle !== undefined && (
                  <div className="flex items-start gap-3">
                    <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground">
                      {t("billing.creditsPerCycle", {
                        credits: plan.creditsPerCycle,
                        interval: t(`billing.intervals.${plan.billingInterval || "month"}`),
                      })}
                    </p>
                  </div>
                )}

                {periodEndLabel && (
                  <div className="flex items-start gap-3">
                    <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground">
                      {plan?.cancelAtPeriodEnd
                        ? t("billing.endsOn", { date: periodEndLabel })
                        : t("billing.renewsOn", { date: periodEndLabel })}
                    </p>
                  </div>
                )}

                {plan?.canManageSubscription && (
                  <Button
                    type="button"
                    onClick={handleManageSubscription}
                    disabled={portalLoading}
                    className="mt-1 h-10 w-full rounded-full"
                  >
                    {portalLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("common.actions.redirecting")}
                      </span>
                    ) : (
                      t("billing.manage")
                    )}
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
          <Dialog open={creditsPaywallOpen} onOpenChange={setCreditsPaywallOpen}>
            <DialogContent className="flex max-h-[min(92svh,720px)] w-[min(calc(100vw-1.5rem),68rem)] max-w-none flex-col overflow-y-auto rounded-2xl border border-border/70 bg-white p-0 shadow-2xl [&>button]:right-4 [&>button]:top-4 [&>button]:z-30 [&>button]:border [&>button]:border-border/60 [&>button]:bg-white">
              <DialogTitle className="sr-only">{t("paywall.chooseTitle")}</DialogTitle>
              <PaywallOverlay
                imageUrl=""
                initialChoosingPlan
                presentation="modal"
              />
            </DialogContent>
          </Dialog>
          </>
        ) : !isLoading && (
          <div
            className={`absolute right-0 flex items-center justify-end gap-2 sm:gap-3 pointer-events-auto ${
              user ? "hidden md:flex" : ""
            }`}
          >
            {user ? (
              <Link href="/app">
                <Button size="sm" className="rounded-full px-4 sm:px-5 text-xs sm:text-sm font-semibold border-0 shadow-none active:scale-95 transition-transform">
                  {t("layout.header.app")}
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full h-8 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm text-muted-foreground hover:text-foreground"
                  >
                    {t("layout.header.login")}
                  </Button>
                </Link>
                <Link href="/register">
                  <Button
                    size="sm"
                    className="hidden sm:flex rounded-full px-5 text-sm font-semibold border-0 bg-primary shadow-none transition-transform active:scale-95 hover:opacity-90"
                  >
                    {t("layout.header.start")}
                  </Button>
                </Link>
              </>
            )}
          </div>
        )}
      </motion.header>
    </div>
  );
}
