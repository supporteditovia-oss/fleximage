import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import {
  formatGenerationRetentionCountdown,
  getGenerationRetentionMsRemaining,
  resolveGenerationExpiresAtMs,
} from "@/lib/generation-retention";

type GenerationExpiryBadgeProps = {
  expiresAt?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
  locale?: string;
  className?: string;
};

export function GenerationExpiryBadge({
  expiresAt,
  completedAt,
  createdAt,
  locale = "fr",
  className = "",
}: GenerationExpiryBadgeProps) {
  const expiresAtMs = resolveGenerationExpiresAtMs({
    expiresAt,
    completedAt,
    createdAt,
  });

  const [msRemaining, setMsRemaining] = useState(() =>
    getGenerationRetentionMsRemaining(expiresAtMs),
  );

  useEffect(() => {
    if (!expiresAtMs) return;
    const tick = () =>
      setMsRemaining(getGenerationRetentionMsRemaining(expiresAtMs));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [expiresAtMs]);

  if (!expiresAtMs) return null;

  const urgent = msRemaining <= 24 * 60 * 60 * 1000;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide backdrop-blur-sm ${
        urgent
          ? "border-amber-300/50 bg-amber-500/20 text-amber-100"
          : "border-white/25 bg-black/45 text-white/90"
      } ${className}`}
      title={
        locale.startsWith("en")
          ? "Media is kept for 7 days, then removed automatically."
          : "Conservé 7 jours, puis supprimé automatiquement."
      }
    >
      <Clock3 className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
      {formatGenerationRetentionCountdown(msRemaining, locale)}
    </span>
  );
}
