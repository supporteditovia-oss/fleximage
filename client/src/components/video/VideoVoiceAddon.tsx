import { Mic } from "lucide-react";
import {
  VIDEO_VOICE_EXTRA_CREDIT,
  VIDEO_VOICE_SCRIPT_PRESETS,
} from "@/lib/video-studio-config";

type VideoVoiceAddonProps = {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  text: string;
  onTextChange: (value: string) => void;
  consent: boolean;
  onConsentChange: (value: boolean) => void;
  maxChars?: number;
};

export function VideoVoiceAddon({
  enabled,
  onEnabledChange,
  text,
  onTextChange,
  consent,
  onConsentChange,
  maxChars = 200,
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
            +{VIDEO_VOICE_EXTRA_CREDIT} crédits
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
          <div className="via-chips">
            {VIDEO_VOICE_SCRIPT_PRESETS.slice(0, 3).map((preset) => (
              <button
                key={preset}
                type="button"
                className="via-chip"
                onClick={() => onTextChange(preset)}
              >
                {preset.length > 42 ? `${preset.slice(0, 42)}…` : preset}
              </button>
            ))}
          </div>
          <label className="via-voice-addon__consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => onConsentChange(e.target.checked)}
            />
            <span>
              J&apos;accepte l&apos;utilisation d&apos;une voix IA générée sur
              ma vidéo.
            </span>
          </label>
        </div>
      ) : null}
    </div>
  );
}
