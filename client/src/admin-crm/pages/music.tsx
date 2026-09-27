import { useRef, useState } from "react";
import GlassCard from "@/admin-crm/components/ui/GlassCard";
import { CrmEmptyState } from "@/admin-crm/components/CrmEmptyState";
import { useCrmMusic, useCrmInvalidate } from "@/admin-crm/hooks/use-crm-queries";
import { crmApi } from "@/admin-crm/lib/crm-api";
import type { CrmMusic } from "@/admin-crm/types";
import { countryFlag } from "@/admin-crm/lib/constants";
import { Loader2, Play, Pause, Star, Trash2, Plus } from "lucide-react";

export default function MusicPage() {
  const [search, setSearch] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const { data, isLoading } = useCrmMusic(search, favOnly);
  const invalidate = useCrmInvalidate();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);

  function togglePlay(track: CrmMusic) {
    if (playingId === track.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = track.audio_url;
    void audioRef.current.play();
    setPlayingId(track.id);
    audioRef.current.ontimeupdate = () => {
      if (!audioRef.current) return;
      const p =
        audioRef.current.duration > 0
          ? (audioRef.current.currentTime / audioRef.current.duration) * 100
          : 0;
      setProgress(p);
    };
    audioRef.current.onended = () => setPlayingId(null);
  }

  async function addTrack() {
    const title = window.prompt("Titre de la musique");
    const url = window.prompt("URL audio (MP3)");
    if (!title || !url) return;
    await crmApi.music.create({
      title,
      audio_url: url,
      duration_seconds: 0,
      source: "upload",
    });
    invalidate();
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="lux-display text-2xl">Musiques</h1>
          <p className="text-sm text-[var(--lux-text-muted)]">
            Lecture, favoris — prêt pour tendances TikTok
          </p>
        </div>
        <button
          type="button"
          onClick={() => void addTrack()}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm bg-[var(--lux-gold-soft)] text-[var(--lux-gold)]"
        >
          <Plus size={16} /> Ajouter
        </button>
      </div>

      <div className="flex gap-2">
        <input
          className="crm-input max-w-xs"
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setFavOnly((v) => !v)}
          className={`px-3 py-2 rounded-lg text-xs border ${
            favOnly ? "border-[var(--lux-gold)] text-[var(--lux-gold)]" : "border-[var(--lux-border)]"
          }`}
        >
          Favoris
        </button>
      </div>

      {!data?.length ? (
        <CrmEmptyState
          title="Aucune musique"
          hint="Ajoute des pistes ou branche l’import tendances TikTok plus tard."
        />
      ) : (
        <div className="space-y-3">
          {data.map((track) => (
            <GlassCard key={track.id} variant="flat" className="flex gap-4 items-center">
              <button
                type="button"
                onClick={() => togglePlay(track)}
                className="h-10 w-10 rounded-full bg-[var(--lux-blue-soft)] flex items-center justify-center text-[var(--lux-blue)]"
              >
                {playingId === track.id ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {countryFlag(track.country_code)} {track.title}
                </p>
                <p className="text-xs text-[var(--lux-text-muted)]">
                  {track.artist || "Artiste inconnu"} · {formatDuration(track.duration_seconds)} ·
                  énergie {track.energy || "—"} · humeur {track.mood || "—"} · pop.{" "}
                  {track.popularity}%
                </p>
                {playingId === track.id ? (
                  <div className="h-1 rounded-full bg-black/40 mt-2 overflow-hidden">
                    <div className="h-full bg-[var(--lux-gold)]" style={{ width: `${progress}%` }} />
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() =>
                  void crmApi.music
                    .update(track.id, { is_favorite: !track.is_favorite })
                    .then(invalidate)
                }
                className={track.is_favorite ? "text-[var(--lux-gold)]" : "text-[var(--lux-text-faint)]"}
              >
                <Star size={16} fill={track.is_favorite ? "currentColor" : "none"} />
              </button>
              <button
                type="button"
                onClick={() => void crmApi.music.remove(track.id).then(invalidate)}
                className="text-[var(--lux-danger)]"
              >
                <Trash2 size={16} />
              </button>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDuration(sec: number) {
  if (!sec) return "—:—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
