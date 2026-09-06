import * as React from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "wouter";
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
import { useAuth } from "@/hooks/use-auth";
import { useCurrentPlan, type CurrentPlanType } from "@/hooks/use-billing";
import { useTranslation } from "react-i18next";
import { createPortalSession } from "@/lib/stripe";
import { ZeroCreditsModal } from "@/components/generate/ZeroCreditsModal";
import { formatCredits, formatShortDate } from "@/lib/format-locale";
import { useToast } from "@/hooks/use-toast";
import { CalendarClock, CreditCard, Crown, Gem, Loader2 } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { StudioModeSwitch } from "@/components/v2/StudioModeSwitch";
import {
  createPathForUser,
  readStudioMode,
  writeStudioMode,
  type StudioMode,
} from "@/lib/v2-experience";
import { useV2Access } from "@/hooks/use-v2-access";
interface FloatingHeaderProps {
  variant?: "landing" | "app";
}

export default function FloatingHeader({ variant = "landing" }: FloatingHeaderProps) {
  const [location] = useLocation();
  const { user, profile, isAdmin, isLoading } = useAuth();
  const { v2Enabled } = useV2Access();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [creditsOpen, setCreditsOpen] = React.useState(false);
  const [creditsPaywallOpen, setCreditsPaywallOpen] = React.useState(false);
  const [zeroCreditsOpen, setZeroCreditsOpen] = React.useState(false);
  const [portalLoading, setPortalLoading] = React.useState(false);
  const [studioMode, setStudioMode] = React.useState<StudioMode>(() => readStudioMode());
  const [chromeHidden, setChromeHidden] = React.useState(false);
  const [hideAppChrome, setHideAppChrome] = React.useState(false);
  const {
    data: plan,
    isFetching: isPlanFetching,
    refetch: refetchCurrentPlan,
  } = useCurrentPlan({ enabled: variant === "app" && !!user });

  React.useEffect(() => {
    const syncMode = () => setStudioMode(readStudioMode());
    syncMode();
    window.addEventListener("luxeflexia:studio-mode", syncMode);
    window.addEventListener("storage", syncMode);
    return () => {
      window.removeEventListener("luxeflexia:studio-mode", syncMode);
      window.removeEventListener("storage", syncMode);
    };
  }, []);

  React.useEffect(() => {
    const syncChrome = () => {
      setHideAppChrome(document.body.hasAttribute("data-hide-app-chrome"));
      setChromeHidden(
        document.body.hasAttribute("data-fullscreen-overlay") ||
          document.body.hasAttribute("data-larp-result-mode") ||
          document.body.hasAttribute("data-paywall-overlay") ||
          document.body.hasAttribute("data-hide-app-chrome"),
      );
    };
    syncChrome();
    const observer = new MutationObserver(syncChrome);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: [
        "data-fullscreen-overlay",
        "data-larp-result-mode",
        "data-paywall-overlay",
        "data-hide-app-chrome",
      ],
    });
    return () => observer.disconnect();
  }, []);

  const pathname = location.split("?")[0] || location;
  const isModelesPage = pathname === "/modeles" || pathname.startsWith("/modeles/");
  const isCreateStudio = variant === "app" && pathname === "/create";

  const handleStudioModeChange = (next: StudioMode) => {
    if (chromeHidden) return;
    writeStudioMode(next);
  };
  const v2Ready = !isLoading && v2Enabled;
  const logoHref = variant === "app" ? createPathForUser(v2Ready) : "/";
  const displayedCredits = plan?.credits ?? profile?.credits ?? 0;
  const creditsLabel = React.useMemo(
    () => formatCredits(displayedCredits, i18n.resolvedLanguage),
    [displayedCredits, i18n.resolvedLanguage],
  );
  const hasKnownCreditBalance =
    typeof plan?.credits === "number" || typeof profile?.credits === "number";
  const isCreditBalanceEmpty = hasKnownCreditBalance && displayedCredits <= 0;
  const hasActiveSubscription = Boolean(
    plan?.isSubscriber || profile?.is_subscriber,
  );
  const shouldOpenPaywallFromCredits = Boolean(
    user && !hasActiveSubscription && !isAdmin,
  );
  const rawPlanType = plan?.planType ?? "free";
  const planType = (
    ["free", "admin", "unknown", "discovery", "essential", "ultimate"].includes(
      rawPlanType,
    )
      ? rawPlanType
      : "unknown"
  ) as CurrentPlanType;
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
    ? formatShortDate(plan.currentPeriodEnd, i18n.resolvedLanguage)
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
      void import("@/lib/snap-pixel").then(({ trackSnapStartCheckout }) => {
        trackSnapStartCheckout();
      });
      return;
    }

    if (open && hasActiveSubscription && !isAdmin && isCreditBalanceEmpty) {
      setCreditsOpen(false);
      setZeroCreditsOpen(true);
      return;
    }

    setCreditsOpen(open);
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const studioPath = createPathForUser(v2Enabled);
      const path = window.location.pathname;
      const returnPath =
        path === studioPath || path === "/generate" || path === "/create"
          ? studioPath
          : "/settings";
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

  if (location === "/admin/studio" || hideAppChrome || isModelesPage) {
    return null;
  }

  const headerNode = (
    <div className="floating-header pointer-events-none">
      <header className="relative flex min-h-10 w-full items-center justify-end gap-2 sm:gap-3 md:min-h-11">
        <Link
          href={logoHref}
          className="pointer-events-auto absolute left-1/2 top-1/2 z-10 flex max-w-[calc(100%-7.5rem)] -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center hover:opacity-80 transition-opacity"
        >
          <span className="lx-display inline-flex max-w-full items-center gap-1.5 sm:gap-2">
            <Gem
              className="h-5 w-5 shrink-0 text-[var(--lx-gold)] md:h-6 md:w-6"
              strokeWidth={1.75}
              aria-hidden
            />
            <BrandMark className="min-w-0 truncate text-base font-semibold tracking-tight text-[var(--lx-ink)] sm:text-xl md:text-2xl" />
          </span>
        </Link>

        {variant === "landing" && user && !isLoading && (
          <Link
            href="/app"
            className="pointer-events-auto shrink-0 md:hidden"
          >
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
                className={`floating-header-credits pointer-events-auto relative z-20 ml-auto flex max-w-[46%] shrink-0 items-center gap-1 rounded-lg border border-[var(--lx-gold)]/35 bg-[var(--lx-surface-2)]/90 px-2.5 py-1.5 text-sm font-semibold text-[var(--lx-ink)] shadow-sm backdrop-blur-xl transition hover:bg-white sm:max-w-none sm:gap-1.5 sm:px-3 ${
                  isCreditBalanceEmpty ? "credits-zero-attention" : ""
                }`}
                aria-label={t("billing.openCreditsMenu")}
                title={creditsLabel}
              >
                <Gem
                  className="h-4 w-4 shrink-0 text-[var(--lx-gold)] sm:h-5 sm:w-5"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <span className="min-w-0 truncate tabular-nums" aria-live="polite">
                  {creditsLabel}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={8}
              className="w-[min(calc(100vw-2rem),15.5rem)] overflow-hidden rounded-lg border-border/80 bg-white/95 p-0 shadow-xl shadow-black/10 backdrop-blur-xl"
            >
              <div className="border-b border-border/60 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {t("billing.creditsTitle")}
                </p>
                <div className="mt-1.5 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Gem
                      className="h-6 w-6 shrink-0 text-[var(--lx-gold)]"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <span className="lx-display truncate text-2xl font-bold leading-none tabular-nums">
                      {formatCredits(displayedCredits, i18n.resolvedLanguage)}
                    </span>
                  </div>
                  {isPlanFetching && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>

              <div className="space-y-2 px-3 py-2.5">
                <div className="flex items-start gap-2.5">
                  <Crown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold leading-tight">{planLabels[planType]}</p>
                    <p className="text-[11px] leading-tight text-muted-foreground">{statusLabel}</p>
                  </div>
                </div>

                {plan?.creditsPerCycle !== null && plan?.creditsPerCycle !== undefined && (
                  <div className="flex items-start gap-2.5">
                    <CreditCard className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <p className="text-[11px] font-medium leading-snug text-muted-foreground">
                      {t("billing.creditsPerCycle", {
                        credits: plan.creditsPerCycle,
                        interval: t(`billing.intervals.${plan.billingInterval || "month"}`),
                      })}
                    </p>
                  </div>
                )}

                {periodEndLabel && (
                  <div className="flex items-start gap-2.5">
                    <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <p className="text-[11px] font-medium leading-snug text-muted-foreground">
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
                    className="lx-btn-gold mt-0.5 h-9 w-full rounded-full text-xs font-semibold"
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
            <DialogContent className="flex max-h-[min(92svh,720px)] w-[min(calc(100vw-1.5rem),68rem)] max-w-none flex-col overflow-y-auto rounded-2xl border border-[var(--lx-gold)]/35 bg-[var(--lx-surface-2)] p-0 shadow-2xl [&>button]:right-4 [&>button]:top-4 [&>button]:z-30 [&>button]:border [&>button]:border-[var(--lx-gold)]/30 [&>button]:bg-white">
              <DialogTitle className="sr-only">{t("paywall.chooseTitle")}</DialogTitle>
              <PaywallOverlay
                imageUrl=""
                initialChoosingPlan
                presentation="modal"
              />
            </DialogContent>
          </Dialog>
          <ZeroCreditsModal
            open={zeroCreditsOpen}
            onOpenChange={setZeroCreditsOpen}
            plan={plan}
          />
          </>
        ) : !isLoading && (
          <div
            className={`ml-auto flex shrink-0 items-center justify-end gap-2 sm:gap-3 pointer-events-auto ${
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
      </header>

      {isCreateStudio && !chromeHidden ? (
        <div className="floating-header__modes pointer-events-auto flex justify-center pt-2">
          <StudioModeSwitch
            mode={studioMode}
            onChange={handleStudioModeChange}
            size="compact"
          />
        </div>
      ) : null}
    </div>
  );

  if (typeof document === "undefined") return headerNode;
  return createPortal(headerNode, document.body);
}
