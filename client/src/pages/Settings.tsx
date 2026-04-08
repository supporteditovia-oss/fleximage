import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-supabase";
import { authFetch } from "@/lib/api";
import { setAppLanguage } from "@/i18n";
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
  CreditCard,
  ChevronRight,
  X,
  Languages,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";
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
  const { user, profile, signOut } = useAuth();
  const { updateOwnProfile, deleteProfile, isDeleting } = useProfile();
  const { toast } = useToast();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

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
      const res = await authFetch("/api/stripe/create-portal", {
        method: "POST",
      });
      const { url } = await res.json();
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
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
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
    <div className="space-y-10 pt-20 max-w-lg mx-auto">
      {/* Page title */}
      <h1 className="font-display text-2xl md:text-3xl font-bold text-center w-full">
        <span className="relative inline-block">
          {t("settings.title")}
          <svg
            className="pointer-events-none absolute left-0 right-0 mx-auto bottom-[-0.25em] md:bottom-[-0.35em] w-full h-[0.3em] md:h-[0.34em] text-primary/50"
            viewBox="0 0 100 12"
            fill="none"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M2 8 Q 50 2 98 8"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </h1>

      {/* Profile section */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground/70 uppercase tracking-wider px-1">
          {t("settings.sections.profile")}
        </h2>
        <div className="rounded-2xl border border-border/40 bg-card/90 backdrop-blur overflow-hidden divide-y divide-border/30">
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
                      className="text-xs text-primary hover:text-primary font-semibold shrink-0 h-auto py-1 px-2"
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
                                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
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
                      className="text-xs text-primary hover:text-primary font-semibold shrink-0 h-auto py-1 px-2"
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

      {/* Subscription section */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground/70 uppercase tracking-wider px-1">
          {t("settings.sections.subscription")}
        </h2>
        <div className="rounded-2xl border border-border/40 bg-card/90 backdrop-blur overflow-hidden divide-y divide-border/30">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Crown className="w-4.5 h-4.5 text-muted-foreground/60 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{t("settings.subscription.title")}</p>
              <p className="text-[11px] text-muted-foreground/50">
                {profile?.is_subscriber
                  ? t("settings.subscription.price")
                  : t("settings.subscription.noneActive")}
              </p>
            </div>
            {profile?.is_subscriber ? (
              <span className="text-xs font-semibold text-green-400 bg-green-400/10 px-2.5 py-1 rounded-full">
                {t("common.states.active")}
              </span>
            ) : profile?.stripe_customer_id ? (
              <span className="text-xs font-semibold text-orange-400 bg-orange-400/10 px-2.5 py-1 rounded-full">
                {t("common.states.canceled")}
              </span>
            ) : (
              <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                {t("common.states.inactive")}
              </span>
            )}
          </div>

          {(profile?.is_subscriber || profile?.stripe_customer_id) && (
            <button
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="flex items-center gap-3 w-full px-4 py-3.5 text-left hover:bg-muted/30 transition-colors disabled:opacity-70"
            >
              <CreditCard className="w-4.5 h-4.5 text-muted-foreground/60 shrink-0" />
              <span className="flex-1 text-sm font-medium">
                {portalLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {t("common.actions.redirecting")}
                  </span>
                ) : profile?.is_subscriber ? (
                  t("settings.subscription.manage")
                ) : (
                  t("settings.subscription.reactivate")
                )}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
            </button>
          )}
        </div>
      </section>

      {/* Account actions */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground/70 uppercase tracking-wider px-1">
          {t("settings.sections.account")}
        </h2>
        <div className="rounded-2xl border border-border/40 bg-card/90 backdrop-blur overflow-hidden divide-y divide-border/30">
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

      {/* Legal footer */}
      <p className="text-center text-[11px] text-muted-foreground/40 pb-4">
        {t("common.privacy.gdpr")}
      </p>
    </div>
  );
}
