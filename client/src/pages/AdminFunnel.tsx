import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Filter,
  GitBranch,
  TrendingDown,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { authFetch } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type FunnelRange = "today" | "7d" | "30d" | "all";

type FunnelStepRow = {
  step: string;
  count: number;
  pctOfLanding: number | null;
  pctOfPrevious: number | null;
  dropOffCount: number;
  dropOffPct: number | null;
};

type FunnelStats = {
  range: FunnelRange;
  from: string | null;
  to: string | null;
  landing: number;
  steps: FunnelStepRow[];
};

const RANGE_OPTIONS: { id: FunnelRange; label: string }[] = [
  { id: "today", label: "Aujourd'hui" },
  { id: "7d", label: "7 jours" },
  { id: "30d", label: "30 jours" },
  { id: "all", label: "Tout" },
];

const STEP_LABELS: Record<string, string> = {
  landing: "Landing",
  signup: "Inscription",
  upload: "Upload image",
  generate: "Génération",
  preview: "Preview floutée",
  paywall: "Paywall",
  checkout: "Clic paiement",
  subscribed: "Paiement réussi",
};

function AccessDenied({ setLocation }: { setLocation: (path: string) => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-semibold">Accès refusé</h1>
      <p className="text-muted-foreground">Réservé aux administrateurs.</p>
      <Button onClick={() => setLocation("/generate")}>Retour</Button>
    </div>
  );
}

function formatPct(value: number | null): string {
  if (value == null) return "—";
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}%`;
}

export default function AdminFunnel() {
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const [range, setRange] = useState<FunnelRange>("today");

  const { data, isLoading, isFetching, error } = useQuery<FunnelStats>({
    queryKey: ["admin-funnel", range],
    queryFn: async () => {
      const res = await authFetch(`/api/admin/funnel?range=${range}`);
      return res.json();
    },
    enabled: isAdmin,
    staleTime: 15_000,
    refetchInterval: range === "today" ? 30_000 : false,
  });

  const maxCount = useMemo(
    () => Math.max(1, ...(data?.steps.map((s) => s.count) || [1])),
    [data?.steps],
  );

  if (!isAdmin && !isLoading) {
    return <AccessDenied setLocation={setLocation} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-bold tracking-tight">
            Funnel conversion
          </h1>
          <p className="text-muted-foreground text-lg">
            Parcours TikTok → landing → inscription → upload → génération →
            preview → paywall → abonné.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {RANGE_OPTIONS.map((opt) => (
            <Button
              key={opt.id}
              size="sm"
              variant={range === opt.id ? "default" : "outline"}
              onClick={() => setRange(opt.id)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-destructive">
            Impossible de charger le funnel.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border/60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Sessions landing
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.landing ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cohorte {RANGE_OPTIONS.find((o) => o.id === range)?.label}
                  {isFetching ? " · maj…" : ""}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Conv. globale
                </CardTitle>
                <GitBranch className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPct(
                    data?.steps.find((s) => s.step === "subscribed")
                      ?.pctOfLanding ?? null,
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Landing → paiement réussi
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Plus gros drop-off
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {(() => {
                  const worst = [...(data?.steps || [])]
                    .filter((s) => s.dropOffPct != null && s.step !== "landing")
                    .sort((a, b) => (b.dropOffPct || 0) - (a.dropOffPct || 0))[0];
                  if (!worst) {
                    return <div className="text-2xl font-bold">—</div>;
                  }
                  return (
                    <>
                      <div className="text-2xl font-bold">
                        {formatPct(worst.dropOffPct)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Avant « {STEP_LABELS[worst.step] || worst.step} »
                      </p>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle>Étapes du funnel</CardTitle>
              <CardDescription>
                % vs étape précédente (où ça coince) et % vs landing (conversion
                globale). Drop-off = n’a jamais atteint l’étape suivante.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(data?.steps || []).map((row, index) => {
                const width = Math.max(4, Math.round((row.count / maxCount) * 100));
                const prevLabel =
                  index === 0
                    ? null
                    : STEP_LABELS[data!.steps[index - 1].step];
                return (
                  <div
                    key={row.step}
                    className="rounded-xl border border-border/50 bg-muted/20 p-4"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          {index + 1}. {STEP_LABELS[row.step] || row.step}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {row.count.toLocaleString("fr-FR")} sessions
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs sm:text-sm">
                        <span className="rounded-md bg-background px-2 py-1 border">
                          vs landing{" "}
                          <strong>{formatPct(row.pctOfLanding)}</strong>
                        </span>
                        {index > 0 ? (
                          <span className="rounded-md bg-background px-2 py-1 border">
                            vs {prevLabel}{" "}
                            <strong>{formatPct(row.pctOfPrevious)}</strong>
                          </span>
                        ) : null}
                        {index > 0 ? (
                          <span
                            className={cn(
                              "rounded-md px-2 py-1 border",
                              (row.dropOffPct || 0) >= 40
                                ? "border-destructive/40 bg-destructive/10 text-destructive"
                                : "bg-background",
                            )}
                          >
                            drop-off{" "}
                            <strong>
                              {row.dropOffCount.toLocaleString("fr-FR")} (
                              {formatPct(row.dropOffPct)})
                            </strong>
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-[var(--lx-gold)] transition-all"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {(data?.landing ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Aucune session landing sur cette période. Les stats
                  s’alimenteront dès le trafic TikTok.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
