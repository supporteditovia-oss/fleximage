import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import GlassCard from "@/admin-crm/components/ui/GlassCard";
import { CrmEmptyState } from "@/admin-crm/components/CrmEmptyState";
import {
  useCrmAccounts,
  useCrmInvalidate,
  useCrmOAuthStatus,
} from "@/admin-crm/hooks/use-crm-queries";
import { crmApi } from "@/admin-crm/lib/crm-api";
import {
  countryFlag,
  platformLabel,
  COUNTRY_META,
  ACCOUNT_STATUS_LABEL,
} from "@/admin-crm/lib/constants";
import type { CrmPlatform } from "@/admin-crm/types";
import { Loader2, Plus, Unplug } from "lucide-react";

export default function AccountsPage() {
  const search = useSearch();
  const { data: accounts, isLoading, isError, error } = useCrmAccounts();
  const { data: oauthStatus } = useCrmOAuthStatus();
  const invalidate = useCrmInvalidate();
  const [open, setOpen] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("connected") === "1") {
      setBanner("Compte connecté avec succès.");
      invalidate();
    }
    if (params.get("oauth_error") === "1") {
      setBanner("La connexion OAuth a échoué — réessayez.");
    }
  }, [search, invalidate]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20 text-[var(--lux-text-muted)]">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <CrmEmptyState
        title="Impossible de charger les comptes"
        hint={
          error instanceof Error
            ? error.message
            : "Vérifiez la session admin et les migrations Supabase CRM."
        }
      />
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="lux-display text-2xl">Comptes</h1>
          <p className="text-sm text-[var(--lux-text-muted)]">
            Connexion OAuth officielle — TikTok, Instagram, YouTube
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--lux-gold-soft)] text-[var(--lux-gold)] text-sm border border-[var(--lux-glass-border)]"
        >
          <Plus size={16} />
          Ajouter un compte
        </button>
      </div>

      {banner ? (
        <p className="text-sm text-[var(--lux-gold)] border border-[var(--lux-glass-border)] rounded-xl px-4 py-2">
          {banner}
        </p>
      ) : null}

      {!accounts?.length ? (
        <CrmEmptyState
          title="Aucun compte connecté"
          hint="Ajoute un compte via OAuth : identité, photo et @username sont récupérés automatiquement."
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {accounts.map((acc) => (
            <GlassCard key={acc.id} className="flex gap-4 items-center">
              <Link href={`/admin/accounts/${acc.id}`} className="flex gap-4 items-center flex-1 min-w-0">
                <div className="h-14 w-14 rounded-full bg-[var(--lux-surface-raised)] overflow-hidden border border-[var(--lux-border)] shrink-0">
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
                    {platformLabel(acc.platform)} ·{" "}
                    {ACCOUNT_STATUS_LABEL[acc.status] || acc.status}
                  </p>
                  <p className="lux-display text-lg truncate">@{acc.username}</p>
                  {acc.display_name ? (
                    <p className="text-xs text-[var(--lux-text-muted)] truncate">
                      {acc.display_name}
                    </p>
                  ) : null}
                </div>
              </Link>
              {acc.status === "active" ? (
                <button
                  type="button"
                  title="Déconnecter"
                  onClick={() =>
                    void crmApi.accounts.disconnect(acc.id).then(invalidate)
                  }
                  className="p-2 rounded-lg text-[var(--lux-text-muted)] hover:text-[var(--lux-danger)] hover:bg-black/30 shrink-0"
                >
                  <Unplug size={18} />
                </button>
              ) : null}
            </GlassCard>
          ))}
        </div>
      )}

      {open ? (
        <OAuthConnectModal
          oauthStatus={oauthStatus}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

function OAuthConnectModal({
  onClose,
  oauthStatus,
}: {
  onClose: () => void;
  oauthStatus?: {
    platforms: Record<CrmPlatform, boolean>;
    redirectOrigin: string;
  };
}) {
  const invalidate = useCrmInvalidate();
  const [platform, setPlatform] = useState<CrmPlatform>("tiktok");
  const [country, setCountry] = useState("FR");
  const [error, setError] = useState<string | null>(null);

  const configured = oauthStatus?.platforms[platform] ?? false;

  function connect() {
    setError(null);
    if (!configured) {
      setError(
        "OAuth non configuré sur le serveur pour cette plateforme — voir Réglages CRM.",
      );
      return;
    }
    const url = crmApi.oauth.startUrl(platform, country);
    const popup = window.open(
      url,
      "luxeflexia_oauth",
      "width=520,height=720,menubar=no,toolbar=no",
    );
    if (!popup) {
      setError("Autorisez les pop-ups pour ouvrir la fenêtre de connexion.");
      return;
    }
    const onMessage = (ev: MessageEvent) => {
      if (ev.origin !== window.location.origin) return;
      const data = ev.data as { type?: string; ok?: boolean; error?: string };
      if (data?.type !== "crm-oauth-complete") return;
      window.removeEventListener("message", onMessage);
      if (data.ok) {
        invalidate();
        onClose();
      } else {
        setError(data.error || "Connexion annulée ou refusée.");
      }
    };
    window.addEventListener("message", onMessage);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <GlassCard className="w-full max-w-md space-y-4 lux-glow-gold">
        <h2 className="lux-display text-xl">Ajouter un compte</h2>
        <p className="text-xs text-[var(--lux-text-muted)]">
          Choisissez la plateforme et le marché CRM (pays). Vous serez redirigé
          vers la connexion officielle — aucune saisie de @username.
        </p>
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
          Pays (segmentation CRM)
          <select
            className="mt-1 w-full rounded-lg bg-black/40 border border-[var(--lux-border)] px-3 py-2 text-sm"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            {(["FR", "ES", "US", "TR"] as const).map((code) => (
              <option key={code} value={code}>
                {COUNTRY_META[code]?.flag} {COUNTRY_META[code]?.label}
              </option>
            ))}
          </select>
        </label>
        {!configured ? (
          <p className="text-xs text-amber-400/90">
            Clés OAuth manquantes côté serveur pour {platformLabel(platform)}.
          </p>
        ) : null}
        {error ? <p className="text-xs text-[var(--lux-danger)]">{error}</p> : null}
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
            onClick={connect}
            className="px-4 py-2 rounded-lg bg-[var(--lux-gold-soft)] text-[var(--lux-gold)] text-sm"
          >
            Se connecter
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
