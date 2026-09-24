import { Mic } from "lucide-react";
import { VIDEO_VOICE_EXTRA_CREDIT } from "@/lib/video-studio-config";

type VideoVoiceAddonProps = {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  text: string;
  onTextChange: (value: string) => void;
  maxChars?: number;
  voiceExtraCredit?: number;
};

export function VideoVoiceAddon({
  enabled,
  onEnabledChange,
  text,
  onTextChange,
  maxChars = 200,
  voiceExtraCredit = VIDEO_VOICE_EXTRA_CREDIT,
}: VideoVoiceAddonProps) {
  return (
    <div className="via-voice-addon">
      <button
        type="button"
        className={`via-voice-addon__toggle ${enabled ? "is-active" : ""}`}
        onClick={() => onEnabledChange(!enabled)}
        aria-pressed={enabled}
      >
        <Mic className="h-4 w-4 shrink-0" aria-hidden />
        <span className="via-voice-addon__toggle-text">
          Ajouter une voix IA
          <span className="via-voice-addon__toggle-meta">
            +{voiceExtraCredit} crédits
          </span>
        </span>
      </button>

      {enabled ? (
        <div className="via-voice-addon__panel">
          <label className="via-step-label" htmlFor="video-voice-script">
            Texte à lire
          </label>
          <textarea
            id="video-voice-script"
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            rows={3}
            maxLength={maxChars}
            placeholder="Ex. : Personne ne croyait en moi, alors j'ai arrêté d'expliquer."
            className="via-prompt-field"
          />
          <p className="via-voice-addon__hint">
            {text.trim().length}/{maxChars} caractères · voix catalogue
          </p>
        </div>
      ) : null}
    </div>
  );
}
