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
          Applique les migrations{" "}
          <code className="text-[var(--lux-gold)]">20260927120000</code> +{" "}
          <code className="text-[var(--lux-gold)]">20260927180000</code> via{" "}
          <code className="opacity-80">npm run crm:db:apply</code> (token Supabase) ou le SQL
          Editor. Buckets <code>crm-media</code> / <code>crm-music</code>, tables comptes,
          warm-up, schedule, posts, analytics, dossiers bibliothèque.
        </p>
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
