import GlassCard from "@/admin-crm/components/ui/GlassCard";
import AnimatedNumber from "@/admin-crm/components/ui/AnimatedNumber";
import { CrmEmptyState } from "@/admin-crm/components/CrmEmptyState";
import { useCrmDashboard } from "@/admin-crm/hooks/use-crm-queries";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Loader2 } from "lucide-react";

export default function AnalyticsPage() {
  const { data, isLoading } = useCrmDashboard();

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const { stats, chartSeries } = data;

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="lux-display text-2xl">Analytics</h1>
        <p className="text-sm text-[var(--lux-text-muted)]">
          Données agrégées depuis Supabase — pas de démo statique
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Vues", value: stats.totalViews },
          { label: "Rétention %", value: stats.avgRetention },
          { label: "Likes", value: stats.likes },
          { label: "Score perf.", value: stats.performanceScore },
        ].map((k) => (
          <GlassCard key={k.label} variant="flat">
            <p className="text-xs text-[var(--lux-text-muted)]">{k.label}</p>
            <p className="lux-display text-2xl">
              <AnimatedNumber value={k.value} />
            </p>
          </GlassCard>
        ))}
      </div>

      <GlassCard variant="flat" className="h-80">
        <h2 className="text-sm font-medium mb-4">Évolution</h2>
        {chartSeries.length === 0 ? (
          <p className="text-xs text-[var(--lux-text-muted)]">
            Insère des lignes dans `crm_account_daily_metrics` ou branche les syncs API
            plateformes.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={chartSeries}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8b8a94" }} />
              <YAxis tick={{ fontSize: 10, fill: "#8b8a94" }} />
              <Tooltip />
              <Line type="monotone" dataKey="views" stroke="#d4af6a" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="likes" stroke="#6e8cff" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="retention" stroke="#34d399" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </GlassCard>
    </div>
  );
}
