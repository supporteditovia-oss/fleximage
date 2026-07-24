import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Activity,
  AlertTriangle,
  Banknote,
  Clock3,
  Filter,
  Flame,
  Gauge,
  GitBranch,
  LayoutDashboard,
  Megaphone,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/hooks/use-auth";
import { authFetch } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Range = "today" | "7d" | "30d" | "all";
type TabId =
  | "overview"
  | "revenue"
  | "funnel"
  | "product"
  | "attribution"
  | "timing"
  | "pulse"
  | "health";

type CommandCenterData = {
  range: Range;
  generatedAt: string;
  kpis: Record<string, number | null>;
  revenue: any;
  growth: any;
  product: any;
  economy: any;
  funnel: { landing: number; steps: any[] };
  attribution: any;
  timing: any;
  pulse: { hourlyLandingsToday: number[]; recentGenerations: any[] };
  health: { alerts: any[]; stuckProcessing: number; zeroCreditSubscribers: number; failRate: number | null };
};

const RANGES: { id: Range; label: string }[] = [
  { id: "today", label: "Aujourd'hui" },
  { id: "7d", label: "7 jours" },
  { id: "30d", label: "30 jours" },
  { id: "all", label: "Tout" },
];

const TABS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "revenue", label: "Revenue", icon: Banknote },
  { id: "funnel", label: "Funnel", icon: GitBranch },
  { id: "product", label: "Produit", icon: Sparkles },
  { id: "attribution", label: "Attribution", icon: Megaphone },
  { id: "timing", label: "Timing", icon: Clock3 },
  { id: "pulse", label: "Pulse live", icon: Activity },
  { id: "health", label: "Santé", icon: ShieldAlert },
];

const STEP_LABELS: Record<string, string> = {
  landing: "Landing",
  signup: "Inscription",
  upload: "Upload",
  generate: "Génération",
  preview: "Preview",
  paywall: "Paywall",
  checkout: "Clic paiement",
  subscribed: "Payé",
};

function formatEur(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(n);
}

function formatPct(n: number | null | undefined) {
  if (n == null) return "—";
  return `${n.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}%`;
}

function formatNum(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("fr-FR");
}

function AccessDenied({ setLocation }: { setLocation: (p: string) => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-semibold">Accès refusé</h1>
      <p className="text-muted-foreground">HQ réservé aux administrateurs.</p>
      <Button onClick={() => setLocation("/generate")}>Retour</Button>
    </div>
  );
}

