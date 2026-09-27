import GlassCard from "@/admin-crm/components/ui/GlassCard";

export default function SettingsPage() {
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
