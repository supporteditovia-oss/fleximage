import GlassCard from "@/admin-crm/components/ui/GlassCard";
import AnimatedNumber from "@/admin-crm/components/ui/AnimatedNumber";
import { Instagram, Music2 as TikTokIcon, Clock, CheckCircle2 } from "lucide-react";

const ACTIVITE = [
  { id: 1, text: "Vidéo importée — lot_luxe_04.mp4", time: "il y a 12 min" },
  { id: 2, text: "Publication programmée — compte Motivation", time: "il y a 1h" },
  { id: 3, text: "Analyse Whisper terminée — batch_09", time: "il y a 3h" },
  { id: 4, text: "Score viral recalculé — compte Luxe", time: "il y a 5h" },
];

const PROCHAINES_PUBLICATIONS = [
  { id: 1, compte: "Luxe", heure: "18:30", plateforme: "TikTok" },
  { id: 2, compte: "Motivation", heure: "20:00", plateforme: "Reels" },
  { id: 3, compte: "France", heure: "09:00 (demain)", plateforme: "Shorts" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="lux-display text-2xl">Bonjour</h1>
        <p className="text-sm text-[var(--lux-text-muted)]">Aperçu du 27 septembre</p>
      </div>

      {/* Widget héros : score de performance */}
      <GlassCard className="lux-glow-gold flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--lux-text-muted)] mb-1">Score de performance</p>
          <p className="lux-display text-5xl" style={{ color: "var(--lux-gold)" }}>
            <AnimatedNumber value={87} suffix="/100" />
          </p>
          <p className="text-xs text-[var(--lux-text-muted)] mt-2">+6 points vs. semaine dernière</p>
        </div>
        <div className="hidden md:flex gap-8">
          <MiniStat icon={<TikTokIcon size={16} />} label="Comptes TikTok" value={3} />
          <MiniStat icon={<Instagram size={16} />} label="Comptes Instagram" value={2} />
        </div>
      </GlassCard>

      {/* Stats secondaires */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={<Clock size={16} />} label="Vidéos en attente" value={12} />
        <StatCard icon={<CheckCircle2 size={16} />} label="Publiées aujourd'hui" value={4} />
        <StatCard icon={<TikTokIcon size={16} />} label="Shorts en file" value={7} />
      </div>

      {/* Activité + calendrier, deux colonnes inégales */}
      <div className="grid grid-cols-5 gap-4">
        <GlassCard variant="flat" className="col-span-3">
          <h2 className="text-sm font-medium text-[var(--lux-text)] mb-4">Activité récente</h2>
          <div className="space-y-0.5">
            {ACTIVITE.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2.5 border-b border-[var(--lux-border)] last:border-0"
              >
                <span className="text-sm text-[var(--lux-text)]">{item.text}</span>
                <span className="text-xs text-[var(--lux-text-faint)]">{item.time}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard variant="flat" className="col-span-2">
          <h2 className="text-sm font-medium text-[var(--lux-text)] mb-4">Prochaines publications</h2>
          <div className="space-y-3">
            {PROCHAINES_PUBLICATIONS.map((pub) => (
              <div key={pub.id} className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-[var(--lux-gold-soft)] flex items-center justify-center text-xs text-[var(--lux-gold)] font-medium">
                  {pub.heure.slice(0, 5)}
                </div>
                <div>
                  <p className="text-sm text-[var(--lux-text)]">{pub.compte}</p>
                  <p className="text-xs text-[var(--lux-text-muted)]">{pub.plateforme}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <GlassCard variant="flat" className="flex items-center gap-4">
      <div className="h-10 w-10 rounded-xl bg-[var(--lux-blue-soft)] flex items-center justify-center text-[var(--lux-blue)]">
        {icon}
      </div>
      <div>
        <p className="text-xs text-[var(--lux-text-muted)]">{label}</p>
        <p className="lux-display text-xl">
          <AnimatedNumber value={value} />
        </p>
      </div>
    </GlassCard>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="text-right">
      <div className="flex items-center justify-end gap-1.5 text-[var(--lux-text-muted)] text-xs mb-1">
        {icon}
        {label}
      </div>
      <p className="lux-display text-2xl">
        <AnimatedNumber value={value} />
      </p>
    </div>
  );
}
