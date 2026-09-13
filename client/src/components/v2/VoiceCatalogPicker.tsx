import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Loader2, Pause, Play, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MOCK_VOICE_CATALOG,
  VOICE_CATALOG_FILTERS,
  prefetchCatalogPreviews,
  speakCatalogSample,
  stopCatalogSample,
  type MockVoiceProfile,
  type VoiceCatalogFilter,
} from "@/lib/v2-mock-voice";
import "@/pages/bibliotheque-page.css";

type VoiceCatalogPickerProps = {
  selectedId?: string | null;
  onSelect: (voice: MockVoiceProfile) => void;
  defaultFilter?: VoiceCatalogFilter;
  showSearch?: boolean;
  intro?: string;
};

export function VoiceCatalogPicker({
  selectedId = null,
  onSelect,
  defaultFilter = "Rap",
  showSearch = true,
  intro,
}: VoiceCatalogPickerProps) {
  const [filter, setFilter] = useState<VoiceCatalogFilter>(defaultFilter);
  const [query, setQuery] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);
  const stopSpeakRef = useRef<(() => void) | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_VOICE_CATALOG.filter((v) => {
      if (filter === "Homme" && v.gender !== "homme") return false;
      if (filter === "Femme" && v.gender !== "femme") return false;
      if (filter === "Rap" && v.category !== "Rap") return false;
      if (!q) return true;
      return (
        v.name.toLowerCase().includes(q) ||
        (v.category ?? "").toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q)
      );
    });
  }, [filter, query]);

  useEffect(() => {
    prefetchCatalogPreviews(MOCK_VOICE_CATALOG);
    return () => {
      stopSpeakRef.current?.();
      stopCatalogSample();
    };
  }, []);

  const categoryCount = (cat: VoiceCatalogFilter) => {
    if (cat === "Tous") return MOCK_VOICE_CATALOG.length;
    if (cat === "Homme") return MOCK_VOICE_CATALOG.filter((v) => v.gender === "homme").length;
    if (cat === "Femme") return MOCK_VOICE_CATALOG.filter((v) => v.gender === "femme").length;
    return MOCK_VOICE_CATALOG.filter((v) => v.category === "Rap").length;
  };

  const previewVoice = (id: string, event: MouseEvent) => {
    event.stopPropagation();
    const voice = MOCK_VOICE_CATALOG.find((v) => v.id === id);
    if (!voice) return;

    if (previewId === id || loadingPreviewId === id) {
      stopSpeakRef.current?.();
      setPreviewId(null);
      setLoadingPreviewId(null);
      return;
    }

    stopSpeakRef.current?.();
    setPreviewId(null);
    setLoadingPreviewId(null);

    stopSpeakRef.current = speakCatalogSample(voice, {
      onLoading: () => setLoadingPreviewId(id),
      onPlaying: () => {
        setLoadingPreviewId(null);
        setPreviewId(id);
      },
      onEnd: () => {
        setPreviewId(null);
        setLoadingPreviewId(null);
        stopSpeakRef.current = null;
      },
    });
  };

  const selectVoice = (voice: MockVoiceProfile) => {
    stopSpeakRef.current?.();
    stopCatalogSample();
    setPreviewId(null);
    setLoadingPreviewId(null);
    onSelect(voice);
  };

  return (
    <div className="biblio-catalog voice-catalog-picker">
      <p className="biblio-catalog__intro">
        {intro ??
          `${MOCK_VOICE_CATALOG.length} voix prêtes — écoute un extrait, puis sélectionne.`}
      </p>

      <div className="biblio-catalog__toolbar">
        {showSearch ? (
          <label className="biblio-catalog__search">
            <Search className="h-3.5 w-3.5" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Chercher Maes, Niska, Gims…"
              aria-label="Chercher dans le catalogue"
            />
          </label>
        ) : null}
        <div
          className="biblio-catalog__filters"
          role="tablist"
          aria-label="Filtres catalogue"
        >
          {VOICE_CATALOG_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              className={cn("biblio-catalog__chip", filter === f && "is-active")}
              onClick={() => setFilter(f)}
            >
              {f}
              <span>{categoryCount(f)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="biblio-catalog__grid" role="list">
        {filtered.map((voice) => {
          const selected = selectedId === voice.id;
          const previewing = previewId === voice.id;
          const loadingPreview = loadingPreviewId === voice.id;
          return (
            <button
              key={voice.id}
              type="button"
              role="listitem"
              className={cn(
                "biblio-catalog__item biblio-catalog__item--pick",
                selected && "is-selected",
                previewing && "is-playing",
                loadingPreview && "is-loading",
              )}
              onClick={() => selectVoice(voice)}
              aria-pressed={selected}
              aria-label={`Choisir ${voice.name}`}
            >
              <span
                className="biblio-catalog__avatar"
                style={voice.photoUrl ? undefined : { background: voice.accent }}
              >
                {voice.photoUrl ? (
                  <img
                    src={voice.photoUrl}
                    alt=""
                    className="biblio-catalog__photo"
                    loading="lazy"
                    decoding="async"
                    width={70}
                    height={70}
                  />
                ) : (
                  <span className="biblio-catalog__initials">{voice.initials}</span>
                )}
              </span>
              <span className="biblio-catalog__name">{voice.name}</span>
              <span className="biblio-catalog__tag">{voice.category}</span>
              <span
                className="biblio-catalog__play-btn"
                onClick={(e) => previewVoice(voice.id, e)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    previewVoice(voice.id, e as unknown as MouseEvent);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={
                  loadingPreview
                    ? `Chargement ${voice.name}`
                    : previewing
                      ? `Arrêter ${voice.name}`
                      : `Écouter ${voice.name}`
                }
              >
                {loadingPreview ? (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                ) : previewing ? (
                  <Pause className="h-3 w-3" aria-hidden />
                ) : (
                  <Play className="h-3 w-3" aria-hidden />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
