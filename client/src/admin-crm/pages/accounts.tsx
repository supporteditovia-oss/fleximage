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
      const detail = params.get("oauth_msg");
      setBanner(
        detail
          ? `Connexion TikTok refusée : ${detail} — vérifiez aussi Test users / Target users sur developers.tiktok.com.`
          : "Connexion TikTok refusée — ajoutez votre compte en Test user ou Target user (Sandbox) sur TikTok Developer, puis réessayez.",
      );
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
            Connexion TikTok Login Kit (OAuth) — autres plateformes bientôt
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
          hint="Ajoute un compte TikTok via Login Kit : avatar, nom affiché et identifiant sont récupérés automatiquement."
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
  const platform: CrmPlatform = "tiktok";
  const [country, setCountry] = useState("FR");
  const [error, setError] = useState<string | null>(null);

  const configured = oauthStatus?.platforms.tiktok ?? false;

  function connect() {
    setError(null);
    if (!configured) {
      setError(
        "TikTok Login Kit non configuré (CRM_TIKTOK_*) — voir Réglages CRM.",
      );
      return;
    }
    const url = crmApi.oauth.startUrl(platform, country);
    window.location.assign(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <GlassCard className="w-full max-w-md space-y-4 lux-glow-gold">
        <h2 className="lux-display text-xl">Ajouter un compte</h2>
        <p className="text-xs text-[var(--lux-text-muted)]">
          TikTok Login Kit — redirection vers la page officielle TikTok pour
          autoriser LuxFlexIA. Aucune saisie manuelle de @username.
        </p>
        <div className="flex items-center gap-3 rounded-lg bg-black/40 border border-[var(--lux-border)] px-3 py-3">
          <span className="text-lg" aria-hidden>
            🎵
          </span>
          <div>
            <p className="text-sm font-medium">TikTok</p>
            <p className="text-xs text-[var(--lux-text-muted)]">
              Scope <code className="opacity-80">user.info.basic</code>
            </p>
          </div>
        </div>
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
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90 space-y-1">
          <p className="font-medium text-amber-200/95">
            Erreur TikTok « client_key » après login ?
          </p>
          <p>
            Ce n’est en général <strong>pas</strong> la clé Vercel : TikTok refuse le{" "}
            <strong>compte</strong> utilisé. Ajoutez-le dans{" "}
            <a
              href="https://developers.tiktok.com/apps"
              target="_blank"
              rel="noreferrer"
              className="underline text-[var(--lux-gold)]"
            >
              TikTok Developer → LuxFlexIA
            </a>
            :
          </p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>
              <strong>Sandbox</strong> : Sandbox settings → Target users → Add account
              (même compte TikTok).
            </li>
            <li>
              <strong>Production / staging</strong> : App permissions → Test users.
            </li>
          </ul>
          <p className="text-[var(--lux-text-muted)]">
            Puis déconnexion TikTok, navigateur privé, et réessayez.
          </p>
        </div>
        {!configured ? (
          <p className="text-xs text-amber-400/90">
            Clés TikTok manquantes côté serveur ({platformLabel(platform)}).
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
            Continuer avec TikTok
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
