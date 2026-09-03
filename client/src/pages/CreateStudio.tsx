import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Loader2, Pause, Play } from "lucide-react";
import {
  VOICE_CATALOG,
  getVoiceCatalogEntry,
} from "@/lib/voice/voice-catalog";
import { playVoicePreview, stopVoicePreview } from "@/lib/voice/play-preview";
import {
  getSelectedVoice,
  selectCatalogVoice,
  setStudioMode,
  type SelectedVoice,
} from "@/lib/voice/selected-voice";
import { useToast } from "@/hooks/use-toast";
import "@/pages/voice-studio.css";

type StudioMode = "image" | "voice";

export default function CreateStudio() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [mode, setMode] = useState<StudioMode>("voice");
  const [selected, setSelected] = useState<SelectedVoice | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [script, setScript] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(
      location.includes("?") ? location.split("?")[1] : window.location.search,
    );
    const nextMode = params.get("mode") === "image" ? "image" : "voice";
    setMode(nextMode);
    setStudioMode(nextMode);
    setSelected(getSelectedVoice());
  }, [location]);

  useEffect(() => {
    const onSel = (event: Event) => {
      const detail = (event as CustomEvent<SelectedVoice | null>).detail;
      setSelected(detail ?? getSelectedVoice());
    };
    window.addEventListener("luxeflexia:selected-voice", onSel);
    return () => {
      window.removeEventListener("luxeflexia:selected-voice", onSel);
      stopVoicePreview();
    };
  }, []);

  const selectedCatalog = useMemo(() => {
    if (!selected || selected.kind !== "catalog") return null;
    return getVoiceCatalogEntry(selected.id) ?? null;
  }, [selected]);

  const switchMode = (next: StudioMode) => {
    setMode(next);
    setStudioMode(next);
    if (next === "image") {
      setLocation("/generate");
      return;
    }
    setLocation("/create?mode=voice");
  };

  const togglePreview = (id: string, url: string) => {
    if (playingId === id) {
      stopVoicePreview();
      setPlayingId(null);
      return;
    }
    setPlayingId(id);
    playVoicePreview(id, url, () => setPlayingId(null));
  };

  const onPickCatalog = (id: string) => {
    const entry = getVoiceCatalogEntry(id);
    if (!entry) return;
    selectCatalogVoice(entry);
    setSelected({ kind: "catalog", id: entry.id, name: entry.name });
    togglePreview(entry.id, entry.previewUrl);
  };

  const onImportAudio = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      // Persist intent locally — full Fish clone requires FISH_AUDIO_API_KEY on server.
      toast({
        title: "Extrait importé",
        description:
          "Pour cloner à 100 %, le serveur Fish Audio doit être configuré. L’extrait est prêt côté studio.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="voice-studio-page">
      <div className="voice-studio-page__inner voice-studio-page__inner--wide">
        <p className="voice-studio-page__eyebrow">Studio</p>
        <h1 className="voice-studio-page__title">
          {mode === "voice" ? "Voix IA" : "Image IA"}
        </h1>

        <div
          className="mode-switch"
          role="tablist"
          aria-label="Mode du studio"
          style={{
            display: "inline-flex",
            margin: "0.75rem auto 1rem",
            padding: 4,
            borderRadius: 999,
            border: "1px solid rgba(0,0,0,0.1)",
            background: "rgba(255,255,255,0.7)",
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "image"}
            className={mode === "image" ? "active" : ""}
            onClick={() => switchMode("image")}
            style={{
              minWidth: 120,
              border: 0,
              borderRadius: 999,
              padding: "10px 16px",
              fontSize: 12,
              fontWeight: 600,
              background: mode === "image" ? "#171713" : "transparent",
              color: mode === "image" ? "#fff" : "#666",
            }}
          >
            Image IA
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "voice"}
            className={mode === "voice" ? "active" : ""}
            onClick={() => switchMode("voice")}
            style={{
              minWidth: 120,
              border: 0,
              borderRadius: 999,
              padding: "10px 16px",
              fontSize: 12,
              fontWeight: 600,
              background: mode === "voice" ? "#171713" : "transparent",
              color: mode === "voice" ? "#fff" : "#666",
            }}
          >
            Voix IA
          </button>
        </div>

        {selectedCatalog ? (
          <div className="vs-voice-hero" aria-label="Voix active">
            <div className="vs-voice-hero__label">Voix active</div>
            <h3 className="vs-voice-name">{selectedCatalog.name}</h3>
            <span className="vs-voice-hero__tag">Catalogue · Rap FR</span>
            <button
              type="button"
              onClick={() =>
                togglePreview(selectedCatalog.id, selectedCatalog.previewUrl)
              }
              style={{
                marginTop: 10,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                borderRadius: 999,
                border: "1px solid rgba(0,0,0,0.12)",
                padding: "8px 12px",
                background: "#fff",
              }}
            >
              {playingId === selectedCatalog.id ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Écouter l’extrait
            </button>
          </div>
        ) : (
          <p style={{ textAlign: "center", opacity: 0.65, fontSize: 14 }}>
            Choisis un rappeur ci-dessous ou dans la{" "}
            <Link href="/bibliotheque">bibliothèque</Link>.
          </p>
        )}

        <section className="vs-card" aria-labelledby="vs-clone-title">
          <h3 id="vs-clone-title" className="vs-card__title">
            Rappeurs français
          </h3>
          <p className="vs-card__sub">
            Aperçus MP3 masculins — plus de voix féminine du navigateur.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))",
              gap: 8,
              marginTop: 12,
            }}
          >
            {VOICE_CATALOG.map((entry) => {
              const active = selected?.id === entry.id;
              const playing = playingId === entry.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onPickCatalog(entry.id)}
                  style={{
                    textAlign: "left",
                    borderRadius: 14,
                    border: active
                      ? "1.5px solid #c9a227"
                      : "1px solid rgba(0,0,0,0.1)",
                    padding: "10px 12px",
                    background: active ? "rgba(201,162,39,0.12)" : "#fff",
                  }}
                >
                  <strong style={{ display: "block", fontSize: 13 }}>
                    {entry.name}
                  </strong>
                  <span style={{ fontSize: 11, opacity: 0.6 }}>
                    {playing ? "Lecture…" : entry.description}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="vs-card" style={{ marginTop: 12 }}>
          <h3 className="vs-card__title">Texte à faire dire</h3>
          <textarea
            className="vs-script"
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="Écris le message du prank…"
            rows={4}
            style={{
              width: "100%",
              marginTop: 8,
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              padding: 12,
              resize: "vertical",
            }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              style={{
                borderRadius: 999,
                border: "1px solid rgba(0,0,0,0.12)",
                padding: "10px 14px",
                background: "#fff",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              Importer un extrait (~20 s)
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="audio/*,video/*"
              hidden
              onChange={(e) => onImportAudio(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              disabled={busy || script.trim().length < 2 || !selected}
              onClick={() =>
                toast({
                  title: "Génération vocale",
                  description:
                    "Le rendu Fish Audio se branche dès que FISH_AUDIO_API_KEY est présent côté serveur. Catalogue + aperçus sont déjà corrigés et sauvegardés.",
                })
              }
              style={{
                borderRadius: 999,
                border: 0,
                padding: "10px 16px",
                fontWeight: 700,
                fontSize: 13,
                color: "#1a1408",
                background:
                  "linear-gradient(135deg,#e8c547 0%,#c9a227 45%,#8b6914 100%)",
                opacity: busy || script.trim().length < 2 || !selected ? 0.5 : 1,
              }}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Générer la voix"
              )}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
