import GlassCard from "@/admin-crm/components/ui/GlassCard";
import AnimatedNumber from "@/admin-crm/components/ui/AnimatedNumber";
import { CrmEmptyState } from "@/admin-crm/components/CrmEmptyState";
import { useCrmDashboard } from "@/admin-crm/hooks/use-crm-queries";
import { platformLabel } from "@/admin-crm/lib/constants";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Eye,
  Clock,
  TrendingUp,
  UserPlus,
  Heart,
  MessageCircle,
  Share2,
  Loader2,
} from "lucide-react";

export default function DashboardPage() {
  const { data, isLoading } = useCrmDashboard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-[var(--lux-text-muted)]">
        <Loader2 className="animate-spin mr-2" size={18} />
        Chargement du dashboard…
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { stats } = data;

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="lux-display text-2xl">Bonjour</h1>
        <p className="text-sm text-[var(--lux-text-muted)]">
          Aperçu du {data.dateLabel}
        </p>
      </div>

      <GlassCard className="lux-glow-gold flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <p className="text-sm text-[var(--lux-text-muted)] mb-1">
            Score de performance
          </p>
          <p
            className="lux-display text-5xl"
            style={{ color: "var(--lux-gold)" }}
          >
            <AnimatedNumber value={stats.performanceScore} suffix="/100" />
          </p>
          <p className="text-xs text-[var(--lux-text-muted)] mt-2">
            Agrégé sur les métriques en base (30 derniers jours)
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 text-right">
          <MiniStat label="TikTok" value={stats.platformCounts.tiktok ?? 0} />
          <MiniStat
            label="Instagram"
            value={stats.platformCounts.instagram ?? 0}
          />
          <MiniStat label="YouTube" value={stats.platformCounts.youtube ?? 0} />
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={<Eye size={15} />} label="Vues totales" value={stats.totalViews} />
        <Kpi
          icon={<Clock size={15} />}
          label="Watch time moy."
          value={stats.avgWatchTimeSeconds}
          suffix="s"
        />
        <Kpi
          icon={<TrendingUp size={15} />}
          label="Rétention moy."
          value={stats.avgRetention}
          suffix="%"
        />
        <Kpi
          icon={<UserPlus size={15} />}
          label="Abonnés gagnés"
          value={stats.subscribersGained}
        />
        <Kpi icon={<Heart size={15} />} label="Likes" value={stats.likes} />
        <Kpi
          icon={<MessageCircle size={15} />}
          label="Commentaires"
          value={stats.comments}
        />
        <Kpi icon={<Share2 size={15} />} label="Partages" value={stats.shares} />
        <Kpi
          label="Comptes connectés"
          value={stats.connectedAccounts}
          icon={<UserPlus size={15} />}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Vidéos en attente" value={stats.videosPending} />
        <StatCard label="Publiées aujourd'hui" value={stats.publishedToday} />
        <StatCard label="Shorts en file" value={stats.shortsInQueue} />
      </div>

      <GlassCard variant="flat" className="h-72">
        <h2 className="text-sm font-medium mb-4">Vues & rétention (30 j)</h2>
        {data.chartSeries.length === 0 ? (
          <p className="text-xs text-[var(--lux-text-muted)]">
            Aucune métrique journalière — branche les syncs plateforme ou saisis
            des lignes dans `crm_account_daily_metrics`.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={data.chartSeries}>
              <defs>
                <linearGradient id="crmViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d4af6a" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#d4af6a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "#8b8a94", fontSize: 10 }}
                tickFormatter={(d) => d.slice(5)}
              />
              <YAxis tick={{ fill: "#8b8a94", fontSize: 10 }} width={40} />
              <Tooltip
                contentStyle={{
                  background: "#131316",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                }}
              />
              <Area
                type="monotone"
                dataKey="views"
                stroke="#d4af6a"
                fill="url(#crmViews)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </GlassCard>

      <div className="grid md:grid-cols-2 gap-4">
        <GlassCard variant="flat">
          <h2 className="text-sm font-medium mb-4">Top 5 vidéos</h2>
          {data.topVideos.length === 0 ? (
            <p className="text-xs text-[var(--lux-text-muted)]">
              Aucune analytics post — publie et synchronise `crm_post_analytics`.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.topVideos.map((v) => (
                <li
                  key={v.rank}
                  className="flex justify-between text-sm border-b border-[var(--lux-border)] pb-2 last:border-0"
                >
                  <span className="truncate pr-2">
                    #{v.rank}{" "}
                    {v.post?.caption ||
                      v.post?.account?.username ||
                      "Publication"}
                  </span>
                  <span className="text-[var(--lux-gold)] shrink-0">
                    {v.views.toLocaleString("fr-FR")} vues
                  </span>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard variant="flat">
          <h2 className="text-sm font-medium mb-4">Top compte (7 j)</h2>
          {!data.topAccountWeek ? (
            <p className="text-xs text-[var(--lux-text-muted)]">
              Pas encore de données hebdomadaires.
            </p>
          ) : (
            <div>
              <p className="lux-display text-xl">
                @{data.topAccountWeek.account?.username}
              </p>
              <p className="text-xs text-[var(--lux-text-muted)] mt-1">
                {platformLabel(data.topAccountWeek.account?.platform || "")} ·{" "}
                {data.topAccountWeek.views.toLocaleString("fr-FR")} vues · score{" "}
                {data.topAccountWeek.avgScore}
              </p>
            </div>
          )}
        </GlassCard>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <GlassCard variant="flat" className="col-span-3">
          <h2 className="text-sm font-medium mb-4">Activité récente</h2>
          {data.recentActivity.length === 0 ? (
            <p className="text-xs text-[var(--lux-text-muted)]">
              Les actions CRM apparaîtront ici automatiquement.
            </p>
          ) : (
            <div className="space-y-0.5">
              {data.recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between py-2 border-b border-[var(--lux-border)] last:border-0 text-sm"
                >
                  <span>{item.message}</span>
                  <span className="text-xs text-[var(--lux-text-faint)]">
                    {formatDistanceToNow(new Date(item.created_at), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard variant="flat" className="col-span-2">
          <h2 className="text-sm font-medium mb-4">Prochaines publications</h2>
          {data.upcomingPosts.length === 0 ? (
            <p className="text-xs text-[var(--lux-text-muted)]">
              Aucune publication programmée.
            </p>
          ) : (
            <div className="space-y-3">
              {data.upcomingPosts.map((pub) => (
                <div key={pub.id} className="flex gap-3 items-center">
                  <div className="h-9 w-9 rounded-lg bg-[var(--lux-gold-soft)] flex items-center justify-center text-xs text-[var(--lux-gold)]">
                    {new Date(pub.scheduledAt).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div>
                    <p className="text-sm">
                      {pub.account?.display_name || pub.account?.username}
                    </p>
                    <p className="text-xs text-[var(--lux-text-muted)]">
                      {platformLabel(pub.platform)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  suffix,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <GlassCard variant="flat" className="p-3">
      <div className="flex items-center gap-2 text-[var(--lux-text-muted)] text-xs mb-1">
        {icon}
        {label}
      </div>
      <p className="lux-display text-lg">
        <AnimatedNumber value={value} suffix={suffix} />
      </p>
    </GlassCard>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <GlassCard variant="flat" className="p-4">
      <p className="text-xs text-[var(--lux-text-muted)]">{label}</p>
      <p className="lux-display text-2xl mt-1">
        <AnimatedNumber value={value} />
      </p>
    </GlassCard>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-[var(--lux-text-muted)]">{label}</p>
      <p className="lux-display text-xl">
        <AnimatedNumber value={value} />
      </p>
    </div>
  );
}
