import { Mic2, VolumeX } from "lucide-react";
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
        <span className="via-voice-addon__icon" aria-hidden>
          <Mic2 className="h-4 w-4" />
        </span>
        <span className="via-voice-addon__toggle-text">
          Intégrer ta voix filmée
          <span className="via-voice-addon__toggle-meta">
            +{VIDEO_VOICE_EXTRA_CREDIT} crédits
          </span>
        </span>
      </button>

      {enabled ? (
        <p className="via-voice-addon__hint via-voice-addon__hint--panel">
          La voix enregistrée pendant ton tournage sera conservée dans la vidéo
          finale. Tu peux aussi mentionner la voix dans ton prompt.
        </p>
      ) : (
        <>
          <p className="via-voice-addon__hint via-voice-addon__hint--warn">
            <VolumeX
              className="mr-1 inline h-3.5 w-3.5 align-text-bottom"
              aria-hidden
            />
            Sans cette option, la vidéo est <strong>100 % muette</strong> — même
            si tu demandes une voix dans le prompt.
          </p>
        </>
      )}
    </div>
  );
}
