import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-supabase";
import { useCurrentPlan } from "@/hooks/use-billing";
import {
  fetchFaceCaptureAssetBlob,
  useDeleteLatestFaceCapture,
  useLatestFaceCapture,
} from "@/hooks/use-face-captures";
import { createPortalSession } from "@/lib/stripe";
import { PaywallOverlay } from "@/components/larp/PaywallOverlay";
import { setAppLanguage } from "@/i18n";
import {
  FACE_CAPTURE_POSES,
  hasCompleteFaceCapture,
} from "@/lib/face-capture-generation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProfileSchema } from "@shared/schema";
import { SUPPORTED_LOCALES, type AppLocale } from "@shared/locales";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  AlertTriangle,
  LogOut,
  Trash2,
  User,
  Mail,
  Crown,
  ChevronRight,
  X,
  Languages,
  ScanFace,
  RefreshCw,
  Check,
  Headphones,
  MessageCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";

export default function Settings() {
  const [location, navigate] = useLocation();
  const { user, profile, signOut } = useAuth();
  const { updateOwnProfile, deleteProfile, isDeleting } = useProfile();
  const { toast } = useToast();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const { data: currentPlan } = useCurrentPlan({ enabled: !!profile?.id });
  const latestFaceCapture = useLatestFaceCapture();
  const deleteLatestFaceCapture = useDeleteLatestFaceCapture();
  const [facePreviewUrls, setFacePreviewUrls] = useState<string[]>([]);
  const [facePreviewLoading, setFacePreviewLoading] = useState(false);
  const [facePreviewError, setFacePreviewError] = useState<string | null>(null);
  const faceCaptureReady = hasCompleteFaceCapture(latestFaceCapture.data);

  const subscriptionPrice = (() => {
    if (!currentPlan) return t("settings.subscription.price");
    if (currentPlan.planType === "admin") return t("billing.plans.admin");
    if (currentPlan.planType === "unknown") return t("billing.plans.unknown");
    if (currentPlan.planType === "ultimate") {
      return t("settings.subscription.ultimatePrice");
    }
    if (
      currentPlan.planType === "essential"
    ) {
      return t("settings.subscription.essentialPrice");
    }
    if (currentPlan.planType === "discovery") {
      return t("settings.subscription.discoveryPrice");
    }
    return t("settings.subscription.discoveryPrice");
  })();
  const billingActive = Boolean(currentPlan?.isSubscriber);
  const canManageBilling = Boolean(currentPlan?.canManageSubscription);
  const billingCanceled = !billingActive && canManageBilling;
  const canOpenPaywall = Boolean(profile?.id && !billingActive && !canManageBilling);

  const form = useForm({
    resolver: zodResolver(
      insertProfileSchema.pick({
        full_name: true,
        preferred_locale: true,
      }),
    ),
    defaultValues: {
      full_name: profile?.full_name || "",
      preferred_locale: profile?.preferred_locale || "fr",
    },
  });

  useEffect(() => {
    form.reset({
      full_name: profile?.full_name || "",
      preferred_locale: profile?.preferred_locale || "fr",
    });
  }, [form, profile?.full_name, profile?.preferred_locale]);

  useEffect(() => {
    let cancelled = false;

    setFacePreviewError(null);

    if (!faceCaptureReady) {
      setFacePreviewUrls((previousUrls) => {
        previousUrls.forEach((url) => URL.revokeObjectURL(url));
        return [];
      });
      setFacePreviewLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setFacePreviewLoading(true);
    const captures = latestFaceCapture.data?.session?.captures ?? [];
    const orderedCaptures = FACE_CAPTURE_POSES.map((poseId) =>
      captures.find((capture) => capture.poseId === poseId),
    );

    Promise.all(
      orderedCaptures.map(async (capture) => {
        if (!capture) throw new Error("FACE_CAPTURE_REQUIRED");
        const blob = await fetchFaceCaptureAssetBlob(capture.imageUrl);
        return URL.createObjectURL(blob);
      }),
    )
      .then((urls) => {
        if (cancelled) {
          urls.forEach((url) => URL.revokeObjectURL(url));
          return;
        }

        setFacePreviewUrls((previousUrls) => {
          previousUrls.forEach((url) => URL.revokeObjectURL(url));
          return urls;
        });
      })
      .catch(() => {
        if (!cancelled) {
          setFacePreviewError(t("settings.faceScan.loadError"));
          setFacePreviewUrls((previousUrls) => {
            previousUrls.forEach((url) => URL.revokeObjectURL(url));
            return [];
          });
        }
      })
      .finally(() => {
        if (!cancelled) setFacePreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [faceCaptureReady, latestFaceCapture.data?.session?.id, t]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("faceScan") !== "review") return;
    window.history.replaceState({}, "", "/settings");
    void latestFaceCapture.refetch();
    toast({
      title: t("settings.faceScan.updatedTitle"),
      description: t("settings.faceScan.updatedDescription"),
    });
  }, [latestFaceCapture, location, t, toast]);

  useEffect(() => {
    return () => {
      facePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [facePreviewUrls]);

  const onSubmit = async (data: {
    full_name: string | null;
    preferred_locale: AppLocale;
  }) => {
    if (!user) return;
    try {
      await updateOwnProfile({
        full_name: data.full_name,
        preferred_locale: data.preferred_locale,
      });
      setAppLanguage(data.preferred_locale);
      toast({
        title: t("settings.profile.updatedTitle"),
        description: t("settings.profile.updatedDescription"),
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.messages.error"),
        description: error.message,
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    if (profile?.is_subscriber) {
      toast({
        variant: "destructive",
        title: t("common.messages.requiredAction"),
        description: t("settings.deleteDialog.subscriberActionDescription"),
      });
      return;
    }

    if (deleteConfirmText !== "SUPPRIMER") {
      toast({
        variant: "destructive",
        title: t("common.messages.validationIncorrect"),
        description: t("settings.deleteDialog.validationDescription"),
      });
      return;
    }

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

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const url = await createPortalSession("/settings");
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

  const handleSubscriptionAction = () => {
    if (canManageBilling) {
      void handleManageSubscription();
      return;
    }

    if (canOpenPaywall) {
      setPaywallOpen(true);
    }
  };

  const handleRetakeFaceScan = () => {
    navigate("/face-capture?returnTo=settings");
  };

  const handleDeleteFaceScan = async () => {
    try {
      await deleteLatestFaceCapture.mutateAsync();
      setFacePreviewUrls((previousUrls) => {
        previousUrls.forEach((url) => URL.revokeObjectURL(url));
        return [];
      });
      toast({
        title: t("settings.faceScan.deletedTitle"),
        description: t("settings.faceScan.deletedDescription"),
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.messages.error"),
        description: error.message,
      });
    }
  };

  const openSupportChat = () => {
    window.$crisp?.push(["do", "chat:open"]);
  };

  const deleteDialogBody = (
    <div className="space-y-4">
      <p className="font-medium text-foreground">
        {t("settings.deleteDialog.question")}
      </p>
      {profile?.is_subscriber ? (
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
          {t("settings.deleteDialog.subscriberWarning")}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {t("settings.deleteDialog.irreversibleText")}
          </p>
          <div className="space-y-2">
            <Label
              htmlFor="confirm-delete"
              className="text-xs font-bold uppercase text-muted-foreground"
            >
              {t("settings.deleteDialog.confirmLabel")}
            </Label>
            <Input
              id="confirm-delete"
              placeholder={t("settings.deleteDialog.confirmPlaceholder")}
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="border-destructive/30 focus-visible:ring-destructive"
            />
          </div>
        </>
      )}
      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          className="flex-1 rounded-full border-border/40"
          onClick={() => {
            setDeleteOpen(false);
            setDeleteConfirmText("");
          }}
        >
          {t("common.actions.cancel")}
        </Button>
        {!profile?.is_subscriber && (
          <Button
            onClick={handleDeleteAccount}
            disabled={deleteConfirmText !== "SUPPRIMER" || isDeleting}
            className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full border-0"
          >
            {isDeleting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {t("common.actions.delete")}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pt-10 max-w-lg mx-auto">
      {/* Page title */}
      <h1 className="lx-display w-full text-center text-2xl font-semibold tracking-tight text-[var(--lx-ink)] md:text-3xl">
        <span className="decoration-[var(--lx-gold)]/40 underline decoration-2 underline-offset-4 sm:decoration-4">
          {t("settings.title")}
        </span>
      </h1>

      {/* Profile section */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground/70 uppercase px-1">
          {t("settings.sections.profile")}
        </h2>
        <div className="overflow-hidden divide-y divide-[var(--lx-ink)]/8 rounded-xl border border-[var(--lx-gold)]/35 bg-[var(--lx-surface-2)]/95 backdrop-blur">
          {/* Name field */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 px-4 py-3.5 space-y-0">
                    <User className="w-4.5 h-4.5 text-muted-foreground/60 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <FormControl>
                        <Input
                          placeholder={t("settings.profile.namePlaceholder")}
                          {...field}
                          value={field.value ?? ""}
                          className="border-0 bg-transparent px-0 h-auto text-sm font-medium placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </FormControl>
                      <FormMessage className="text-xs mt-0.5" />
                    </div>
                    <Button
                      type="submit"
                      size="sm"
                      variant="ghost"
                      disabled={
                        form.formState.isSubmitting || !form.formState.isDirty
                      }
                      className="text-xs text-foreground hover:text-foreground font-semibold shrink-0 h-auto py-1 px-2"
                    >
                      {form.formState.isSubmitting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        t("common.actions.save")
                      )}
                    </Button>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferred_locale"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 px-4 py-3.5 space-y-0">
                    <Languages className="w-4.5 h-4.5 text-muted-foreground/60 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) =>
                            field.onChange(value as AppLocale)
                          }
                        >
                          <SelectTrigger className="h-10 w-full rounded-xl border border-border/50 bg-background/50 px-3 text-sm font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all hover:border-primary/40 focus:ring-2 focus:ring-primary/20 focus:ring-offset-0 data-[state=open]:border-primary/50 data-[state=open]:bg-background/70">
                            <SelectValue
                              placeholder={t("settings.language.currentLabel")}
                            />
                          </SelectTrigger>
                          <SelectContent
                            align="start"
                            className="rounded-xl border border-border/60 bg-popover/95 p-1.5 backdrop-blur-xl shadow-2xl shadow-black/40"
                          >
                            {SUPPORTED_LOCALES.map((locale) => (
                              <SelectItem
                                key={locale}
                                value={locale}
                                className="rounded-lg py-2 pl-9 pr-3 text-sm font-medium focus:bg-primary/10 focus:text-foreground data-[state=checked]:bg-primary/15 data-[state=checked]:text-primary"
                              >
                                <span className="flex w-full items-center justify-between gap-3">
                                  <span>
                                    {t(`settings.language.options.${locale}`)}
                                  </span>
                                  <span className="text-[10px] uppercase text-muted-foreground/70">
                                    {locale}
                                  </span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage className="mt-0.5 text-xs" />
                    </div>
                    <Button
                      type="submit"
                      size="sm"
                      variant="ghost"
                      disabled={
                        form.formState.isSubmitting || !form.formState.isDirty
                      }
                      className="text-xs text-foreground hover:text-foreground font-semibold shrink-0 h-auto py-1 px-2"
                    >
                      {form.formState.isSubmitting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        t("common.actions.save")
                      )}
                    </Button>
                  </FormItem>
                )}
              />
            </form>
          </Form>

          {/* Email — read only */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Mail className="w-4.5 h-4.5 text-muted-foreground/60 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.email || "—"}
              </p>
              <p className="text-[11px] text-muted-foreground/50">
                {t("settings.profile.emailImmutable")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Face scan section */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground/70 uppercase px-1">
          {t("settings.sections.faceScan")}
        </h2>
        <div className="overflow-hidden rounded-xl border border-[var(--lx-gold)]/35 bg-[var(--lx-surface-2)]/95 backdrop-blur">
          <div className="flex items-center gap-4 px-4 py-3.5">
            {(facePreviewLoading || latestFaceCapture.isLoading || facePreviewUrls.length > 0) && (
              <div className="relative flex h-24 w-36 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-muted/40">
                {facePreviewLoading || latestFaceCapture.isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                <>
                  <div className="grid h-full w-full grid-cols-3">
                    {facePreviewUrls.map((url, index) => (
                      <img
                        key={url}
                        src={url}
                        alt={t("settings.faceScan.previewAlt")}
                        className={`h-full w-full object-cover ${
                          index > 0 ? "border-l border-white/70" : ""
                        }`}
                      />
                    ))}
                  </div>
                  <span className="absolute right-1 top-1 inline-flex h-4.5 w-4.5 items-center justify-center rounded-full bg-white/90 text-[#42a5f6] shadow-sm backdrop-blur">
                    <Check className="h-3 w-3" />
                  </span>
                </>
                )}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {faceCaptureReady
                  ? t("settings.faceScan.readyTitle")
                  : t("settings.faceScan.emptyTitle")}
              </p>
              <p className="mt-1 line-clamp-2 text-xs leading-4 text-muted-foreground/60">
                {facePreviewError ??
                  (faceCaptureReady
                    ? t("settings.faceScan.readyDescription")
                    : t("settings.faceScan.emptyDescription"))}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              {faceCaptureReady ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleRetakeFaceScan}
                    disabled={deleteLatestFaceCapture.isPending}
                    size="sm"
                    className="h-9 w-9 rounded-full p-0 text-foreground/80 shadow-none hover:bg-muted hover:text-foreground"
                    title={t("settings.faceScan.retake")}
                    aria-label={t("settings.faceScan.retake")}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleDeleteFaceScan}
                    disabled={deleteLatestFaceCapture.isPending}
                    size="sm"
                    className="h-9 w-9 rounded-full p-0 text-destructive/80 shadow-none hover:bg-destructive/10 hover:text-destructive"
                    title={t("settings.faceScan.delete")}
                    aria-label={t("settings.faceScan.delete")}
                  >
                    {deleteLatestFaceCapture.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleRetakeFaceScan}
                  disabled={deleteLatestFaceCapture.isPending}
                  size="sm"
                  className="h-9 shrink-0 gap-1.5 rounded-full px-2.5 text-xs font-semibold text-foreground/80 shadow-none hover:bg-muted hover:text-foreground"
                  title={t("settings.faceScan.createFaceScan")}
                  aria-label={t("settings.faceScan.createFaceScan")}
                >
                  <ScanFace className="h-4 w-4" />
                  <span>{t("settings.faceScan.scan")}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Subscription section */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground/70 uppercase px-1">
          {t("settings.sections.subscription")}
        </h2>
        <div className="overflow-hidden rounded-xl border border-[var(--lx-gold)]/35 bg-[var(--lx-surface-2)]/95 backdrop-blur">
          <button
            type="button"
            onClick={handleSubscriptionAction}
            disabled={portalLoading || (!canManageBilling && !canOpenPaywall)}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/30 disabled:cursor-default disabled:hover:bg-transparent"
          >
            <Crown className="w-4.5 h-4.5 text-muted-foreground/60 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{t("settings.subscription.title")}</p>
              <p className="text-[11px] text-muted-foreground/50">
                {billingActive
                  ? subscriptionPrice
                  : t("settings.subscription.noneActive")}
              </p>
            </div>
            {billingActive ? (
              <span className="text-xs font-semibold text-[#42a5f6] bg-[#42a5f6]/10 px-2.5 py-1 rounded-full">
                {t("common.states.active")}
              </span>
            ) : billingCanceled ? (
              <span className="text-xs font-semibold text-orange-400 bg-orange-400/10 px-2.5 py-1 rounded-full">
                {t("common.states.canceled")}
              </span>
            ) : (
              <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                {t("common.states.inactive")}
              </span>
            )}
            {portalLoading ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground/50" />
            ) : (canManageBilling || canOpenPaywall) ? (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
            ) : null}
          </button>
        </div>
      </section>

      {/* Support section */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground/70 uppercase px-1">
          {t("layout.dock.support")}
        </h2>
        <div className="overflow-hidden rounded-xl border border-[var(--lx-gold)]/35 bg-[var(--lx-surface-2)]/95 backdrop-blur">
          <button
            type="button"
            onClick={openSupportChat}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/30"
          >
            <Headphones className="w-4.5 h-4.5 text-muted-foreground/60 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t("support.settingsTitle")}</p>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-muted-foreground/60">
                {t("support.settingsDescription")}
              </p>
            </div>
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <MessageCircle className="h-4 w-4" />
            </span>
          </button>
        </div>
      </section>

      {/* Account actions */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground/70 uppercase px-1">
          {t("settings.sections.account")}
        </h2>
        <div className="overflow-hidden divide-y divide-[var(--lx-ink)]/8 rounded-xl border border-[var(--lx-gold)]/35 bg-[var(--lx-surface-2)]/95 backdrop-blur">
          {/* Sign out */}
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 w-full px-4 py-3.5 text-left hover:bg-muted/30 transition-colors"
          >
            <LogOut className="w-4.5 h-4.5 text-muted-foreground/60 shrink-0" />
            <span className="flex-1 text-sm font-medium">{t("common.actions.signOut")}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
          </button>

          {/* Delete account */}
          <button
            onClick={() => setDeleteOpen(true)}
            className="flex items-center gap-3 w-full px-4 py-3.5 text-left hover:bg-destructive/5 transition-colors"
          >
            <Trash2 className="w-4.5 h-4.5 text-destructive/60 shrink-0" />
            <span className="flex-1 text-sm font-medium text-destructive/80">
              {t("settings.account.deleteAccount")}
            </span>
            <ChevronRight className="w-4 h-4 text-destructive/30" />
          </button>
        </div>
      </section>

      {/* Delete account — Drawer on mobile, Dialog on desktop */}
      {isMobile ? (
        <Drawer
          open={deleteOpen}
          onOpenChange={(open) => {
            setDeleteOpen(open);
            if (!open) setDeleteConfirmText("");
          }}
        >
          <DrawerContent>
            <div className="relative">
              <button
                onClick={() => {
                  setDeleteOpen(false);
                  setDeleteConfirmText("");
                }}
                className="absolute top-0 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <DrawerHeader className="text-center">
                <DrawerTitle className="flex items-center justify-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  {t("settings.deleteDialog.title")}
                </DrawerTitle>
                <DrawerDescription>
                  {t("settings.deleteDialog.description")}
                </DrawerDescription>
              </DrawerHeader>
            </div>
            <div className="px-4 pb-6 pt-2">{deleteDialogBody}</div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog
          open={deleteOpen}
          onOpenChange={(open) => {
            setDeleteOpen(open);
            if (!open) setDeleteConfirmText("");
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                {t("settings.deleteDialog.title")}
              </DialogTitle>
              <DialogDescription>
                {t("settings.deleteDialog.description")}
              </DialogDescription>
            </DialogHeader>
            {deleteDialogBody}
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={paywallOpen} onOpenChange={setPaywallOpen}>
        <DialogContent className="flex max-h-[min(92svh,720px)] w-[min(calc(100vw-1.5rem),68rem)] max-w-none flex-col overflow-hidden rounded-2xl border border-[var(--lx-gold)]/35 bg-[var(--lx-surface-2)] p-0 shadow-2xl [&>button]:right-4 [&>button]:top-4 [&>button]:z-30 [&>button]:border [&>button]:border-[var(--lx-gold)]/30 [&>button]:bg-white">
          <PaywallOverlay
            imageUrl=""
            defaultPlan="essential"
            initialChoosingPlan
            presentation="modal"
          />
        </DialogContent>
      </Dialog>

      {/* Legal footer */}
      <p className="text-center text-[11px] text-muted-foreground/40 pb-4">
        {t("common.privacy.gdpr")}
      </p>
    </div>
  );
}
