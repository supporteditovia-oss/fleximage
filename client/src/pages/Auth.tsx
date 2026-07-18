import { useState } from "react";
import { useLocation, Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, Gem, Check, Circle } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { translateSupabaseError } from "@/lib/error-translator";
import { getAuthRedirectTo } from "@/lib/auth-redirect";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_LOCALE,
  resolvePreferredLocale,
  SIGNUP_LOCALE_STORAGE_KEY,
} from "@shared/locales";
import "./landing.css";

type PasswordRule = {
  id: string;
  labelKey: string;
  test: (password: string) => boolean;
};

const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "length",
    labelKey: "auth.passwordRules.minLength",
    test: (p) => p.length >= 6,
  },
  {
    id: "uppercase",
    labelKey: "auth.passwordRules.uppercase",
    test: (p) => /[A-Z]/.test(p),
  },
  {
    id: "number",
    labelKey: "auth.passwordRules.number",
    test: (p) => /[0-9]/.test(p),
  },
  {
    id: "special",
    labelKey: "auth.passwordRules.special",
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
];

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t, i18n } = useTranslation();

  const isLogin = location === "/login";

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const getSignupLocale = () =>
    resolvePreferredLocale(
      i18n.resolvedLanguage ?? window.navigator.language,
      DEFAULT_LOCALE,
    );

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "", color: "bg-[var(--lx-surface)]" };
    if (pass.length < 6)
      return {
        score: 1,
        label: t("auth.strength.short"),
        color: "bg-red-500",
      };

    let score = 1;
    if (pass.length > 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2)
      return { score: 2, label: t("auth.strength.weak"), color: "bg-orange-500" };
    if (score <= 3)
      return {
        score: 3,
        label: t("auth.strength.medium"),
        color: "bg-[var(--lx-gold-soft)]",
      };
    if (score <= 4)
      return {
        score: 4,
        label: t("auth.strength.strong"),
        color: "bg-[var(--lx-gold)]",
      };
    return {
      score: 5,
      label: t("auth.strength.excellent"),
      color: "bg-[var(--lx-bronze)]",
    };
  };

  const strength = getPasswordStrength(password);
  const ruleStates = PASSWORD_RULES.map((rule) => ({
    ...rule,
    met: rule.test(password),
  }));
  const passwordRequirementsMet = ruleStates.every((rule) => rule.met);
  const showPasswordHints = !isLogin && password.length > 0;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLogin && !isValidEmail(email)) {
      toast({
        variant: "destructive",
        title: t("auth.invalidEmailTitle"),
        description: t("auth.invalidEmailDescription"),
      });
      return;
    }

    if (!isLogin && !passwordRequirementsMet) {
      toast({
        variant: "destructive",
        title: t("auth.passwordRequirementsTitle"),
        description: t("auth.passwordRequirementsDescription"),
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        toast({
          title: t("auth.signInSuccessTitle"),
          description: t("auth.signInSuccessDescription"),
        });
      } else {
        const signupLocale = getSignupLocale();
        window.localStorage.setItem(SIGNUP_LOCALE_STORAGE_KEY, signupLocale);

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: getAuthRedirectTo("/app"),
            data: {
              has_accepted_terms: true,
              preferred_locale: signupLocale,
            },
          },
        });
        if (error) throw error;

        const { trackSnapSignUp } = await import("@/lib/snap-pixel");
        trackSnapSignUp();

        setLocation("/login");
      }
    } catch (error: any) {
      if (!isLogin) {
        window.localStorage.removeItem(SIGNUP_LOCALE_STORAGE_KEY);
      }

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

  const handleGoogleAuth = async () => {
    setIsLoading(true);

    const signupLocale = getSignupLocale();
    if (!isLogin) {
      window.localStorage.setItem(SIGNUP_LOCALE_STORAGE_KEY, signupLocale);
    }

    try {
      const redirectTo = getAuthRedirectTo("/app");
      if (import.meta.env.DEV) {
        console.info("[auth] Google OAuth redirectTo:", redirectTo);
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            hl: signupLocale,
          },
        },
      });
      if (error) throw error;
      if (!isLogin) {
        const { trackSnapSignUpGoogle } = await import("@/lib/snap-pixel");
        trackSnapSignUpGoogle();
      }
    } catch (error: any) {
      if (!isLogin) {
        window.localStorage.removeItem(SIGNUP_LOCALE_STORAGE_KEY);
      }

      const translated = translateSupabaseError(error);
      toast({
        variant: "destructive",
        title: translated.title,
        description: translated.description,
      });
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
        className="relative z-10 mb-8 inline-flex items-center gap-2 transition-opacity hover:opacity-80"
        aria-label="LuxeFlexIA — accueil"
      >
        <Gem
          className="h-6 w-6 shrink-0 text-[var(--lx-gold)]"
          strokeWidth={1.75}
          aria-hidden
        />
        <span className="lx-display text-2xl font-semibold tracking-tight text-[var(--lx-ink)] md:text-3xl">
          Luxe<span className="text-[var(--lx-gold)]">Flex</span>IA
        </span>
      </Link>

      <div className="relative z-10 w-full max-w-md">
        <div className="lx-auth-card rounded-2xl border border-[var(--lx-gold)]/45 bg-[var(--lx-surface-2)]/95 p-8 shadow-[0_20px_50px_rgba(18,16,14,0.1)] backdrop-blur-sm md:p-10">
          <div className="mb-8 text-center">
            <h1 className="lx-display text-2xl font-semibold tracking-tight text-[var(--lx-ink)] md:text-3xl">
              {isLogin ? t("auth.welcomeBack") : t("auth.createAccount")}
            </h1>
            <p className="mt-2 text-sm font-medium text-[var(--lx-muted)]">
              {isLogin ? t("auth.subtitleLogin") : t("auth.subtitleRegister")}
            </p>
          </div>

          <div className="space-y-4">
            <button
              type="button"
              className="lx-btn-gold flex h-11 w-full items-center justify-center rounded-full text-sm font-semibold active:scale-[0.97]"
              onClick={handleGoogleAuth}
              disabled={isLoading}
              data-testid="button-google-auth"
            >
              <SiGoogle className="mr-2 h-4 w-4" />
              {isLogin ? t("auth.googleLogin") : t("auth.googleSignup")}
            </button>

            <div className="relative my-6">
              <div className="h-px w-full bg-[var(--lx-ink)]/10" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--lx-surface-2)] px-3 text-xs text-[var(--lx-muted)]">
                {t("auth.separator")}
              </span>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-xs font-semibold uppercase tracking-wide text-[var(--lx-muted)]"
                >
                  {t("auth.fields.email")}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("auth.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 rounded-lg border-[var(--lx-ink)]/12 bg-white text-[var(--lx-ink)] placeholder:text-[var(--lx-muted)]/60 focus-visible:ring-[var(--lx-gold)]"
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-xs font-semibold uppercase tracking-wide text-[var(--lx-muted)]"
                >
                  {t("auth.fields.password")}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 rounded-lg border-[var(--lx-ink)]/12 bg-white pr-10 text-[var(--lx-ink)] focus-visible:ring-[var(--lx-gold)]"
                    data-testid="input-password"
                    autoComplete={isLogin ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--lx-muted)] transition-colors hover:text-[var(--lx-ink)]"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="button-toggle-password"
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

                {showPasswordHints && (
                  <div className="mt-2 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--lx-muted)]">
                        {t("auth.passwordStrength")}
                      </span>
                      <span className="font-medium text-[var(--lx-ink)]">
                        {strength.label}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--lx-ink)]/8">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                        style={{ width: `${(strength.score / 5) * 100}%` }}
                      />
                    </div>

                    <ul className="space-y-1.5 pt-0.5" aria-live="polite">
                      {ruleStates.map((rule) => (
                        <li
                          key={rule.id}
                          className={`flex items-center gap-2 text-xs transition-colors ${
                            rule.met
                              ? "text-[var(--lx-bronze)]"
                              : "text-[var(--lx-muted)]"
                          }`}
                        >
                          {rule.met ? (
                            <Check
                              className="h-3.5 w-3.5 shrink-0 text-[var(--lx-gold)]"
                              strokeWidth={2.5}
                              aria-hidden
                            />
                          ) : (
                            <Circle
                              className="h-3.5 w-3.5 shrink-0 opacity-50"
                              strokeWidth={2}
                              aria-hidden
                            />
                          )}
                          <span>{t(rule.labelKey)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {!isLogin && (
                <p className="text-center text-[11px] text-[var(--lx-muted)]">
                  {t("auth.acceptTermsPrefix")}{" "}
                  <a
                    href="/cgu"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[var(--lx-bronze)] underline-offset-2 hover:underline"
                  >
                    {t("auth.termsLink")}
                  </a>
                </p>
              )}

              <button
                type="submit"
                className="lx-btn-gold flex h-11 w-full items-center justify-center rounded-full text-sm font-semibold disabled:opacity-60"
                disabled={isLoading}
              >
                {isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isLogin ? t("auth.submit.login") : t("auth.submit.register")}
              </button>
            </form>
          </div>

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => setLocation(isLogin ? "/register" : "/login")}
              className="text-sm text-[var(--lx-muted)] transition-colors hover:text-[var(--lx-ink)]"
            >
              {isLogin
                ? t("auth.toggle.noAccount")
                : t("auth.toggle.hasAccount")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
