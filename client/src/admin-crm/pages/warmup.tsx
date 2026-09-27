import GlassCard from "@/admin-crm/components/ui/GlassCard";
import AnimatedNumber from "@/admin-crm/components/ui/AnimatedNumber";
import { CrmEmptyState } from "@/admin-crm/components/CrmEmptyState";
import { useCrmWarmup, useCrmInvalidate } from "@/admin-crm/hooks/use-crm-queries";
import { crmApi } from "@/admin-crm/lib/crm-api";
import {
  countryFlag,
  platformLabel,
  WARMUP_PHASE_LABEL,
} from "@/admin-crm/lib/constants";
import { Loader2 } from "lucide-react";

type WarmupRow = {
  id: string;
  username: string;
  platform: string;
  country_code: string;
  warmup_phase: string;
  warmup_day: number;
  warmup_trust_score: number;
  warmup_interactions_total: number;
  history: Array<{
    day_number: number;
    interactions_count: number;
    trust_score: number;
    created_at: string;
  }>;
};

export default function WarmupPage() {
  const { data, isLoading } = useCrmWarmup();
  const invalidate = useCrmInvalidate();

  async function logInteraction(accountId: string) {
    await crmApi.warmup.interact(accountId, {
      interactions_count: 1,
      trust_delta: 1.2,
      advance_day: false,
    });
    invalidate();
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[var(--lux-text-muted)]" />
      </div>
    );
  }

  const items = (data || []) as WarmupRow[];

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="lux-display text-2xl">Warm-up</h1>
        <p className="text-sm text-[var(--lux-text-muted)]">
          Suivi admin — confiance, interactions et phases par compte
        </p>
      </div>

      {!items.length ? (
        <CrmEmptyState
          title="Aucun compte à chauffer"
          hint="Ajoute des comptes dans l’onglet Comptes pour démarrer le warm-up."
        />
      ) : (
        <div className="space-y-4">
          {items.map((acc) => (
            <GlassCard key={acc.id} variant="flat" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm">
                    {countryFlag(acc.country_code)}{" "}
                    {platformLabel(acc.platform)} · @{acc.username}
                  </p>
                  <p className="text-xs text-[var(--lux-text-muted)]">
                    Phase {WARMUP_PHASE_LABEL[acc.warmup_phase]} · Jour{" "}
                    {acc.warmup_day}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void logInteraction(acc.id)}
                  className="px-3 py-1.5 rounded-lg text-xs bg-[var(--lux-blue-soft)] text-[var(--lux-blue)]"
                >
                  +1 interaction
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-[var(--lux-text-muted)]">Progression</p>
                  <div className="h-2 rounded-full bg-black/40 mt-2 overflow-hidden">
                    <div
                      className="h-full bg-[var(--lux-gold)]"
                      style={{ width: `${Math.min(100, acc.warmup_trust_score)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[var(--lux-text-muted)]">Confiance</p>
                  <p className="lux-display text-xl">
                    <AnimatedNumber value={Number(acc.warmup_trust_score)} suffix="%" />
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--lux-text-muted)]">Interactions</p>
                  <p className="lux-display text-xl">
                    <AnimatedNumber value={acc.warmup_interactions_total} />
                  </p>
                </div>
              </div>

              {acc.history?.length ? (
                <div>
                  <p className="text-xs text-[var(--lux-text-muted)] mb-2">Historique</p>
                  <ul className="text-xs space-y-1 max-h-24 overflow-y-auto lux-scrollbar">
                    {acc.history.map((h) => (
                      <li key={h.created_at}>
                        J{h.day_number} — {h.interactions_count} int. · confiance{" "}
                        {h.trust_score}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
