import GlassCard from "@/admin-crm/components/ui/GlassCard";
import { useCrmOAuthStatus } from "@/admin-crm/hooks/use-crm-queries";

export default function SettingsPage() {
  const { data: oauthStatus } = useCrmOAuthStatus();
  const tiktok = oauthStatus?.tiktokDiagnostics;
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="lux-display text-2xl">Réglages</h1>
        <p className="text-sm text-[var(--lux-text-muted)]">Compte et préférences</p>
      </div>

      <GlassCard variant="flat">
        <h2 className="text-sm font-medium mb-4">Base Supabase CRM V3</h2>
        <p className="text-xs text-[var(--lux-text-muted)] leading-relaxed">
          Migrations CRM via <code className="opacity-80">npm run crm:db:apply</code> (incl.{" "}
          <code className="text-[var(--lux-gold)]">20260927210000_crm_oauth_tokens</code>
          ). Buckets médias/musiques, tokens OAuth chiffrés dans{" "}
          <code>crm_oauth_tokens</code>.
        </p>
      </GlassCard>

      <GlassCard variant="flat">
        <h2 className="text-sm font-medium mb-4">OAuth comptes sociaux (CRM)</h2>
        <ul className="text-xs text-[var(--lux-text-muted)] space-y-2 leading-relaxed">
          <li>
            <strong className="text-[var(--lux-text)]">Redirect URI</strong> (identique pour les 3) :{" "}
            <code className="text-[var(--lux-gold)]">
              https://www.luxeflexia.com/admin/api/oauth/callback/&lt;platform&gt;
            </code>{" "}
            — remplacer <code>tiktok</code>, <code>instagram</code>, <code>youtube</code>.
          </li>
          <li>
            TikTok Login Kit : <code>CRM_TIKTOK_CLIENT_KEY</code>,{" "}
            <code>CRM_TIKTOK_CLIENT_SECRET</code>
          </li>
          <li>
            Instagram Graph (Meta) : <code>CRM_META_APP_ID</code>,{" "}
            <code>CRM_META_APP_SECRET</code> — compte IG Pro lié à une Page Facebook
          </li>
          <li>
            YouTube : <code>CRM_GOOGLE_CLIENT_ID</code>,{" "}
            <code>CRM_GOOGLE_CLIENT_SECRET</code> — YouTube Data API v3 activée
          </li>
          <li>
            Chiffrement tokens : <code>CRM_OAUTH_ENCRYPTION_KEY</code> (ou{" "}
            <code>SESSION_SECRET</code>)
          </li>
          <li>
            Origine redirect : <code>CRM_OAUTH_REDIRECT_ORIGIN=https://www.luxeflexia.com</code>
          </li>
        </ul>
        {tiktok ? (
          <div className="mt-4 pt-4 border-t border-[var(--lux-border)] text-xs space-y-2">
            <p className="font-medium text-[var(--lux-text)]">Diagnostic TikTok (runtime prod)</p>
            <p className="text-[var(--lux-text-muted)]">
              Client Key ({tiktok.envVarNames.clientKey}) :{" "}
              {tiktok.clientKey.present ? (
                <>
                  présente · longueur {tiktok.clientKey.length} ·{" "}
                  <code className="text-[var(--lux-gold)]">{tiktok.clientKey.masked}</code>
                </>
              ) : (
                <span className="text-[var(--lux-danger)]">absente ou vide</span>
              )}
            </p>
            {tiktok.clientKey.hadOuterQuotes || tiktok.clientKey.hadEdgeWhitespace ? (
              <p className="text-amber-400/90">
                Guillemets ou espaces détectés dans la variable — corrigez la valeur dans Vercel.
              </p>
            ) : null}
            {tiktok.clientKeyEqualsSecret ? (
              <p className="text-[var(--lux-danger)]">
                La Client Key et le Client Secret sont identiques — vérifiez Vercel.
              </p>
            ) : null}
            {tiktok.authorizePreview && "authorizeEndpoint" in tiktok.authorizePreview ? (
              <p className="text-[var(--lux-text-muted)]">
                URL authorize :{" "}
                <code className="text-[var(--lux-gold)]">
                  {tiktok.authorizePreview.authorizeEndpoint}
                </code>
                {" · "}
                <code>client_key</code> longueur envoyée :{" "}
                {tiktok.authorizePreview.clientKeyParamLength}
              </p>
            ) : null}
            <ul className="list-disc pl-4 text-[var(--lux-text-muted)] space-y-1">
              {tiktok.hints.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </GlassCard>

      <GlassCard variant="flat">
        <h2 className="text-sm font-medium mb-4">Compte administrateur</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-[var(--lux-border)]">
            <span className="text-[var(--lux-text-muted)]">Email</span>
            <span className="text-[var(--lux-text)]">Défini via ADMIN_EMAIL</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-[var(--lux-text-muted)]">Accès</span>
            <span className="text-[var(--lux-text)]">Administrateur unique — aucune inscription possible</span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
