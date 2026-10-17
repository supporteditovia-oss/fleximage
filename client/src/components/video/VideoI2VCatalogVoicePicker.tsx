import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Loader2, Pause, Play } from "lucide-react";
import {
  findI2VLibraryVoiceById,
  listActiveI2VLibraryVoices,
  resolveDefaultI2VLibraryVoiceId,
  type I2VLibraryVoice,
} from "@/lib/i2v-voice-library";
import {
  prefetchCatalogPreviews,
  speakCatalogSample,
  stopCatalogSample,
} from "@/lib/v2-mock-voice";

type GenderFilter = "homme" | "femme";

type VideoI2VCatalogVoicePickerProps = {
  selectedVoiceId: string | null;
  onSelectedVoiceId: (voice: I2VLibraryVoice) => void;
};

export function defaultI2VCatalogFishReferenceId(): string {
  const voice = findI2VLibraryVoiceById(resolveDefaultI2VLibraryVoiceId());
  return voice?.fishId ?? "";
}

export function VideoI2VCatalogVoicePicker({
  selectedVoiceId,
  onSelectedVoiceId,
}: VideoI2VCatalogVoicePickerProps) {
  const voices = useMemo(() => listActiveI2VLibraryVoices(), []);
  const [filter, setFilter] = useState<GenderFilter>("femme");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);
  const stopPreviewRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    prefetchCatalogPreviews(
      voices.map((voice) => ({ fishReferenceId: voice.fishId })),
    );
    return () => {
      stopPreviewRef.current?.();
      stopCatalogSample();
    };
  }, [voices]);

  const filtered = useMemo(
    () => voices.filter((v) => v.gender === filter),
    [filter, voices],
  );

  const hommeCount = voices.filter((v) => v.gender === "homme").length;
  const femmeCount = voices.filter((v) => v.gender === "femme").length;

  const previewVoice = (voice: I2VLibraryVoice, event: MouseEvent) => {
    event.stopPropagation();
    if (previewId === voice.id || loadingPreviewId === voice.id) {
      stopPreviewRef.current?.();
      stopPreviewRef.current = null;
      setPreviewId(null);
      setLoadingPreviewId(null);
      return;
    }
    stopPreviewRef.current?.();
    setLoadingPreviewId(voice.id);
    setPreviewId(null);
    stopPreviewRef.current = speakCatalogSample(
      {
        name: voice.name,
        fishReferenceId: voice.fishId,
        pitch: 1,
        rate: 1,
      },
      {
        onLoading: () => setLoadingPreviewId(voice.id),
        onPlaying: () => {
          setLoadingPreviewId(null);
          setPreviewId(voice.id);
        },
        onEnd: () => {
          setPreviewId(null);
          setLoadingPreviewId(null);
        },
      },
    );
  };

  return (
    <div className="via-i2v-voice-catalog">
      <p className="via-step-label">
        Bibliothèque voix admin ({voices.length})
      </p>
      <p className="via-voice-addon__hint via-voice-addon__hint--panel">
        5 hommes · 5 femmes — ▶ aperçu Fish (phrase courte, préchargé). Choisis
        une carte puis active « Ajouter une voix IA » pour générer.
      </p>
      <div className="via-i2v-voice-catalog__filters" role="tablist" aria-label="Genre">
        <button
          type="button"
          role="tab"
          aria-selected={filter === "femme"}
          className={`via-i2v-voice-catalog__filter${filter === "femme" ? " is-active" : ""}`}
          onClick={() => setFilter("femme")}
        >
          Femmes ({femmeCount})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === "homme"}
          className={`via-i2v-voice-catalog__filter${filter === "homme" ? " is-active" : ""}`}
          onClick={() => setFilter("homme")}
        >
          Hommes ({hommeCount})
        </button>
      </div>
      <div className="via-i2v-voice-catalog__grid" role="list">
        {filtered.map((voice) => {
          const selected = selectedVoiceId === voice.id;
          const isPlaying = previewId === voice.id;
          const isLoading = loadingPreviewId === voice.id;
          return (
            <div key={voice.id} role="listitem" className="via-i2v-voice-catalog__item">
              <button
                type="button"
                className={`via-i2v-voice-catalog__card${selected ? " is-selected" : ""}`}
                onClick={() => onSelectedVoiceId(voice)}
              >
                <span className="via-i2v-voice-catalog__name">{voice.name}</span>
                <span className="via-i2v-voice-catalog__tag">{voice.styleFr}</span>
              </button>
              <button
                type="button"
                className="via-i2v-voice-catalog__preview"
                aria-label={`Écouter ${voice.name}`}
                onClick={(e) => previewVoice(voice, e)}
              >
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : isPlaying ? (
                  <Pause className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Play className="h-3.5 w-3.5" aria-hidden />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
