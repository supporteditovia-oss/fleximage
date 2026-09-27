import { useRoute } from "wouter";
import GlassCard from "@/admin-crm/components/ui/GlassCard";
import AnimatedNumber from "@/admin-crm/components/ui/AnimatedNumber";
import { CrmEmptyState } from "@/admin-crm/components/CrmEmptyState";
import { useCrmAccount } from "@/admin-crm/hooks/use-crm-queries";
import {
  countryFlag,
  platformLabel,
  WARMUP_PHASE_LABEL,
} from "@/admin-crm/lib/constants";
import { Link } from "wouter";
import { Loader2, ArrowLeft } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AccountDetailPage() {
  const [, params] = useRoute("/admin/accounts/:id");
  const id = params?.id ?? null;
  const { data, isLoading, error } = useCrmAccount(id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[var(--lux-text-muted)]" />
      </div>
    );
  }

  if (error || !data?.account) {
    return (
      <CrmEmptyState
        title="Compte introuvable"
        hint={error instanceof Error ? error.message : undefined}
      />
    );
  }

  const { account, recentPosts, analytics, growthDaily, viralScore } = data;

  return (
    <div className="max-w-6xl space-y-6">
      <Link
        href="/admin/accounts"
        className="inline-flex items-center gap-2 text-sm text-[var(--lux-text-muted)] hover:text-[var(--lux-text)]"
      >
        <ArrowLeft size={16} />
        Comptes
      </Link>

      <div
        className="rounded-2xl h-36 border border-[var(--lux-border)] bg-cover bg-center"
        style={{
          backgroundImage: account.banner_url
            ? `url(${account.banner_url})`
            : "linear-gradient(135deg, #17171b, #0a0a0c)",
        }}
      />

      <div className="flex gap-4 items-end -mt-12 px-4">
        <div className="h-24 w-24 rounded-2xl border-2 border-[var(--lux-bg)] overflow-hidden bg-[var(--lux-surface)]">
          {account.avatar_url ? (
            <img src={account.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-3xl">
              {countryFlag(account.country_code)}
            </span>
          )}
        </div>
        <div>
          <p className="text-xs text-[var(--lux-text-muted)]">
            {countryFlag(account.country_code)} {platformLabel(account.platform)}
          </p>
          <h1 className="lux-display text-3xl">@{account.username}</h1>
          <p className="text-sm text-[var(--lux-text-muted)]">
            {WARMUP_PHASE_LABEL[account.warmup_phase]} · score viral{" "}
            <AnimatedNumber value={viralScore} />
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <GlassCard variant="flat">
          <p className="text-xs text-[var(--lux-text-muted)]">Abonnés</p>
          <p className="lux-display text-2xl">
            <AnimatedNumber value={Number(account.followers)} />
          </p>
        </GlassCard>
        <GlassCard variant="flat">
          <p className="text-xs text-[var(--lux-text-muted)]">Likes</p>
          <p className="lux-display text-2xl">
            <AnimatedNumber value={Number(account.likes)} />
          </p>
        </GlassCard>
        <GlassCard variant="flat">
          <p className="text-xs text-[var(--lux-text-muted)]">Vues</p>
          <p className="lux-display text-2xl">
            <AnimatedNumber value={Number(account.views)} />
          </p>
        </GlassCard>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <GlassCard variant="flat" className="h-64">
          <h2 className="text-sm font-medium mb-3">Croissance (14 j)</h2>
          {growthDaily.length === 0 ? (
            <p className="text-xs text-[var(--lux-text-muted)]">
              Pas de métriques journalières pour ce compte.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={growthDaily}>
                <XAxis dataKey="metric_date" tick={{ fontSize: 10, fill: "#8b8a94" }} />
                <YAxis tick={{ fontSize: 10, fill: "#8b8a94" }} width={36} />
                <Tooltip />
                <Line type="monotone" dataKey="views" stroke="#6e8cff" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </GlassCard>

        <GlassCard variant="flat">
          <h2 className="text-sm font-medium mb-3">Dernières vidéos</h2>
          {recentPosts.length === 0 ? (
            <p className="text-xs text-[var(--lux-text-muted)]">Aucune publication.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recentPosts.map((p: { id: string; caption: string | null; status: string; scheduled_at: string }) => (
                <li key={p.id} className="flex justify-between border-b border-[var(--lux-border)] pb-2">
                  <span className="truncate pr-2">{p.caption || "Sans titre"}</span>
                  <span className="text-xs text-[var(--lux-text-muted)]">{p.status}</span>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </div>

      <GlassCard variant="flat">
        <h2 className="text-sm font-medium mb-3">Analytics récentes</h2>
        {analytics.length === 0 ? (
          <p className="text-xs text-[var(--lux-text-muted)]">
            Aucun enregistrement dans `crm_post_analytics`.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[var(--lux-text-muted)]">
                <tr>
                  <th className="text-left py-2">Vues</th>
                  <th className="text-left">Likes</th>
                  <th className="text-left">Comms</th>
                  <th className="text-left">Viral</th>
                </tr>
              </thead>
              <tbody>
                {analytics.slice(0, 8).map((a: { id: string; views: number; likes: number; comments: number; viral_score: number }) => (
                  <tr key={a.id} className="border-t border-[var(--lux-border)]">
                    <td className="py-2">{a.views}</td>
                    <td>{a.likes}</td>
                    <td>{a.comments}</td>
                    <td>{a.viral_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
