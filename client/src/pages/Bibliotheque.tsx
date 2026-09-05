import { useEffect, useMemo, useRef, useState } from "react";
import { Redirect, useLocation } from "wouter";
import { Loader2, Pause, Play, Search } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useV2Access } from "@/hooks/use-v2-access";
import { AuthResolveShell } from "@/components/v2/AuthResolveShell";
import {
  MOCK_VOICE_CATALOG,
  VOICE_CATALOG_FILTERS,
  speakCatalogSample,
  stopCatalogSample,
  type VoiceCategory,
} from "@/lib/v2-mock-voice";
import {
  readSelectedCatalogVoiceId,
  readStudioMode,
  writeSelectedCatalogVoiceId,
  writeStudioMode,
  type StudioMode,
} from "@/lib/v2-experience";
import { useLarpHistory } from "@/hooks/use-larps";
import { cn } from "@/lib/utils";
import "./bibliotheque-page.css";

type CatalogFilter = (typeof VOICE_CATALOG_FILTERS)[number];

function getAssetUrls(assets: string[] | string | null | undefined): string[] {
  if (!assets) return [];
  if (Array.isArray(assets)) return assets;
  try {
    const parsed = JSON.parse(assets);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatCreatedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function ImageLibrary() {
  const { data: larps, isPending, isError } = useLarpHistory();

  const imageItems = useMemo(() => {
    const rows = larps ?? [];
    return rows
      .filter((item) => item.status === "success")
      .map((item) => {
        const urls = getAssetUrls(item.outputAssets);
        if (urls.length === 0) return null;
        return {
          id: item.id,
          url: urls[0],
          createdAt: item.createdAt,
          label: item.template?.name ?? "Image IA",
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      url: string;
      createdAt: string;
      label: string;
    }>;
  }, [larps]);

  if (isPending) {
    return (
      <div className="bibliotheque-v2__empty">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--lx-gold)]" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="bibliotheque-v2__empty">Impossible de charger les images.</p>
    );
  }

  if (imageItems.length === 0) {
    return (
      <p className="bibliotheque-v2__empty">Aucune image pour le moment.</p>
    );
  }

  return (
    <div className="bibliotheque-v2__images">
      {imageItems.map((item) => (
        <article key={item.id} className="bibliotheque-v2__image-card">
          <img src={item.url} alt={item.label} loading="lazy" />
          <div className="bibliotheque-v2__meta">
            <p className="bibliotheque-v2__meta-title">{item.label}</p>
            <p className="bibliotheque-v2__meta-sub">
              {formatCreatedAt(item.createdAt)}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}

function VoiceCatalogLibrary() {
  const [, navigate] = useLocation();
  const [filter, setFilter] = useState<CatalogFilter>("Tous");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    readSelectedCatalogVoiceId(),
  );
  const [previewId, setPreviewId] = useState<string | null>(null);
  const stopSpeakRef = useRef<(() => void) | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_VOICE_CATALOG.filter((v) => {
      if (filter !== "Tous" && v.category !== filter) return false;
      if (!q) return true;
      return (
        v.name.toLowerCase().includes(q) ||
        (v.category ?? "").toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q)
      );
    });
  }, [filter, query]);

  useEffect(() => {
    return () => {
      stopSpeakRef.current?.();
      stopCatalogSample();
    };
  }, []);

  useEffect(() => {
    const sync = () => setSelectedId(readSelectedCatalogVoiceId());
    window.addEventListener("luxeflexia:selected-voice", sync as EventListener);
    return () => {
      window.removeEventListener(
        "luxeflexia:selected-voice",
        sync as EventListener,
      );
    };
  }, []);

  const categoryCount = (cat: CatalogFilter) => {
    if (cat === "Tous") return MOCK_VOICE_CATALOG.length;
    return MOCK_VOICE_CATALOG.filter(
      (v) => v.category === (cat as VoiceCategory),
    ).length;
  };

  const selectVoice = (id: string, play = true) => {
    const voice = MOCK_VOICE_CATALOG.find((v) => v.id === id);
    if (!voice) return;

    setSelectedId(id);
    writeSelectedCatalogVoiceId(id);
    writeStudioMode("voice");

    if (play) {
      stopSpeakRef.current?.();
      setPreviewId(id);
      stopSpeakRef.current = speakCatalogSample(voice, () => {
        setPreviewId(null);
        stopSpeakRef.current = null;
      });
    }
  };

  const useVoice = (id: string) => {
    selectVoice(id, false);
    stopSpeakRef.current?.();
    stopCatalogSample();
    navigate("/create");
  };

  return (
    <div className="biblio-catalog">
      <p className="biblio-catalog__intro">
        {MOCK_VOICE_CATALOG.length} voix prêtes — écoute un extrait, puis utilise
        la voix dans le studio.
      </p>

      <div className="biblio-catalog__toolbar">
        <label className="biblio-catalog__search">
          <Search className="h-3.5 w-3.5" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher une voix…"
            aria-label="Chercher dans le catalogue"
          />
        </label>
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
              className={cn(
                "biblio-catalog__chip",
                filter === f && "is-active",
              )}
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
          return (
            <div
              key={voice.id}
              role="listitem"
              className={cn(
                "biblio-catalog__item",
                selected && "is-selected",
                previewing && "is-playing",
              )}
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
                  <span className="biblio-catalog__initials">
                    {voice.initials}
                  </span>
                )}
              </span>
              <span className="biblio-catalog__name">{voice.name}</span>
              <span className="biblio-catalog__tag">{voice.category}</span>
              <button
                type="button"
                className="biblio-catalog__play-btn"
                onClick={() => {
                  if (previewId === voice.id) {
                    stopSpeakRef.current?.();
                    setPreviewId(null);
                    return;
                  }
                  selectVoice(voice.id, true);
                }}
                aria-label={`${voice.name}. ${previewing ? "Arrêter" : "Écouter"}`}
              >
                {previewing ? (
                  <Pause className="h-3 w-3" aria-hidden />
                ) : (
                  <Play className="h-3 w-3" aria-hidden />
                )}
              </button>
              <button
                type="button"
                className="biblio-catalog__use"
                onClick={() => useVoice(voice.id)}
              >
                Utiliser
              </button>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="bibliotheque-v2__empty">Aucune voix pour cette recherche.</p>
      ) : null}
    </div>
  );
}

