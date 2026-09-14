import { useTranslation } from "react-i18next";
import { useTrustStats } from "@/hooks/use-trust-stats";
import { formatCredits } from "@/lib/format-locale";

type SocialProofVariant = "paywall" | "landing" | "landingCreators" | "recent";

type SocialProofLineProps = {
  variant?: SocialProofVariant;
  className?: string;
  /** Hide entirely when stats are unavailable (no fallback copy). */
  silent?: boolean;
};

function formatCount(value: number, locale?: string | null): string {
  return formatCredits(value, locale);
}

function fallbackKey(variant: SocialProofVariant): string | null {
  if (variant === "paywall") return "paywall.socialProofFallback";
  if (variant === "landing") return "landing:hero.trustFallback";
  return null;
}

export function SocialProofLine({
  variant = "paywall",
  className,
  silent = false,
}: SocialProofLineProps) {
  const { t, i18n } = useTranslation();
  const { data } = useTrustStats();
  const locale = i18n.resolvedLanguage;
  const display = data?.display;

  let message: string | null = null;

  if (variant === "paywall" && display?.showTotal) {
    message = t("paywall.socialProof", {
      count: formatCount(display.totalGenerations, locale),
    });
  } else if (variant === "landing" && display?.showTotal) {
    message = t("landing:hero.trustLine", {
      count: formatCount(display.totalGenerations, locale),
    });
  } else if (variant === "landingCreators" && display?.showCreators) {
    message = t("landing:hero.trustCreators", {
      count: formatCount(display.creators, locale),
    });
  } else if (variant === "recent" && display?.showRecent) {
    message = t("paywall.monthlySent", {
      count: formatCount(display.recentGenerations, locale),
    });
  }

  if (message) {
    return <p className={className}>{message}</p>;
  }

  if (silent) return null;

  const fallback = fallbackKey(variant);
  if (fallback) {
    return <p className={className}>{t(fallback)}</p>;
  }

  return null;
}
