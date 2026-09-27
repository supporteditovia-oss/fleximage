import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import GlassCard from "@/admin-crm/components/ui/GlassCard";
import { CrmEmptyState } from "@/admin-crm/components/CrmEmptyState";
import {
  useCrmAccounts,
  useCrmAccountMutations,
} from "@/admin-crm/hooks/use-crm-queries";
import {
  countryFlag,
  platformLabel,
  COUNTRY_META,
  WARMUP_PHASE_LABEL,
} from "@/admin-crm/lib/constants";
import type { CrmPlatform } from "@/admin-crm/types";
import { Loader2, Plus } from "lucide-react";

export default function AccountsPage() {
  const { data: accounts, isLoading } = useCrmAccounts();
  const { create } = useCrmAccountMutations();
  const [open, setOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20 text-[var(--lux-text-muted)]">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="lux-display text-2xl">Comptes</h1>
          <p className="text-sm text-[var(--lux-text-muted)]">
            TikTok, Instagram, YouTube — multi-comptes par plateforme
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--lux-gold-soft)] text-[var(--lux-gold)] text-sm border border-[var(--lux-glass-border)]"
        >
          <Plus size={16} />
          Connecter un compte
        </button>
      </div>

      {!accounts?.length ? (
        <CrmEmptyState
          title="Aucun compte connecté"
          hint="Ajoute ton premier compte pour alimenter Publish, Warm-up et le Dashboard."
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {accounts.map((acc) => (
            <Link key={acc.id} href={`/admin/accounts/${acc.id}`}>
              <motion.div whileHover={{ y: -2 }} className="cursor-pointer">
                <GlassCard className="flex gap-4 items-center">
                  <div className="h-14 w-14 rounded-full bg-[var(--lux-surface-raised)] overflow-hidden border border-[var(--lux-border)]">
                    {acc.avatar_url ? (
                      <img
                        src={acc.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-lg">
                        {countryFlag(acc.country_code)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {countryFlag(acc.country_code)}{" "}
                      {platformLabel(acc.platform)}
                    </p>
                    <p className="lux-display text-lg truncate">
                      @{acc.username}
                    </p>
                    <p className="text-xs text-[var(--lux-text-muted)]">
                      {WARMUP_PHASE_LABEL[acc.warmup_phase]} ·{" "}
                      {acc.followers.toLocaleString("fr-FR")} abonnés
                    </p>
                  </div>
                </GlassCard>
              </motion.div>
            </Link>
          ))}
        </div>
      )}

      {open ? (
        <AccountModal
          onClose={() => setOpen(false)}
          onSubmit={async (payload) => {
            await create.mutateAsync(payload);
            setOpen(false);
          }}
          loading={create.isPending}
        />
      ) : null}
    </div>
  );
}

function AccountModal({
  onClose,
  onSubmit,
  loading,
}: {
  onClose: () => void;
  onSubmit: (p: Record<string, unknown>) => Promise<void>;
  loading: boolean;
}) {
  const [platform, setPlatform] = useState<CrmPlatform>("tiktok");
  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("FR");

  const meta = COUNTRY_META[country];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <GlassCard className="w-full max-w-md space-y-4 lux-glow-gold">
        <h2 className="lux-display text-xl">Nouveau compte</h2>
        <label className="block text-xs text-[var(--lux-text-muted)]">
          Plateforme
          <select
            className="mt-1 w-full rounded-lg bg-black/40 border border-[var(--lux-border)] px-3 py-2 text-sm"
            value={platform}
            onChange={(e) => setPlatform(e.target.value as CrmPlatform)}
          >
            <option value="tiktok">TikTok</option>
            <option value="instagram">Instagram</option>
            <option value="youtube">YouTube</option>
          </select>
        </label>
        <label className="block text-xs text-[var(--lux-text-muted)]">
          @username
          <input
            className="mt-1 w-full rounded-lg bg-black/40 border border-[var(--lux-border)] px-3 py-2 text-sm"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label className="block text-xs text-[var(--lux-text-muted)]">
          Pays
          <select
            className="mt-1 w-full rounded-lg bg-black/40 border border-[var(--lux-border)] px-3 py-2 text-sm"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            {Object.entries(COUNTRY_META).map(([code, c]) => (
              <option key={code} value={code}>
                {c.flag} {c.label}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-[var(--lux-text-faint)]">
          Langue {meta.language} · fuseau {meta.timezone}
        </p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm text-[var(--lux-text-muted)]"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={!username.trim() || loading}
            onClick={() =>
              void onSubmit({
                platform,
                username,
                country_code: country,
                language_code: meta.language,
                timezone: meta.timezone,
              })
            }
            className="px-4 py-2 rounded-lg bg-[var(--lux-gold-soft)] text-[var(--lux-gold)] text-sm disabled:opacity-40"
          >
            {loading ? "…" : "Enregistrer"}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
