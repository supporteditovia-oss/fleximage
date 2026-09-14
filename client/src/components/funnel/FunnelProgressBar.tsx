import { useTranslation } from "react-i18next";

type FunnelProgressBarProps = {
  current: number;
  total: number;
  labelKey: string;
};

export function FunnelProgressBar({
  current,
  total,
  labelKey,
}: FunnelProgressBarProps) {
  const { t } = useTranslation();
  const pct = Math.min(100, Math.max(0, Math.round((current / total) * 100)));

  return (
    <div className="w-full max-w-md space-y-2">
      <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--lx-muted)]">
        <span>{t("paywall.funnelProgress", { current, total })}</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-black/8"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={t(labelKey)}
      >
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#c9a227_0%,#e8c96a_100%)] transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-center text-xs font-medium text-[var(--lx-muted)]">
        {t(labelKey)}
      </p>
    </div>
  );
}
