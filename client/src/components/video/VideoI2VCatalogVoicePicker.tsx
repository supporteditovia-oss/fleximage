import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Loader2, Pause, Play } from "lucide-react";
import {
  filterAdminVideoVoices,
  findAdminVideoVoiceById,
  listAdminVideoVoices,
  resolveDefaultAdminVideoVoiceId,
  type AdminVideoVoice,
  type AdminVideoVoiceFilter,
} from "@/lib/admin-video-voice-catalog";
import {
  playI2VVoicePreview,
  prefetchI2VVoicePreviews,
  stopI2VVoicePreview,
} from "@/lib/i2v-voice-preview";
import { useToast } from "@/hooks/use-toast";

type VideoI2VCatalogVoicePickerProps = {
  selectedVoiceId: string | null;
  onSelectedVoiceId: (voice: AdminVideoVoice) => void;
};

export function defaultI2VCatalogFishReferenceId(): string {
  return findAdminVideoVoiceById(resolveDefaultAdminVideoVoiceId())?.fishId ?? "";
}

export function VideoI2VCatalogVoicePicker({
  selectedVoiceId,
  onSelectedVoiceId,
}: VideoI2VCatalogVoicePickerProps) {
  const voices = useMemo(() => listAdminVideoVoices(), []);
  const [filter, setFilter] = useState<AdminVideoVoiceFilter>("rap");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);
  const stopPreviewRef = useRef<(() => void) | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    prefetchI2VVoicePreviews(voices.map((voice) => voice.fishId));
    return () => {
      stopPreviewRef.current?.();
      stopI2VVoicePreview();
    };
  }, [voices]);

  const filtered = useMemo(
    () => filterAdminVideoVoices(voices, filter),
    [filter, voices],
  );

  const rapCount = voices.filter((v) => v.group === "rap").length;
  const femmeCount = voices.filter((v) => v.gender === "femme").length;
  const hommeCount = voices.filter(
    (v) => v.gender === "homme" && v.group !== "rap",
  ).length;

  const previewVoice = (voice: AdminVideoVoice, event: MouseEvent) => {
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
    stopPreviewRef.current = playI2VVoicePreview(voice.fishId, {
      onLoading: () => setLoadingPreviewId(voice.id),
      onPlaying: () => {
        setLoadingPreviewId(null);
        setPreviewId(voice.id);
      },
      onEnd: () => {
        setPreviewId(null);
        setLoadingPreviewId(null);
      },
      onError: () => {
        setPreviewId(null);
        setLoadingPreviewId(null);
        toast({
          variant: "destructive",
          title: "Aperçu indisponible",
          description: `Impossible de lire ${voice.name}. Réessaie dans un instant.`,
        });
      },
    });
  };

  return (
    <div className="via-i2v-voice-catalog">
      <p className="via-step-label">
        Bibliothèque voix admin ({voices.length})
      </p>
      <p className="via-voice-addon__hint via-voice-addon__hint--panel">
        Rappeurs + voix naturelles I2V (5H/5F) + catalogue Homme/Femme — ▶
        aperçu Fish, puis active « Ajouter une voix IA ».
      </p>
      <div className="via-i2v-voice-catalog__filters" role="tablist" aria-label="Genre">
        <button
          type="button"
          role="tab"
          aria-selected={filter === "rap"}
          className={`via-i2v-voice-catalog__filter${filter === "rap" ? " is-active" : ""}`}
          onClick={() => setFilter("rap")}
        >
          Rap ({rapCount})
        </button>
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
                <span className="via-i2v-voice-catalog__tag">{voice.tag}</span>
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
