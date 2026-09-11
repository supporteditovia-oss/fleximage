import { Mic2 } from "lucide-react";
import {
  VIDEO_VOICE_EXTRA_CREDIT,
  type V2vVoiceMode,
} from "@/lib/video-studio-config";

const VOICE_OPTIONS: {
  id: V2vVoiceMode;
  label: string;
  hint: string;
}[] = [
  {
    id: "none",
    label: "Muette",
    hint: "Aucune piste audio dans la vidéo finale.",
  },
  {
    id: "preserve",
    label: "Ma voix filmée",
    hint: "Conserve exactement ta voix enregistrée pendant le tournage.",
  },
  {
    id: "auto",
    label: "Voix auto",
    hint: "Recrée ta parole avec une voix IA adaptée au scène (homme ou femme).",
  },
  {
    id: "female",
    label: "Voix femme",
    hint: "Transcrit ta voix et la resynthétise avec une voix féminine naturelle.",
  },
  {
    id: "male",
    label: "Voix homme",
    hint: "Transcrit ta voix et la resynthétise avec une voix masculine naturelle.",
  },
];

type VideoV2vVoiceAddonProps = {
  mode: V2vVoiceMode;
  onModeChange: (mode: V2vVoiceMode) => void;
};

export function VideoV2vVoiceAddon({
  mode,
  onModeChange,
}: VideoV2vVoiceAddonProps) {
  const selected = VOICE_OPTIONS.find((opt) => opt.id === mode) ?? VOICE_OPTIONS[0];
  const chargesExtra = mode !== "none";

  return (
    <div className="via-voice-addon">
      <div className="via-voice-addon__header">
        <Mic2 className="h-4 w-4 shrink-0" aria-hidden />
        <span className="via-voice-addon__header-text">
          Voix dans la vidéo
          {chargesExtra ? (
            <span className="via-voice-addon__toggle-meta">
              +{VIDEO_VOICE_EXTRA_CREDIT} crédits
            </span>
          ) : null}
        </span>
      </div>

      <div className="via-voice-mode-grid" role="radiogroup" aria-label="Mode vocal V2V">
        {VOICE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={mode === opt.id}
            className={`via-voice-mode-btn ${mode === opt.id ? "is-active" : ""}`}
            onClick={() => onModeChange(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <p className="via-voice-addon__hint via-voice-addon__hint--panel">
        Les instructions vocales dans le prompt ne fonctionnent pas sans cette
        option — le provider vidéo ne génère pas de son.
        {" "}
        {selected.hint}
        {mode === "auto" || mode === "female" || mode === "male" ? (
          <>
            {" "}
            La voix est recréée par IA — ce n&apos;est pas une imitation de
            célébrité. Parle clairement face à la caméra pour un meilleur
            résultat.
          </>
        ) : null}
      </p>
    </div>
  );
}
