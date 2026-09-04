import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Loader2, Pause, Play, Trash2, Upload, X } from "lucide-react";
import { getVoiceCatalogEntry } from "@/lib/voice/voice-catalog";
import { playVoicePreview, stopVoicePreview } from "@/lib/voice/play-preview";
import {
  getSelectedVoice,
  setSelectedVoice,
  setStudioMode,
  type SelectedVoice,
  type StudioMode,
} from "@/lib/voice/selected-voice";
import {
  cloneVoice,
  deleteVoiceGenerations,
  fetchVoiceHistory,
  fileToDataUrl,
  generateVoice,
  type VoiceGeneration,
} from "@/lib/voice/voice-api";
import { StudioModeSwitch } from "@/components/voice/StudioModeSwitch";
import { useToast } from "@/hooks/use-toast";
import "@/pages/voice-studio.css";

type StudioTab = "voix" | "generer";

/** Local link between a saved clone and its Fish Audio model. */
const CLONE_KEY = "luxeflexia:voice-clone-ids";

function rememberClone(id: string, fishReferenceId: string) {
  try {
    const raw = window.localStorage.getItem(CLONE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    map[id] = fishReferenceId;
    window.localStorage.setItem(CLONE_KEY, JSON.stringify(map));
  } catch {
    /* private mode */
  }
}

export default function CreateStudio() {
  const [location] = useLocation();
  const { toast } = useToast();
  const [mode, setMode] = useState<StudioMode>("voice");
  const [tab, setTab] = useState<StudioTab>("voix");
  const [selected, setSelected] = useState<SelectedVoice | null>(null);
  const [script, setScript] = useState("");
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<VoiceGeneration | null>(null);
  const [history, setHistory] = useState<VoiceGeneration[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const search = location.includes("?")
      ? location.split("?")[1]
      : window.location.search;
    const nextMode =
      new URLSearchParams(search).get("mode") === "image" ? "image" : "voice";
    setMode(nextMode);
    setStudioMode(nextMode);
    setSelected(getSelectedVoice());
  }, [location]);

  useEffect(() => {
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<SelectedVoice | null>).detail;
      setSelected(detail ?? getSelectedVoice());
    };
    window.addEventListener("luxeflexia:selected-voice", sync);
    return () => {
      window.removeEventListener("luxeflexia:selected-voice", sync);
      stopVoicePreview();
    };
  }, []);

  const loadHistory = async () => {
    try {
      const { items } = await fetchVoiceHistory(20);
      setHistory(items);
    } catch {
      /* history is best-effort */
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const catalogEntry = useMemo(() => {
    if (!selected || selected.kind !== "catalog") return null;
    return getVoiceCatalogEntry(selected.id) ?? null;
  }, [selected]);

  const play = (id: string, url: string) => {
    if (playingId === id) {
      stopVoicePreview();
      setPlayingId(null);
      return;
    }
    setPlayingId(id);
    playVoicePreview(id, url, () =>
      setPlayingId((current) => (current === id ? null : current)),
    );
  };

  const togglePreview = () => {
    if (!catalogEntry) return;
    if (previewPlaying) {
      stopVoicePreview();
      setPreviewPlaying(false);
      return;
    }
    setPreviewPlaying(true);
    playVoicePreview(catalogEntry.id, catalogEntry.previewUrl, () =>
      setPreviewPlaying(false),
    );
  };

  const clearVoice = () => {
    stopVoicePreview();
    setPreviewPlaying(false);
    setSelectedVoice(null);
    setSelected(null);
  };

  const onImportAudio = async (file: File | null) => {
    if (!file) return;
    setCloning(true);
    try {
      const audioDataUrl = await fileToDataUrl(file);
      const name = file.name.replace(/\.[^.]+$/, "").slice(0, 24) || "Ma voix";
      const { clone, fishReferenceId } = await cloneVoice({
        name,
        audioDataUrl,
        sourceType: "import",
        sourceLabel: file.name,
      });
      rememberClone(clone.id, fishReferenceId);
      setSelectedVoice({
        kind: "cloned",
        id: clone.id,
        name: clone.name,
        category: "Ma voix",
      });
      setSelected(getSelectedVoice());
      toast({
        title: "Voix clonée",
        description: `${clone.name} est prête. Écris ton texte puis génère.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Clonage impossible",
        description: error?.message || "Réessaie avec un extrait plus court.",
      });
    } finally {
      setCloning(false);
    }
  };

  const onGenerate = async () => {
    if (!selected || script.trim().length < 2) return;
    setGenerating(true);
    stopVoicePreview();
    setPreviewPlaying(false);
    try {
      const payload =
        selected.kind === "cloned"
          ? { voiceCloneId: selected.id }
          : { fishReferenceId: catalogEntry?.fishReferenceId ?? null };
      const { generation } = await generateVoice({
        text: script.trim(),
        voiceName: selected.name,
        ...payload,
      });
      setResult(generation);
      setTab("generer");
      void loadHistory();
      play(generation.id, generation.audio_url);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Génération impossible",
        description: error?.message || "Réessaie dans un instant.",
      });
    } finally {
      setGenerating(false);
    }
  };

  const onDelete = async (id: string) => {
    try {
      await deleteVoiceGenerations([id]);
      setHistory((items) => items.filter((item) => item.id !== id));
      if (result?.id === id) setResult(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Suppression impossible",
        description: error?.message || "Réessaie.",
      });
    }
  };

  const canGenerate = Boolean(selected) && script.trim().length >= 2;

  return (
    <div className="voice-studio-page">
      <div className="voice-studio-page__inner voice-studio-page__inner--wide">
        <StudioModeSwitch mode={mode} />

        <section className="vs-voice-hero" aria-label="Voix active">
          <span className="vs-voice-hero__dot" aria-hidden />
          <p className="vs-voice-hero__label">Voix active</p>
          {selected ? (
            <>
              <h2 className="vs-voice-hero__name">{selected.name}</h2>
              <span className="vs-voice-hero__tag">
                {selected.category.toUpperCase()}
              </span>
              <div className="vs-voice-hero__actions">
                <Link href="/catalogue" className="vs-voice-hero__link">
                  Changer dans Catalogue
                </Link>
                <button
                  type="button"
                  className="vs-voice-hero__clear"
                  onClick={clearVoice}
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                  Supprimer
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="vs-voice-hero__name vs-voice-hero__name--empty">
                Aucune voix
              </h2>
              <div className="vs-voice-hero__actions">
                <Link href="/catalogue" className="vs-voice-hero__link">
                  Choisir dans Catalogue
                </Link>
              </div>
            </>
          )}
        </section>

        <section className="vs-card">
          <h3 className="vs-card__title">Générer la voix</h3>
          <p className="vs-card__sub">Écris ton texte puis génère.</p>

          <div className="vs-tabs" role="tablist" aria-label="Étapes">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "voix"}
              className={`vs-tab${tab === "voix" ? " is-active" : ""}`}
              onClick={() => setTab("voix")}
            >
              Voix
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "generer"}
              className={`vs-tab${tab === "generer" ? " is-active" : ""}`}
              onClick={() => setTab("generer")}
            >
              Générer
            </button>
          </div>

          {tab === "voix" ? (
            <>
              <p className="vs-label">Voix sélectionnée</p>
              <div className="vs-input vs-input--locked">
                {selected ? selected.name : "Choisis une voix dans Catalogue"}
              </div>

              <p className="vs-label">Ton texte</p>
              <textarea
                className="vs-script"
                value={script}
                onChange={(event) => setScript(event.target.value)}
                placeholder="Ce soir, direction Dubai Marina. La suite est réservée, la soirée aussi."
                rows={4}
              />
              <p className="vs-help vs-help--tight">
                Prénoms et noms de rappeurs : écris « Kaaris », « Damso », etc. —
                la prononciation suit le texte.
              </p>

              <div className="vs-actions">
                <button
                  type="button"
                  className="vs-icon-button"
                  onClick={togglePreview}
                  disabled={!catalogEntry}
                  aria-label="Écouter la voix"
                >
                  {previewPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  className="vs-icon-button"
                  onClick={() => fileRef.current?.click()}
                  disabled={cloning}
                  aria-label="Importer un extrait pour cloner une voix"
                >
                  {cloning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="audio/*,video/*"
                  hidden
                  onChange={(event) =>
                    void onImportAudio(event.target.files?.[0] ?? null)
                  }
                />
                <button
                  type="button"
                  className="vs-primary-button"
                  disabled={!canGenerate || generating || cloning}
                  onClick={() => void onGenerate()}
                >
                  {generating ? (
                    <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  ) : (
                    "Générer la voix"
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="vs-result">
              {result ? (
                <>
                  <p className="vs-label">Dernier rendu</p>
                  <div className="vs-input vs-input--locked">{result.text}</div>
                  <div className="vs-actions">
                    <button
                      type="button"
                      className="vs-icon-button"
                      onClick={() => play(result.id, result.audio_url)}
                      aria-label="Écouter le rendu"
                    >
                      {playingId === result.id ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </button>
                    <a
                      className="vs-primary-button"
                      href={result.audio_url}
                      download
                      style={{ textAlign: "center", textDecoration: "none" }}
                    >
                      Télécharger le MP3
                    </a>
                  </div>
                </>
              ) : (
                <p className="vs-help">
                  Aucun rendu pour l’instant. Écris un texte dans l’onglet Voix
                  puis lance la génération.
                </p>
              )}

              {history.length > 0 && (
                <>
                  <p className="vs-label">Historique</p>
                  <ul className="vs-history-list">
                    {history.map((item) => (
                      <li key={item.id} className="vs-history-item">
                        <button
                          type="button"
                          className="vs-icon-button"
                          onClick={() => play(item.id, item.audio_url)}
                          aria-label={`Écouter ${item.voice_name ?? "le rendu"}`}
                        >
                          {playingId === item.id ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </button>
                        <span className="vs-history-copy">
                          <strong>{item.voice_name ?? "Voix"}</strong>
                          <span>{item.text.slice(0, 60)}</span>
                        </span>
                        <button
                          type="button"
                          className="vs-icon-button"
                          onClick={() => void onDelete(item.id)}
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
