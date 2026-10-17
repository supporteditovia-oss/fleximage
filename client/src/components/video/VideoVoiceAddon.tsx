import { useMemo } from "react";
import { Mic } from "lucide-react";
import {
  VIDEO_VOICE_EXTRA_CREDIT,
  getI2VVoiceScriptLimitStatus,
  clampVoiceScriptToI2VLimit,
} from "@/lib/video-studio-config";
import { VideoI2VCatalogVoicePicker } from "@/components/video/VideoI2VCatalogVoicePicker";
import type { AdminVideoVoice } from "@/lib/admin-video-voice-catalog";

type VideoVoiceAddonProps = {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  text: string;
  onTextChange: (value: string) => void;
  maxChars?: number;
  /** Durée clip I2V (3 ou 5 s) — recalcule limites compteur. */
  durationSec?: number;
  voiceExtraCredit?: number;
  /** Catalogue homme / femme — preview admin Vidéo IA. */
  adminVoiceCatalogEnabled?: boolean;
  i2vVoiceId?: string | null;
  onI2vVoiceId?: (voice: AdminVideoVoice) => void;
};

export function VideoVoiceAddon({
  enabled,
  onEnabledChange,
  text,
  onTextChange,
  maxChars = 200,
  durationSec = 5,
  voiceExtraCredit = VIDEO_VOICE_EXTRA_CREDIT,
  adminVoiceCatalogEnabled = false,
  i2vVoiceId = null,
  onI2vVoiceId,
}: VideoVoiceAddonProps) {
  const limits = useMemo(
    () => getI2VVoiceScriptLimitStatus(text, durationSec),
    [text, durationSec],
  );

  const effectiveMaxChars = maxChars || limits.maxChars;

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

      {adminVoiceCatalogEnabled && onI2vVoiceId ? (
        <VideoI2VCatalogVoicePicker
          selectedVoiceId={i2vVoiceId}
          onSelectedVoiceId={onI2vVoiceId}
        />
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
            onChange={(e) =>
              onTextChange(clampVoiceScriptToI2VLimit(e.target.value, durationSec))
            }
            rows={3}
            maxLength={effectiveMaxChars}
            placeholder="Ex. dialogue : Laisse-moi ! — pour un cri : Aaaah ! Non ! (évite AAAAAHHHH sans espaces)"
            className="via-prompt-field"
            aria-describedby="video-voice-script-counter"
          />
          <p
            id="video-voice-script-counter"
            className={`via-voice-addon__counter${
              limits.showLimitWarning ? " is-limit" : ""
            }`}
            role="status"
            aria-live="polite"
          >
            <span>
              {limits.charCount} / {limits.maxChars} caractères
            </span>
            <span className="via-voice-addon__counter-sep" aria-hidden>
              ·
            </span>
            <span>
              {limits.wordCount} / {limits.maxWords} mots
            </span>
            <span className="via-voice-addon__counter-meta">
              · limite {limits.durationSec} s
            </span>
          </p>
          {limits.overCharLimit || limits.overWordLimit ? (
            <p className="via-voice-addon__limit-alert" role="alert">
              {limits.overCharLimit
                ? `Texte trop long pour ${limits.durationSec} s — retire des caractères avant de générer.`
                : `Trop de mots pour ${limits.durationSec} s — allège la phrase pour éviter un échec de sync.`}
            </p>
          ) : limits.atCharLimit ? (
            <p className="via-voice-addon__limit-alert via-voice-addon__limit-alert--soft" role="status">
              Limite {limits.durationSec} s atteinte — tu peux générer ou raccourcir un peu pour plus de marge.
            </p>
          ) : null}
          <p className="via-voice-addon__hint">
            {adminVoiceCatalogEnabled
              ? "Voix choisie ci-dessus (admin)"
              : "Voix catalogue"}{" "}
            · le prompt mouvement décrit l&apos;action, ce champ décrit{" "}
            <strong>uniquement</strong> ce qu&apos;on entend
          </p>
        </div>
      ) : null}
    </div>
  );
}
