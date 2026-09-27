

import { useState } from "react";
import GlassCard from "@/admin-crm/components/ui/GlassCard";

type Statut = "Programmée" | "Publiée" | "En attente";

type Post = {
  id: number;
  compte: string;
  plateforme: string;
  heure: string;
  statut: Statut;
  jour: number; // jour du mois, pour la démo
};

const STATUT_COLOR: Record<Statut, string> = {
  Programmée: "var(--lux-blue)",
  Publiée: "var(--lux-success)",
  "En attente": "var(--lux-text-faint)",
};

const INITIAL_POSTS: Post[] = [
  { id: 1, compte: "Luxe", plateforme: "TikTok", heure: "18:30", statut: "Programmée", jour: 27 },
  { id: 2, compte: "Motivation", plateforme: "Reels", heure: "12:00", statut: "Publiée", jour: 27 },
  { id: 3, compte: "France", plateforme: "Shorts", heure: "09:00", statut: "En attente", jour: 28 },
  { id: 4, compte: "Luxe", plateforme: "Reels", heure: "20:00", statut: "Programmée", jour: 29 },
];

const DAYS_IN_MONTH = 30;
const START_WEEKDAY = 1; // le 1er tombe un mardi, pour la démo

export default function PublishPage() {
  const [view, setView] = useState<"Jour" | "Semaine" | "Mois">("Mois");
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [dragId, setDragId] = useState<number | null>(null);

  function handleDrop(jour: number) {
    if (dragId === null) return;
    setPosts((prev) => prev.map((p) => (p.id === dragId ? { ...p, jour } : p)));
    setDragId(null);
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="lux-display text-2xl">Publish</h1>
          <p className="text-sm text-[var(--lux-text-muted)]">Glisse une carte pour la reprogrammer</p>
        </div>

        <div className="flex gap-1 rounded-lg bg-black/30 border border-[var(--lux-glass-border)] p-1">
          {(["Jour", "Semaine", "Mois"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors duration-200 ${
                view === v ? "bg-[var(--lux-glass)] text-[var(--lux-text)]" : "text-[var(--lux-text-muted)]"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === "Mois" && (
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: DAYS_IN_MONTH + START_WEEKDAY }).map((_, i) => {
            const jour = i - START_WEEKDAY + 1;
            if (jour < 1) return <div key={i} />;
            const dayPosts = posts.filter((p) => p.jour === jour);

            return (
              <div
                key={jour}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(jour)}
                className="min-h-[92px] rounded-xl border border-[var(--lux-border)] p-2 space-y-1"
              >
                <span className="text-[11px] text-[var(--lux-text-faint)]">{jour}</span>
                {dayPosts.map((post) => (
                  <div
                    key={post.id}
                    draggable
                    onDragStart={() => setDragId(post.id)}
                    className="rounded-md px-2 py-1 text-[11px] cursor-grab active:cursor-grabbing lux-glass"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ background: STATUT_COLOR[post.statut] }}
                      />
                      <span className="truncate text-[var(--lux-text)]">{post.compte}</span>
                    </div>
                    <span className="text-[var(--lux-text-faint)]">{post.heure} · {post.plateforme}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {view !== "Mois" && (
        <GlassCard variant="flat">
          <div className="space-y-2">
            {posts.map((post) => (
              <div key={post.id} className="flex items-center justify-between py-2.5 border-b border-[var(--lux-border)] last:border-0">
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full" style={{ background: STATUT_COLOR[post.statut] }} />
                  <span className="text-sm text-[var(--lux-text)] w-20">{post.compte}</span>
                  <span className="text-sm text-[var(--lux-text-muted)] w-20">{post.plateforme}</span>
                  <span className="text-sm text-[var(--lux-text-muted)]">Jour {post.jour} · {post.heure}</span>
                </div>
                <span className="text-xs text-[var(--lux-text-muted)]">{post.statut}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[var(--lux-text-faint)] mt-4">
            Vues {view} en lecture seule pour l'instant — le drag & drop est actif en vue Mois.
          </p>
        </GlassCard>
      )}
    </div>
  );
}
