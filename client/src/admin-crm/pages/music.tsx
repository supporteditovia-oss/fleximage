import GlassCard from "@/admin-crm/components/ui/GlassCard";

const MUSIQUES = [
  { id: 1, titre: "Golden Hour Loop", humeur: "Calme", energie: 35, pays: "FR", duree: "0:32", popularite: 78 },
  { id: 2, titre: "Rise Up Beat", humeur: "Énergique", energie: 88, pays: "US", duree: "0:28", popularite: 92 },
  { id: 3, titre: "Soft Piano Intro", humeur: "Émotionnel", energie: 20, pays: "FR", duree: "0:41", popularite: 54 },
  { id: 4, titre: "Neon Drive", humeur: "Confiant", energie: 70, pays: "ES", duree: "0:30", popularite: 66 },
];

export default function MusicPage() {
  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="lux-display text-2xl">Musiques</h1>
          <p className="text-sm text-[var(--lux-text-muted)]">Bibliothèque locale — l'IA choisira automatiquement plus tard</p>
        </div>
        <button className="rounded-lg bg-[var(--lux-gold)] text-[#1a1408] text-sm font-medium px-4 py-2 hover:brightness-110 transition-[filter] duration-200">
          Ajouter une musique
        </button>
      </div>

      <GlassCard variant="flat" className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--lux-text-muted)] border-b border-[var(--lux-border)]">
              <th className="py-3 px-5 font-normal">Titre</th>
              <th className="py-3 px-5 font-normal">Humeur</th>
              <th className="py-3 px-5 font-normal">Énergie</th>
              <th className="py-3 px-5 font-normal">Pays</th>
              <th className="py-3 px-5 font-normal">Durée</th>
              <th className="py-3 px-5 font-normal">Popularité</th>
            </tr>
          </thead>
          <tbody>
            {MUSIQUES.map((m) => (
              <tr key={m.id} className="border-b border-[var(--lux-border)] last:border-0">
                <td className="py-3 px-5 text-[var(--lux-text)]">{m.titre}</td>
                <td className="py-3 px-5 text-[var(--lux-text-muted)]">{m.humeur}</td>
                <td className="py-3 px-5">
                  <div className="h-1.5 w-20 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${m.energie}%`, background: "var(--lux-blue)" }}
                    />
                  </div>
                </td>
                <td className="py-3 px-5 text-[var(--lux-text-muted)]">{m.pays}</td>
                <td className="py-3 px-5 text-[var(--lux-text-muted)]">{m.duree}</td>
                <td className="py-3 px-5">
                  <div className="h-1.5 w-20 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${m.popularite}%`, background: "var(--lux-gold)" }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
    </div>
  );
}
