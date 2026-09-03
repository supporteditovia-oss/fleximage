import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Pause, Play, Search } from "lucide-react";
import {
  VOICE_CATALOG,
  type VoiceCatalogEntry,
} from "@/lib/voice/voice-catalog";
import { playVoicePreview, stopVoicePreview } from "@/lib/voice/play-preview";
import {
  getSelectedVoice,
  selectCatalogVoice,
  setStudioMode,
} from "@/lib/voice/selected-voice";
import { VoiceAvatar } from "@/components/voice/VoiceAvatar";
import "@/pages/voice-studio.css";

export default function Catalogue() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Tous");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => getSelectedVoice()?.id ?? null,
  );

  useEffect(() => {
    setStudioMode("voice");
    return () => stopVoicePreview();
  }, []);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of VOICE_CATALOG) {
      counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
    }
    const grouped: Array<{ label: string; count: number }> = [];
    counts.forEach((count, label) => grouped.push({ label, count }));
    return [{ label: "Tous", count: VOICE_CATALOG.length }, ...grouped];
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return VOICE_CATALOG.filter((entry) => {
      const matchCategory =
        category === "Tous" || entry.category === category;
      const matchQuery =
        !needle ||
        entry.name.toLowerCase().includes(needle) ||
        entry.description.toLowerCase().includes(needle);
      return matchCategory && matchQuery;
    });
  }, [query, category]);

  const togglePreview = (entry: VoiceCatalogEntry) => {
    if (playingId === entry.id) {
      stopVoicePreview();
      setPlayingId(null);
      return;
    }
    setPlayingId(entry.id);
    playVoicePreview(entry.id, entry.previewUrl, () => setPlayingId(null));
  };

  const useVoice = (entry: VoiceCatalogEntry) => {
    stopVoicePreview();
    setPlayingId(null);
    setSelectedId(entry.id);
    selectCatalogVoice(entry);
    setLocation("/create?mode=voice");
  };

  return (
    <div className="voice-catalog-page">
      <h1 className="voice-catalog-page__title">Catalogue</h1>
      <p className="voice-catalog-page__lead">
        Choisis une voix, écoute l’extrait, puis lance-la dans Voix IA.
      </p>
      <p className="voice-catalog-page__count">
        {VOICE_CATALOG.length} voix prêtes — écoute un extrait, puis utilise la
        voix dans le studio.
      </p>

      <label className="voice-catalog-search">
        <Search className="h-4 w-4" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Chercher une voix…"
          aria-label="Chercher une voix"
        />
      </label>

      <div className="voice-catalog-chips" role="tablist" aria-label="Catégories">
        {categories.map((item) => (
          <button
            key={item.label}
            type="button"
            role="tab"
            aria-selected={category === item.label}
            className={`voice-chip${category === item.label ? " is-active" : ""}`}
            onClick={() => setCategory(item.label)}
          >
            {item.label}
            <span className="voice-chip__count">{item.count}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="voice-catalog-empty">Aucune voix ne correspond.</p>
      ) : (
        <div className="voice-catalog-grid">
          {visible.map((entry) => {
            const isPlaying = playingId === entry.id;
            const isSelected = selectedId === entry.id;
            return (
              <article key={entry.id} className="voice-card">
                <button
                  type="button"
                  className="voice-card__avatar-button"
                  onClick={() => togglePreview(entry)}
                  aria-label={
                    isPlaying
                      ? `Pause ${entry.name}`
                      : `Écouter ${entry.name}`
                  }
                >
                  <VoiceAvatar
                    id={entry.id}
                    name={entry.name}
                    active={isSelected}
                  />
                </button>
                <strong className="voice-card__name">{entry.name}</strong>
                <span className="voice-card__category">
                  {entry.category.toUpperCase()}
                </span>
                <button
                  type="button"
                  className={`voice-card__play${isPlaying ? " is-playing" : ""}`}
                  onClick={() => togglePreview(entry)}
                  aria-label={
                    isPlaying
                      ? `Pause ${entry.name}`
                      : `Écouter ${entry.name}`
                  }
                >
                  {isPlaying ? (
                    <Pause className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  className={`voice-card__use${isSelected ? " is-active" : ""}`}
                  onClick={() => useVoice(entry)}
                >
                  Utiliser
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