function Kpi({
  title,
  value,
  hint,
  icon,
}: {
  title: string;
  value: string;
  hint?: string;
  icon: ReactNode;
}) {
  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {hint ? (
          <p className="text-xs text-muted-foreground mt-1">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function RankList({
  title,
  rows,
  valueLabel = "sessions",
}: {
  title: string;
  rows: { key: string; count: number }[];
  valueLabel?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Pas encore de data.</p>
        ) : (
          rows.map((row) => (
            <div key={row.key}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="truncate font-medium">{row.key}</span>
                <span className="text-muted-foreground tabular-nums">
                  {formatNum(row.count)} {valueLabel}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-[var(--lx-gold)]"
                  style={{ width: `${Math.max(4, (row.count / max) * 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminCommandCenter() {
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const [range, setRange] = useState<Range>("today");
  const [tab, setTab] = useState<TabId>("overview");

  const { data, isLoading, isFetching, error, refetch } = useQuery<CommandCenterData>({
    queryKey: ["admin-command-center", range],
    queryFn: async () => {
      const res = await authFetch(`/api/admin/command-center?range=${range}`);
      if (!res.ok) throw new Error("command center failed");
      return res.json();
    },
    enabled: isAdmin,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: range === "today" ? 20_000 : 60_000,
  });

  const hourlyChart = useMemo(
    () =>
      (data?.pulse.hourlyLandingsToday || []).map((count, hour) => ({
        hour: `${String(hour).padStart(2, "0")}h`,
        count,
      })),
    [data?.pulse.hourlyLandingsToday],
  );

  const funnelMax = Math.max(
    1,
    ...(data?.funnel.steps || []).map((s) => s.count as number),
  );

  if (!isAdmin && !isLoading) {
    return <AccessDenied setLocation={setLocation} />;
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--lx-gold)]/30 bg-[var(--lx-gold)]/10 px-3 py-1 text-xs font-semibold text-[var(--lx-bronze)]">
            <Gauge className="h-3.5 w-3.5" />
            Admin HQ · Command Center
          </div>
          <h1 className="text-3xl font-display font-bold tracking-tight">
            Pilotage LuxeFlexIA
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Vue type SaaS ops : MRR, funnel TikTok, santé générations, attribution
            pubs, timings de conversion et alertes — admin only.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {RANGES.map((opt) => (
            <Button
              key={opt.id}
              size="sm"
              variant={range === opt.id ? "default" : "outline"}
              onClick={() => setRange(opt.id)}
            >
              {opt.label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => refetch()}>
            Refresh{isFetching ? "…" : ""}
          </Button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition",
                tab === t.id
                  ? "bg-[var(--lx-gold)]/15 text-[var(--lx-bronze)]"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : error || !data ? (
        <Card>
          <CardContent className="py-10 text-destructive">
            Impossible de charger le Command Center.
          </CardContent>
        </Card>
      ) : (
        <>
          {tab === "overview" && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Kpi
                  title="MRR"
                  value={formatEur(data.kpis.mrrEur as number)}
                  hint={`SUM abos actifs · ARR ${formatEur(data.kpis.arrEur as number)} (= MRR×12)`}
                  icon={<Banknote className="h-4 w-4 text-muted-foreground" />}
                />
                <Kpi
                  title="Abonnés actifs"
                  value={formatNum(data.kpis.activeSubscribers as number)}
                  hint={`ARPU ${formatEur(data.kpis.arpuEur as number)} · COUNT subscriptions status=active`}
                  icon={<Users className="h-4 w-4 text-muted-foreground" />}
                />
                <Kpi
                  title="Landing → Payé"
                  value={formatPct(data.kpis.landingToPaidPct as number)}
                  hint={`${formatNum(data.funnel.landing)} landings · ${formatNum(data.kpis.paidPeriod as number)} payés (funnel_events)`}
                  icon={<GitBranch className="h-4 w-4 text-muted-foreground" />}
                />
                <Kpi
                  title="Succès générations"
                  value={formatPct(data.kpis.genSuccessRate as number)}
                  hint={`${formatNum(data.kpis.gensPeriod as number)} jobs · COUNT generations`}
                  icon={<Sparkles className="h-4 w-4 text-muted-foreground" />}
                />
                <Kpi
                  title="Inscriptions"
                  value={formatNum(data.kpis.signupsPeriod as number)}
                  hint={`Aujourd'hui ${formatNum(data.kpis.signupsToday as number)} · COUNT profiles`}
                  icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
                />
                <Kpi
                  title="Crédits brûlés"
                  value={formatNum(data.kpis.creditsBurnedPeriod as number)}
                  hint="SUM |delta| credit_ledger generation_charge"
                  icon={<Flame className="h-4 w-4 text-muted-foreground" />}
                />
                <Kpi
                  title="Utilisateurs total"
                  value={formatNum(data.kpis.totalUsers as number)}
                  hint={`${formatNum(data.kpis.totalSubscriptions as number)} abonnements · COUNT profiles ≠ admin`}
                  icon={<Users className="h-4 w-4 text-muted-foreground" />}
                />
                <Kpi
                  title="Alertes actives"
                  value={formatNum(data.health.alerts.length)}
                  hint={
                    data.health.alerts[0]?.message?.slice(0, 48) ||
                    "Règles calculées sur métriques live DB"
                  }
                  icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
                />
              </div>

              {data.health.alerts.length > 0 ? (
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardHeader>
                    <CardTitle className="text-base">Alertes ops</CardTitle>
                    <CardDescription>
                      Signaux automatiques style monitoring SaaS
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {data.health.alerts.map((a: any) => (
                      <div
                        key={a.code}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-sm",
                          a.level === "critical"
                            ? "border-destructive/40 bg-destructive/10 text-destructive"
                            : a.level === "warning"
                              ? "border-amber-500/40 bg-amber-500/10"
                              : "border-border/60 bg-background",
                        )}
                      >
                        {a.message}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : null}

              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle>Pulse landings (aujourd’hui, heure Paris)</CardTitle>
                  <CardDescription>
                    Ideal pour suivre l’impact d’un post TikTok en temps réel
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={hourlyChart}>
                      <defs>
                        <linearGradient id="landFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                      <XAxis dataKey="hour" tick={{ fontSize: 11 }} minTickGap={16} />
                      <YAxis allowDecimals={false} width={32} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(var(--primary))"
                        fill="url(#landFill)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {tab === "revenue" && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Kpi title="MRR" value={formatEur(data.revenue.mrrEur)} icon={<Banknote className="h-4 w-4 text-muted-foreground" />} />
                <Kpi title="ARR" value={formatEur(data.revenue.arrEur)} icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} />
                <Kpi title="New MRR période" value={formatEur(data.revenue.newMrrEur)} hint={`${formatNum(data.revenue.newSubscribersPeriod)} new subs`} icon={<Zap className="h-4 w-4 text-muted-foreground" />} />
                <Kpi title="Churn MRR période" value={formatEur(data.revenue.churnedMrrEur)} hint={`${formatNum(data.revenue.churnedPeriod)} churn · net ${formatNum(data.revenue.netNewSubscribers)}`} icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />} />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="border-border/60">
                  <CardHeader>
                    <CardTitle>Mix plans (actifs)</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.revenue.byPlan || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                        <XAxis dataKey="plan" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card className="border-border/60">
                  <CardHeader>
                    <CardTitle>Détail plans</CardTitle>
                    <CardDescription>
                      Résiliations programmées: {formatNum(data.revenue.cancelAtPeriodEnd)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(data.revenue.byPlan || []).map((p: any) => (
                      <div
                        key={p.plan}
                        className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2"
                      >
                        <div>
                          <div className="font-semibold capitalize">{p.plan}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatEur(p.priceEur)}/mois
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatNum(p.count)} abo</div>
                          <div className="text-xs text-muted-foreground">
                            {formatEur(p.mrrEur)} MRR
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Kpi title="Crédits flottants" value={formatNum(data.economy.floatingCreditsTotal)} hint="Somme soldes users" icon={<Flame className="h-4 w-4 text-muted-foreground" />} />
                <Kpi title="Rev / 1k crédits" value={formatEur(data.economy.revenuePer1kCreditsEur)} hint="Proxy efficacité période" icon={<Gauge className="h-4 w-4 text-muted-foreground" />} />
                <Kpi title="Gens / abonné" value={formatNum(data.economy.gensPerSubscriber)} hint="Succès période / actifs" icon={<Sparkles className="h-4 w-4 text-muted-foreground" />} />
              </div>
            </div>
          )}

          {tab === "funnel" && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Kpi title="Landings" value={formatNum(data.funnel.landing)} icon={<Users className="h-4 w-4 text-muted-foreground" />} />
                <Kpi title="Conv. globale" value={formatPct(data.funnel.steps.find((s: any) => s.step === "subscribed")?.pctOfLanding)} hint="Landing → payé" icon={<GitBranch className="h-4 w-4 text-muted-foreground" />} />
                <Kpi
                  title="Pire drop-off"
                  value={formatPct(
                    [...(data.funnel.steps || [])]
                      .filter((s: any) => s.step !== "landing")
                      .sort((a: any, b: any) => (b.dropOffPct || 0) - (a.dropOffPct || 0))[0]
                      ?.dropOffPct,
                  )}
                  hint={
                    STEP_LABELS[
                      [...(data.funnel.steps || [])]
                        .filter((s: any) => s.step !== "landing")
                        .sort((a: any, b: any) => (b.dropOffPct || 0) - (a.dropOffPct || 0))[0]
                        ?.step
                    ] || "—"
                  }
                  icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />}
                />
              </div>
              {(data.funnel.steps || []).map((row: any, index: number) => (
                <div
                  key={row.step}
                  className="rounded-xl border border-border/50 bg-muted/20 p-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">
                        {index + 1}. {STEP_LABELS[row.step] || row.step}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatNum(row.count)} sessions
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-md border bg-background px-2 py-1">
                        vs landing <strong>{formatPct(row.pctOfLanding)}</strong>
                      </span>
                      {index > 0 ? (
                        <span className="rounded-md border bg-background px-2 py-1">
                          vs prev <strong>{formatPct(row.pctOfPrevious)}</strong>
                        </span>
                      ) : null}
                      {index > 0 ? (
                        <span
                          className={cn(
                            "rounded-md border px-2 py-1",
                            (row.dropOffPct || 0) >= 40
                              ? "border-destructive/40 bg-destructive/10 text-destructive"
                              : "bg-background",
                          )}
                        >
                          drop-off{" "}
                          <strong>
                            {formatNum(row.dropOffCount)} ({formatPct(row.dropOffPct)})
                          </strong>
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-[var(--lx-gold)]"
                      style={{
                        width: `${Math.max(4, Math.round((row.count / funnelMax) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "product" && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Kpi title="Jobs" value={formatNum(data.product.total)} hint={`Today ${formatNum(data.product.todayCount)}`} icon={<Sparkles className="h-4 w-4 text-muted-foreground" />} />
                <Kpi title="Succès" value={formatNum(data.product.succeeded)} hint={formatPct(data.product.successRate)} icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} />
                <Kpi title="Échecs" value={formatNum(data.product.failed)} icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />} />
                <Kpi title="Médiane durée" value={data.product.medianCostTimeSec != null ? `${data.product.medianCostTimeSec}s` : "—"} icon={<Clock3 className="h-4 w-4 text-muted-foreground" />} />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="border-border/60">
                  <CardHeader>
                    <CardTitle>Providers</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(data.product.byProvider || []).map((p: any) => (
                      <div key={p.provider} className="rounded-lg border px-3 py-2 text-sm">
                        <div className="flex justify-between font-medium">
                          <span>{p.provider}</span>
                          <span>{formatPct(p.successRate)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatNum(p.success)} ok · {formatNum(p.fail)} fail ·{" "}
                          {formatNum(p.total)} total
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <RankList title="Top erreurs" rows={data.product.topFailMessages || []} valueLabel="fois" />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Kpi title="Crédits brûlés" value={formatNum(data.product.creditsBurned)} icon={<Flame className="h-4 w-4 text-muted-foreground" />} />
                <Kpi title="Crédits accordés" value={formatNum(data.product.creditsGranted)} icon={<Zap className="h-4 w-4 text-muted-foreground" />} />
                <RankList title="Types" rows={data.product.byType || []} valueLabel="" />
              </div>
            </div>
          )}

          {tab === "attribution" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <RankList title="UTM source (landings)" rows={data.attribution.utmSources || []} />
              <RankList title="UTM campaign" rows={data.attribution.utmCampaigns || []} />
              <RankList title="Devices" rows={data.attribution.devices || []} />
              <RankList title="Referrers" rows={data.attribution.referrers || []} />
              <Card className="border-border/60 lg:col-span-2">
                <CardHeader>
                  <CardTitle>Locales des inscrits (période)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(data.growth.locales || []).map((l: any) => (
                      <span
                        key={l.key}
                        className="rounded-full border px-3 py-1 text-sm"
                      >
                        {l.key}: <strong>{l.count}</strong>
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {tab === "timing" && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Kpi
                  title="Médiane landing → signup"
                  value={
                    data.timing.medianLandingToSignupHours != null
                      ? `${data.timing.medianLandingToSignupHours.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} h`
                      : "—"
                  }
                  hint={`${formatNum(data.timing.samples?.landToSignup)} samples`}
                  icon={<Clock3 className="h-4 w-4 text-muted-foreground" />}
                />
                <Kpi
                  title="Médiane signup → payé"
                  value={
                    data.timing.medianSignupToPaidHours != null
                      ? `${data.timing.medianSignupToPaidHours.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} h`
                      : "—"
                  }
                  hint={`${formatNum(data.timing.samples?.signupToPaid)} samples`}
                  icon={<Banknote className="h-4 w-4 text-muted-foreground" />}
                />
                <Kpi
                  title="Cohorte 7j → payé"
                  value={formatPct(data.growth.cohort7d?.paidPct)}
                  hint={`${formatNum(data.growth.cohort7d?.paid)} / ${formatNum(data.growth.cohort7d?.signups)}`}
                  icon={<Users className="h-4 w-4 text-muted-foreground" />}
                />
                <Kpi
                  title="Gens moy. / nouvel inscrit"
                  value={formatNum(data.growth.avgGenerationsAmongSignups)}
                  icon={<Sparkles className="h-4 w-4 text-muted-foreground" />}
                />
              </div>
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle>Comment lire ces timings</CardTitle>
                  <CardDescription>
                    Les médianes évitent que 2 outliers faussent ton analyse TikTok.
                    Si landing→signup explose, le CTA / friction auth coince. Si
                    signup→payé explose, c’est le paywall ou la valeur perçue.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          )}

          {tab === "pulse" && (
            <div className="space-y-6">
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle>Landings / heure (Paris)</CardTitle>
                </CardHeader>
                <CardContent className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyChart}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                      <XAxis dataKey="hour" tick={{ fontSize: 11 }} minTickGap={12} />
                      <YAxis allowDecimals={false} width={28} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle>Dernières générations</CardTitle>
                  <CardDescription>Feed ops temps réel</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(data.pulse.recentGenerations || []).map((g: any) => (
                    <div
                      key={g.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="font-medium">
                          {g.status} · {g.provider || "?"}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {g.failMessage || g.id}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {new Date(g.createdAt).toLocaleString("fr-FR")} ·{" "}
                        {g.creditCost ?? "?"} cr
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {tab === "health" && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <Kpi title="Fail rate" value={formatPct(data.health.failRate)} icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />} />
                <Kpi title="Stuck >1h" value={formatNum(data.health.stuckProcessing)} icon={<Clock3 className="h-4 w-4 text-muted-foreground" />} />
                <Kpi title="Abo à 0 crédit" value={formatNum(data.health.zeroCreditSubscribers)} icon={<Flame className="h-4 w-4 text-muted-foreground" />} />
              </div>
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle>Centre d’alertes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.health.alerts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Tout est calme. Aucune alerte sur cette période.
                    </p>
                  ) : (
                    data.health.alerts.map((a: any) => (
                      <div key={a.code} className="rounded-lg border px-3 py-2 text-sm">
                        <span className="mr-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                          {a.level}
                        </span>
                        {a.message}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Snapshot {new Date(data.generatedAt).toLocaleString("fr-FR")} · range{" "}
            {data.range}
          </p>
        </>
      )}
    </div>
  );
}
