import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Loader2, Eye, EyeOff, Gem, Check, Circle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { translateSupabaseError } from "@/lib/error-translator";
import { useTranslation } from "react-i18next";
import { BrandMark } from "@/components/BrandMark";
import { AUTH_CONFIG } from "@/config/auth";
import "./landing.css";

const PASSWORD_RULES = [
  {
    id: "length",
    labelKey: "auth.passwordRules.minLength",
    test: (p: string) => p.length >= 6,
  },
  {
    id: "uppercase",
    labelKey: "auth.passwordRules.uppercase",
    test: (p: string) => /[A-Z]/.test(p),
  },
  {
    id: "number",
    labelKey: "auth.passwordRules.number",
    test: (p: string) => /[0-9]/.test(p),
  },
  {
    id: "special",
    labelKey: "auth.passwordRules.special",
    test: (p: string) => /[^A-Za-z0-9]/.test(p),
  },
];

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      const search = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const code = search.get("code");
      const type = search.get("type") || hash.get("type");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error && import.meta.env.DEV) {
          console.warn("[auth] reset exchangeCodeForSession:", error.message);
        }
        window.history.replaceState({}, "", "/reset-password");
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      const recoveryOk =
        Boolean(data.session) ||
        type === "recovery" ||
        sessionStorage.getItem("luxeflexia:password_recovery") === "1";

      if (!recoveryOk) {
        setInvalid(true);
        setReady(true);
        return;
      }

      sessionStorage.setItem("luxeflexia:password_recovery", "1");
      setInvalid(false);
      setReady(true);
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const ruleStates = PASSWORD_RULES.map((rule) => ({
    ...rule,
    met: rule.test(password),
  }));
  const passwordRequirementsMet = ruleStates.every((rule) => rule.met);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordRequirementsMet) {
      toast({
        variant: "destructive",
        title: t("auth.passwordRequirementsTitle"),
        description: t("auth.passwordRequirementsDescription"),
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      sessionStorage.removeItem("luxeflexia:password_recovery");
      toast({
        title: t("auth.resetSuccessTitle"),
        description: t("auth.resetSuccessDescription"),
      });
      setLocation(AUTH_CONFIG.REDIRECT_PATH);
    } catch (error: unknown) {
      const translated = translateSupabaseError(error);
      toast({
        variant: "destructive",
        title: translated.title,
        description: translated.description,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="luxeflexia-landing lx-auth relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "linear-gradient(160deg, #ffffff 0%, #f5f0e8 48%, #ebe6df 100%)",
        }}
      />

      <Link
        href="/"
        className="relative z-10 mb-4 inline-flex items-center gap-2 transition-opacity hover:opacity-80"
        aria-label={t("landing.header.homeAria")}
      >
        <Gem
          className="h-6 w-6 shrink-0 text-[var(--lx-gold)]"
          strokeWidth={1.75}
          aria-hidden
        />
        <BrandMark className="text-2xl font-semibold tracking-tight text-[var(--lx-ink)] md:text-3xl" />
      </Link>
      <div className="relative z-10 w-full max-w-md">
        <div className="lx-auth-card rounded-2xl border border-[var(--lx-gold)]/45 bg-[var(--lx-surface-2)]/95 p-8 shadow-[0_20px_50px_rgba(18,16,14,0.1)] backdrop-blur-sm md:p-10">
          {!ready ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--lx-gold)]" />
            </div>
          ) : invalid ? (
            <div className="space-y-4 text-center">
              <h1 className="lx-display text-2xl font-semibold tracking-tight text-[var(--lx-ink)]">
                {t("auth.resetInvalidTitle")}
              </h1>
              <p className="text-sm text-[var(--lx-muted)]">
                {t("auth.resetInvalidDescription")}
              </p>
              <button
                type="button"
                className="lx-btn-gold mt-2 h-11 w-full rounded-full text-sm font-semibold"
                onClick={() => setLocation("/login")}
              >
                {t("auth.forgotBack")}
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8 text-center">
                <h1 className="lx-display text-2xl font-semibold tracking-tight text-[var(--lx-ink)] md:text-3xl">
                  {t("auth.resetTitle")}
                </h1>
                <p className="mt-2 text-sm font-medium text-[var(--lx-muted)]">
                  {t("auth.resetSubtitle")}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="new-password"
                    className="text-xs font-semibold uppercase tracking-wide text-[var(--lx-muted)]"
                  >
                    {t("auth.fields.newPassword")}
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="h-11 rounded-lg border-[var(--lx-ink)]/12 bg-white pr-10 text-[var(--lx-ink)] focus-visible:ring-[var(--lx-gold)]"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--lx-muted)] hover:text-[var(--lx-ink)]"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <ul className="space-y-1.5 pt-1" aria-live="polite">
                    {ruleStates.map((rule) => (
                      <li
                        key={rule.id}
                        className={`flex items-center gap-2 text-xs ${
                          rule.met
                            ? "text-[var(--lx-bronze)]"
                            : "text-[var(--lx-muted)]"
                        }`}
                      >
                        {rule.met ? (
                          <Check
                            className="h-3.5 w-3.5 shrink-0 text-[var(--lx-gold)]"
                            strokeWidth={2.5}
                          />
                        ) : (
                          <Circle
                            className="h-3.5 w-3.5 shrink-0 opacity-50"
                            strokeWidth={2}
                          />
                        )}
                        <span>{t(rule.labelKey)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="submit"
                  className="lx-btn-gold flex h-11 w-full items-center justify-center rounded-full text-sm font-semibold disabled:opacity-60"
                  disabled={isLoading}
                >
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {t("auth.resetSubmit")}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
