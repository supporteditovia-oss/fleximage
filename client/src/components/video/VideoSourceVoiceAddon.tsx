import { Mic2 } from "lucide-react";
import { VIDEO_VOICE_EXTRA_CREDIT } from "@/lib/video-studio-config";

type VideoSourceVoiceAddonProps = {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
};

export function VideoSourceVoiceAddon({
  enabled,
  onEnabledChange,
}: VideoSourceVoiceAddonProps) {
  return (
    <div className="via-voice-addon">
      <button
        type="button"
        className={`via-voice-addon__toggle ${enabled ? "is-active" : ""}`}
        onClick={() => onEnabledChange(!enabled)}
        aria-pressed={enabled}
      >
        <Mic2 className="h-4 w-4 shrink-0" aria-hidden />
        <span className="via-voice-addon__toggle-text">
          Intégrer ta voix filmée
          <span className="via-voice-addon__toggle-meta">
            +{VIDEO_VOICE_EXTRA_CREDIT} crédits
          </span>
        </span>
      </button>

      {enabled ? (
        <p className="via-voice-addon__hint via-voice-addon__hint--panel">
          La voix enregistrée pendant ton tournage sera conservée dans la
          vidéo finale. Parle clairement face à la caméra pour un rendu optimal.
        </p>
      ) : (
        <p className="via-voice-addon__hint">
          Sans cette option, la vidéo générée est muette — aucune voix
          n&apos;est conservée.
        </p>
      )}
    </div>
  );
}
