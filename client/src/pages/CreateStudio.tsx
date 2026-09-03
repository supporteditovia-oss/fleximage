import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Loader2, Pause, Play, Share2, Upload, X } from "lucide-react";
import { getVoiceCatalogEntry } from "@/lib/voice/voice-catalog";
import { playVoicePreview, stopVoicePreview } from "@/lib/voice/play-preview";
import {
  getSelectedVoice,
  setSelectedVoice,
  setStudioMode,
  type SelectedVoice,
  type StudioMode,
} from "@/lib/voice/selected-voice";
import { useToast } from "@/hooks/use-toast";
import "@/pages/voice-studio.css";

type StudioTab = "voix" | "generer";

export default function CreateStudio() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [mode, setMode] = useState<StudioMode>("voice");
  const [tab, setTab] = useState<StudioTab>("voix");
  const [selected, setSelected] = useState<SelectedVoice | null>(null);
  const [script, setScript] = useState("");
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
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

  const catalogEntry = useMemo(() => {
    if (!selected || selected.kind !== "catalog") return null;
    return getVoiceCatalogEntry(selected.id) ?? null;
  }, [selected]);

  const switchMode = (next: StudioMode) => {
    stopVoicePreview();
    setPreviewPlaying(false);
    setStudioMode(next);
    setLocation(next === "image" ? "/generate" : "/create?mode=voice");
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

  const onImportAudio = (file: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      setSelectedVoice({
        kind: "cloned",
        id: `clone-${Date.now()}`,
        name: file.name.replace(/\.[^.]+$/, "").slice(0, 24) || "Ma voix",
        category: "Ma voix",
      });
      setSelected(getSelectedVoice());
      toast({
        title: "Extrait importé",
        description:
          "Le clonage Fish Audio s’active dès que la clé serveur est configurée.",
      });
    } finally {
      setBusy(false);
    }
  };

  const canGenerate = Boolean(selected) && script.trim().length >= 2;

  return (
    <div className="voice-studio-page">
      <div className="voice-studio-page__inner voice-studio-page__inner--wide">
        <div className="mode-switch" role="tablist" aria-label="Mode du studio">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "image"}
            className={mode === "image" ? "is-active" : ""}
            onClick={() => switchMode("image")}
          >
            Image IA
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "voice"}
            className={mode === "voice" ? "is-active" : ""}
            onClick={() => switchMode("voice")}
          >
            Voix IA
          </button>
        </div>

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
                  aria-label="Importer un extrait"
                >
                  <Upload className="h-4 w-4" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="audio/*,video/*"
                  hidden
                  onChange={(event) =>
                    onImportAudio(event.target.files?.[0] ?? null)
                  }
                />
                <button
                  type="button"
                  className="vs-primary-button"
                  disabled={!canGenerate || busy}
                  onClick={() => {
                    setTab("generer");
                    toast({
                      title: "Génération vocale",
                      description:
                        "Le rendu Fish Audio se branche dès que la clé serveur est présente.",
                    });
                  }}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Générer la voix"
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="vs-result">
              <p className="vs-help">
                Tes rendus apparaîtront ici. Le rendu audio nécessite la clé
                Fish Audio côté serveur.
              </p>
              <div className="vs-actions">
                <button
                  type="button"
                  className="vs-icon-button"
                  disabled
                  aria-label="Écouter le rendu"
                >
                  <Play className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="vs-icon-button"
                  disabled
                  aria-label="Partager"
                >
                  <Share2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="vs-primary-button"
                  onClick={() => setTab("voix")}
                >
                  Modifier le texte
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
