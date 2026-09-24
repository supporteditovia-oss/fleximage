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

      {!enabled ? (
        <p className="via-voice-addon__hint via-voice-addon__hint--panel">
          Il doit <strong>parler ou crier</strong> ? Active l&apos;option (+5
          crédits) : les <strong>mots exacts</strong> vont dans le champ
          ci-dessous, pas dans le prompt mouvement. Ex. chute dans l&apos;eau →
          prompt ; « Aaaah ! Non non ! » → parole.
        </p>
      ) : null}

      {enabled ? (
        <div className="via-voice-addon__panel">
          <label className="via-step-label" htmlFor="video-voice-script">
            Parole du personnage (sync lèvres)
          </label>
          <p className="via-voice-addon__hint via-voice-addon__hint--panel">
            L&apos;IA fait <strong>dire ce texte à voix haute</strong> avec
            bouche, mâchoire et timing réalistes — comme une vraie prise, pas
            une photo figée. Chaque mot doit coller au mouvement des lèvres.
          </p>
          <textarea
            id="video-voice-script"
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            rows={3}
            maxLength={maxChars}
            placeholder="Ex. : Bonjour les amis, comment vous allez ? — ou pour un cri : Aaaah ! Non non non !"
            className="via-prompt-field"
          />
          <p className="via-voice-addon__hint">
            {text.trim().length}/{maxChars} caractères · voix catalogue · le
            prompt mouvement décrit l&apos;action, ce champ décrit{" "}
            <strong>uniquement</strong> ce qu&apos;on entend
          </p>
        </div>
      ) : null}
    </div>
  );
}
