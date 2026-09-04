import * as React from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { setAppLanguage } from "@/i18n";
import {
  resolvePreferredLocale,
  type AppLocale,
} from "@shared/locales";
import { cn } from "@/lib/utils";

function FranceFlag({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 3 2"
      className={className}
      aria-hidden
      focusable="false"
    >
      <rect width="1" height="2" fill="#002395" />
      <rect x="1" width="1" height="2" fill="#fff" />
      <rect x="2" width="1" height="2" fill="#ed2939" />
    </svg>
  );
}

function UsFlag({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 19 10"
      className={className}
      aria-hidden
      focusable="false"
    >
      <rect width="19" height="10" fill="#bf0a30" />
      <rect y="0.77" width="19" height="0.77" fill="#fff" />
      <rect y="2.31" width="19" height="0.77" fill="#fff" />
      <rect y="3.85" width="19" height="0.77" fill="#fff" />
      <rect y="5.38" width="19" height="0.77" fill="#fff" />
      <rect y="6.92" width="19" height="0.77" fill="#fff" />
      <rect y="8.46" width="19" height="0.77" fill="#fff" />
      <rect width="7.6" height="5.38" fill="#002868" />
    </svg>
  );
}

const SWITCH_LOCALES: { locale: "fr" | "en"; Flag: typeof FranceFlag; labelKey: string }[] =
  [
    { locale: "fr", Flag: FranceFlag, labelKey: "layout.language.fr" },
    { locale: "en", Flag: UsFlag, labelKey: "layout.language.en" },
  ];

function writeLangToUrl(locale: AppLocale) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("lang", locale);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

type LanguageSwitchProps = {
  className?: string;
  compact?: boolean;
};

export function LanguageSwitch({ className, compact = false }: LanguageSwitchProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const current = resolvePreferredLocale(i18n.resolvedLanguage, "fr");

  const select = React.useCallback(
    (locale: "fr" | "en") => {
      if (locale === current) return;
      setAppLanguage(locale, { trackSignupLocale: !user });
      writeLangToUrl(locale);
      if (!user) return;
      void supabase
        .from("profiles")
        .update({
          preferred_locale: locale,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .then(({ error }) => {
          if (!error) {
            queryClient.setQueryData(["profile", user.id], (current) =>
              current && typeof current === "object"
                ? { ...current, preferred_locale: locale }
                : current,
            );
          }
        });
    },
    [current, user],
  );

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-black/10 bg-white/80 p-0.5 shadow-sm backdrop-blur-md",
        className,
      )}
      role="group"
      aria-label={t("layout.language.switchAria")}
    >
      {SWITCH_LOCALES.map(({ locale, Flag, labelKey }) => {
        const active = current === locale;
        return (
          <button
            key={locale}
            type="button"
            onClick={() => select(locale)}
            aria-pressed={active}
            aria-label={t(labelKey)}
            className={cn(
              "inline-flex min-h-9 items-center gap-1.5 rounded-full px-2 text-[11px] font-semibold tracking-wide transition-colors sm:min-h-8 sm:px-2.5",
              compact ? "min-w-0" : "sm:min-w-[3.25rem]",
              active
                ? "bg-[var(--lx-ink)] text-white"
                : "text-[var(--lx-muted)] hover:text-[var(--lx-ink)]",
            )}
          >
            <Flag className="h-3.5 w-[1.3rem] shrink-0 overflow-hidden rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.12)]" />
            <span className="max-[359px]:hidden">{locale.toUpperCase()}</span>
          </button>
        );
      })}
    </div>
  );
}