/**
 * Mode Image → bibliothèque photos.
 * Mode Voix → catalogue (à la place de la bibliothèque images).
 */
export default function Bibliotheque() {
  const { isLoading: authLoading } = useAuth();
  const { v2Enabled, isLoading: gateLoading } = useV2Access();
  const [shellTimedOut, setShellTimedOut] = useState(false);
  const [studioMode, setStudioMode] = useState<StudioMode>(() =>
    readStudioMode(),
  );

  const blocking = authLoading || gateLoading;

  useEffect(() => {
    if (!blocking) {
      setShellTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setShellTimedOut(true), 2500);
    return () => window.clearTimeout(timer);
  }, [blocking]);

  useEffect(() => {
    const sync = () => setStudioMode(readStudioMode());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    window.addEventListener("luxeflexia:studio-mode", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener("luxeflexia:studio-mode", sync);
    };
  }, []);

  if (blocking && !shellTimedOut) {
    return <AuthResolveShell />;
  }

  if (!v2Enabled) {
    return <Redirect to="/historique" />;
  }

  const isVoice = studioMode === "voice";

  if (!isVoice) {
    return <Redirect to="/historique" />;
  }

  return (
    <div className="bibliotheque-v2">
      <header className="bibliotheque-v2__header">
        <h1 className="bibliotheque-v2__title">
          {isVoice ? "Catalogue" : "Bibliothèque"}
        </h1>
        <p className="bibliotheque-v2__subtitle">
          {isVoice
            ? "Choisis une voix, écoute l’extrait, puis lance-la dans Voix IA."
            : "Tes créations image — stories et générations."}
        </p>
      </header>

      {isVoice ? <VoiceCatalogLibrary /> : <ImageLibrary />}
    </div>
  );
}
