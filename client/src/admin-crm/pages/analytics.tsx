

import { LineChart, Line, AreaChart, Area, XAxis, ResponsiveContainer, Tooltip } from "recharts";
import GlassCard from "@/admin-crm/components/ui/GlassCard";
import AnimatedNumber from "@/admin-crm/components/ui/AnimatedNumber";

const VUES_7J = [
  { jour: "Lun", vues: 12400 },
  { jour: "Mar", vues: 15800 },
  { jour: "Mer", vues: 14200 },
  { jour: "Jeu", vues: 21000 },
  { jour: "Ven", vues: 26300 },
  { jour: "Sam", vues: 31200 },
  { jour: "Dim", vues: 28900 },
];

const RETENTION_7J = [
  { jour: "Lun", retention: 42 },
  { jour: "Mar", retention: 46 },
  { jour: "Mer", retention: 44 },
  { jour: "Jeu", retention: 51 },
  { jour: "Ven", retention: 58 },
  { jour: "Sam", retention: 61 },
  { jour: "Dim", retention: 57 },
];

const KPIS = [
  { label: "Vues (7j)", value: 149800 },
  { label: "Watch time moyen", value: 24, suffix: "s" },
  { label: "Rétention 3s", value: 57, suffix: "%" },
  { label: "Abonnés gagnés", value: 612 },
  { label: "Commentaires", value: 1284 },
  { label: "Likes", value: 38900 },
];

export default function AnalyticsPage() {
  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="lux-display text-2xl">Analytics</h1>
        <p className="text-sm text-[var(--lux-text-muted)]">Données fictives — à brancher sur les vraies métriques</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {KPIS.map((kpi) => (
          <GlassCard key={kpi.label} variant="flat">
            <p className="text-xs text-[var(--lux-text-muted)] mb-1">{kpi.label}</p>
            <p className="lux-display text-2xl">
              <AnimatedNumber value={kpi.value} suffix={kpi.suffix ?? ""} />
            </p>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <GlassCard>
          <p className="text-sm text-[var(--lux-text-muted)] mb-4">Vues sur 7 jours</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={VUES_7J}>
              <defs>
                <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--lux-gold)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--lux-gold)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="jour" stroke="var(--lux-text-faint)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "#131316", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#8b8a94" }}
              />
              <Area type="monotone" dataKey="vues" stroke="var(--lux-gold)" strokeWidth={2} fill="url(#goldFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard>
          <p className="text-sm text-[var(--lux-text-muted)] mb-4">Rétention moyenne (%)</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={RETENTION_7J}>
              <XAxis dataKey="jour" stroke="var(--lux-text-faint)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "#131316", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#8b8a94" }}
              />
              <Line type="monotone" dataKey="retention" stroke="var(--lux-blue)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>
    </div>
  );
}
