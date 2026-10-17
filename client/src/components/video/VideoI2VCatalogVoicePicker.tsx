import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Loader2, Pause, Play } from "lucide-react";
import {
  MOCK_VOICE_CATALOG,
  prefetchCatalogPreviews,
  speakCatalogSample,
  stopCatalogSample,
  type MockVoiceProfile,
} from "@/lib/v2-mock-voice";

const I2V_NATURAL_VOICES = MOCK_VOICE_CATALOG.filter(
  (v) => v.id === "cat-voix-homme" || v.id === "cat-voix-femme",
);

type VideoI2VCatalogVoicePickerProps = {
  fishReferenceId: string | null;
  onFishReferenceId: (fishId: string, voice: MockVoiceProfile) => void;
};

export function VideoI2VCatalogVoicePicker({
  fishReferenceId,
  onFishReferenceId,
}: VideoI2VCatalogVoicePickerProps) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);
  const stopSpeakRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    prefetchCatalogPreviews(I2V_NATURAL_VOICES);
    return () => {
      stopSpeakRef.current?.();
      stopCatalogSample();
    };
  }, []);

  const previewVoice = (voice: MockVoiceProfile, event: MouseEvent) => {
    event.stopPropagation();
    if (previewId === voice.id || loadingPreviewId === voice.id) {
      stopSpeakRef.current?.();
      setPreviewId(null);
      setLoadingPreviewId(null);
      return;
    }
    stopSpeakRef.current?.();
    stopSpeakRef.current = speakCatalogSample(voice, {
      onLoading: () => setLoadingPreviewId(voice.id),
      onPlaying: () => {
        setLoadingPreviewId(null);
        setPreviewId(voice.id);
      },
      onEnd: () => {
        setPreviewId(null);
        setLoadingPreviewId(null);
        stopSpeakRef.current = null;
      },
    });
  };

  return (
    <div className="via-i2v-voice-catalog">
      <p className="via-step-label">Voix catalogue</p>
      <p className="via-voice-addon__hint via-voice-addon__hint--panel">
        Homme ou femme naturelle — aperçu ▶ puis génère.
      </p>
      <div className="via-i2v-voice-catalog__grid" role="list">
        {I2V_NATURAL_VOICES.map((voice) => {
          const selected =
            Boolean(voice.fishReferenceId) &&
            voice.fishReferenceId === fishReferenceId;
          const isPlaying = previewId === voice.id;
          const isLoading = loadingPreviewId === voice.id;
          return (
            <div key={voice.id} role="listitem" className="via-i2v-voice-catalog__item">
              <button
                type="button"
                className={`via-i2v-voice-catalog__card${selected ? " is-selected" : ""}`}
                onClick={() => {
                  if (voice.fishReferenceId) {
                    onFishReferenceId(voice.fishReferenceId, voice);
                  }
                }}
              >
                <span className="via-i2v-voice-catalog__name">{voice.name}</span>
                <span className="via-i2v-voice-catalog__tag">{voice.category}</span>
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

export function defaultI2VCatalogFishReferenceId(): string {
  return I2V_NATURAL_VOICES.find((v) => v.id === "cat-voix-homme")?.fishReferenceId ?? "";
}
