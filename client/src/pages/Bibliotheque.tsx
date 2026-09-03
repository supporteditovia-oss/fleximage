import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Pause, Play } from "lucide-react";
import {
  VOICE_CATALOG,
  type VoiceCatalogEntry,
} from "@/lib/voice/voice-catalog";
import { playVoicePreview, stopVoicePreview } from "@/lib/voice/play-preview";
import {
  selectCatalogVoice,
} from "@/lib/voice/selected-voice";
import "@/pages/voice-studio.css";

export default function Bibliotheque() {
  const [, setLocation] = useLocation();
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => () => stopVoicePreview(), []);

  const togglePlay = (entry: VoiceCatalogEntry) => {
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
    selectCatalogVoice(entry);
    setLocation("/create?mode=voice");
  };

  return (
    <div className="voice-studio-page">
      <div className="voice-studio-page__inner voice-studio-page__inner--wide">
        <p className="voice-studio-page__eyebrow">Bibliothèque</p>
        <h1 className="voice-studio-page__title">Voix IA</h1>
        <p className="biblio-catalog__intro">
          {VOICE_CATALOG.length} rappeurs FR — écoute un extrait réel (MP3),
          puis lance la voix dans le studio.
        </p>

        <div className="biblio-catalog">
          <div className="biblio-catalog__grid">
            {VOICE_CATALOG.map((entry) => {
              const isPlaying = playingId === entry.id;
              return (
                <article key={entry.id} className="vs-card vs-card--list">
                  <div className="vs-cloned-row" style={{ display: "flex", gap: "0.75rem", alignItems: "center", width: "100%" }}>
                    <span
                      className="vs-cloned-row__avatar"
                      aria-hidden
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(201,162,39,0.15)",
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      {entry.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="vs-cloned-row__copy" style={{ flex: 1, minWidth: 0 }}>
                      <strong>{entry.name}</strong>
                      <span style={{ display: "block", fontSize: 12, opacity: 0.65 }}>
                        {entry.description}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={`vs-cloned-row__replay${isPlaying ? " is-playing" : ""}`}
                      aria-label={
                        isPlaying
                          ? `Pause ${entry.name}`
                          : `Écouter ${entry.name}`
                      }
                      onClick={() => togglePlay(entry)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 999,
                        border: "1px solid rgba(0,0,0,0.12)",
                        background: isPlaying ? "#1a1408" : "#fff",
                        color: isPlaying ? "#f5e6b8" : "#1a1408",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isPlaying ? (
                        <Pause className="h-3.5 w-3.5" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => useVoice(entry)}
                      style={{
                        borderRadius: 999,
                        border: 0,
                        padding: "0.45rem 0.85rem",
                        fontSize: 12,
                        fontWeight: 600,
                        background:
                          "linear-gradient(135deg,#e8c547 0%,#c9a227 45%,#8b6914 100%)",
                        color: "#1a1408",
                      }}
                    >
                      Utiliser
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, opacity: 0.55, marginTop: "1rem" }}>
          Les aperçus sont des voix masculines FR (plus le robot féminin du navigateur).
          Pour un clone 1:1, importe un extrait audio dans le studio.
        </p>

        <div style={{ textAlign: "center", marginTop: "0.75rem" }}>
          <Link href="/create?mode=voice" style={{ fontWeight: 600 }}>
            Ouvrir le studio Voix IA →
          </Link>
        </div>
      </div>
    </div>
  );
}
