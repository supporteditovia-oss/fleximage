import { useRef, useState } from "react";
import GlassCard from "@/admin-crm/components/ui/GlassCard";
import { CrmEmptyState } from "@/admin-crm/components/CrmEmptyState";
import { useCrmMusic, useCrmInvalidate } from "@/admin-crm/hooks/use-crm-queries";
import { crmApi } from "@/admin-crm/lib/crm-api";
import type { CrmMusic } from "@/admin-crm/types";
import { countryFlag, COUNTRY_META } from "@/admin-crm/lib/constants";
import {
  fileToBase64,
  isAllowedMusicFile,
  readAudioDuration,
  MUSIC_ACCEPT,
} from "@/admin-crm/lib/crm-files";
import { Loader2, Play, Pause, Star, Trash2, Plus } from "lucide-react";

export default function MusicPage() {
  const [search, setSearch] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const { data, isLoading } = useCrmMusic(search, favOnly);
  const invalidate = useCrmInvalidate();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);

  function togglePlay(track: CrmMusic) {
    if (!track.audio_url) return;
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
            Import MP3, WAV, M4A — lecture intégrée
          </p>
        </div>
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm bg-[var(--lux-gold-soft)] text-[var(--lux-gold)]"
        >
          <Plus size={16} /> Importer
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
          hint="Importe un fichier audio (MP3, WAV, M4A) avec titre, pays, humeur et énergie."
        />
      ) : (
        <div className="space-y-3">
          {data.map((track) => (
            <GlassCard key={track.id} variant="flat" className="flex gap-4 items-center">
              <button
                type="button"
                disabled={!track.audio_url}
                onClick={() => togglePlay(track)}
                className="h-10 w-10 rounded-full bg-[var(--lux-blue-soft)] flex items-center justify-center text-[var(--lux-blue)] disabled:opacity-40"
              >
                {playingId === track.id ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {countryFlag(track.country_code)} {track.title}
                </p>
                <p className="text-xs text-[var(--lux-text-muted)]">
                  {formatDuration(track.duration_seconds)} · énergie {track.energy || "—"} ·
                  humeur {track.mood || "—"}
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

      {uploadOpen ? (
        <MusicUploadModal
          onClose={() => setUploadOpen(false)}
          onDone={() => {
            setUploadOpen(false);
            invalidate();
          }}
        />
      ) : null}
    </div>
  );
}

function MusicUploadModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [country, setCountry] = useState("FR");
  const [mood, setMood] = useState("");
  const [energy, setEnergy] = useState("");
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(f: File) {
    if (!isAllowedMusicFile(f)) {
      setError("Format non supporté — MP3, WAV ou M4A uniquement.");
      return;
    }
    setError(null);
    setFile(f);
    if (!title.trim()) {
      setTitle(f.name.replace(/\.[^.]+$/, ""));
    }
    const sec = await readAudioDuration(f);
    setDuration(sec);
  }

  async function submit() {
    if (!file || !title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const dataBase64 = await fileToBase64(file);
      await crmApi.music.upload({
        title: title.trim(),
        country_code: country,
        mood: mood.trim() || null,
        energy: energy.trim() || null,
        duration_seconds: duration,
        fileName: file.name,
        contentType: file.type || "",
        dataBase64,
      });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import impossible");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <GlassCard className="w-full max-w-md space-y-4 lux-glow-gold">
        <h2 className="lux-display text-xl">Importer une musique</h2>
        <input
          ref={fileRef}
          type="file"
          accept={MUSIC_ACCEPT.accept}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onPick(f);
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full py-3 rounded-lg border border-dashed border-[var(--lux-border)] text-sm text-[var(--lux-text-muted)]"
        >
          {file ? file.name : "Choisir MP3, WAV ou M4A…"}
        </button>
        <label className="block text-xs text-[var(--lux-text-muted)]">
          Titre
          <input
            className="mt-1 w-full rounded-lg bg-black/40 border border-[var(--lux-border)] px-3 py-2 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="block text-xs text-[var(--lux-text-muted)]">
          Pays
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
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-[var(--lux-text-muted)]">
            Humeur
            <input
              className="mt-1 w-full rounded-lg bg-black/40 border border-[var(--lux-border)] px-3 py-2 text-sm"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              placeholder="ex. chill, hype…"
            />
          </label>
          <label className="block text-xs text-[var(--lux-text-muted)]">
            Énergie
            <input
              className="mt-1 w-full rounded-lg bg-black/40 border border-[var(--lux-border)] px-3 py-2 text-sm"
              value={energy}
              onChange={(e) => setEnergy(e.target.value)}
              placeholder="ex. haute, moyenne…"
            />
          </label>
        </div>
        <p className="text-xs text-[var(--lux-text-faint)]">
          Durée détectée : {formatDuration(duration)}
        </p>
        {error ? (
          <p className="text-xs text-[var(--lux-danger)]">{error}</p>
        ) : null}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-3 py-2 text-sm text-[var(--lux-text-muted)]">
            Annuler
          </button>
          <button
            type="button"
            disabled={!file || !title.trim() || loading}
            onClick={() => void submit()}
            className="px-4 py-2 rounded-lg bg-[var(--lux-gold-soft)] text-[var(--lux-gold)] text-sm disabled:opacity-40"
          >
            {loading ? "Import…" : "Enregistrer"}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}

function formatDuration(sec: number) {
  if (!sec) return "—:—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
