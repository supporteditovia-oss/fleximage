import { Mic } from "lucide-react";
import { VIDEO_VOICE_EXTRA_CREDIT } from "@/lib/video-studio-config";
import { VideoI2VVoiceSelect } from "@/components/video/VideoI2VVoiceSelect";
import { VideoI2VSoundAutoControls } from "@/components/video/VideoI2VSoundAutoControls";
import type { I2VVoiceGenderFilter } from "@/lib/i2v-voice-prefs";
import type { I2VAmbience } from "@/components/video/VideoI2VAmbienceSelect";
import type { I2VSfx, I2VSfxMoment } from "@shared/i2v-sfx";

type VideoVoiceAddonProps = {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  text: string;
  onTextChange: (value: string) => void;
  maxChars?: number;
  voiceExtraCredit?: number;
  i2vVoiceId: string | null;
  onI2vVoiceId: (id: string) => void;
  suggestedVoiceFilter?: I2VVoiceGenderFilter | null;
  soundDetectLabel?: string | null;
  voicePickerDisabled?: boolean;
  soundStudioEnabled?: boolean;
  i2vSoundAutoOn?: boolean;
  onI2vSoundAutoOn?: (on: boolean) => void;
  onI2vSoundManualAdjust?: () => void;
  i2vSoundDetectPending?: boolean;
  i2vAmbience?: I2VAmbience;
  onI2vAmbience?: (v: I2VAmbience) => void;
  i2vSfx?: I2VSfx;
  onI2vSfx?: (v: I2VSfx) => void;
  i2vSfxMoment?: I2VSfxMoment;
  onI2vSfxMoment?: (v: I2VSfxMoment) => void;
  /** Bibliothèque voix, clone, son auto — admin preview uniquement. */
  i2vAdminStudioEnabled?: boolean;
};

export function VideoVoiceAddon({
  enabled,
  onEnabledChange,
  text,
  onTextChange,
  maxChars = 200,
  voiceExtraCredit = VIDEO_VOICE_EXTRA_CREDIT,
  i2vVoiceId,
  onI2vVoiceId,
  suggestedVoiceFilter,
  soundDetectLabel,
  voicePickerDisabled,
  soundStudioEnabled,
  i2vSoundAutoOn = true,
  onI2vSoundAutoOn,
  onI2vSoundManualAdjust,
  i2vSoundDetectPending,
  i2vAmbience = "none",
  onI2vAmbience,
  i2vSfx = "none",
  onI2vSfx,
  i2vSfxMoment = "middle",
  onI2vSfxMoment,
  i2vAdminStudioEnabled = false,
}: VideoVoiceAddonProps) {
  const showSound =
    i2vAdminStudioEnabled &&
    soundStudioEnabled &&
    onI2vSoundAutoOn &&
    onI2vSoundManualAdjust &&
    onI2vAmbience &&
    onI2vSfx &&
    onI2vSfxMoment;

  return (
    <div className="via-voice-addon">
      <button
        type="button"
        className={`via-voice-addon__toggle ${enabled ? "is-active" : ""}`}
        onClick={() => onEnabledChange(!enabled)}
        aria-pressed={enabled}
        title="Sync lèvres : mets ici les mots exacts à dire, pas l'action visuelle du prompt."
      >
        <Mic className="h-4 w-4 shrink-0" aria-hidden />
        <span className="via-voice-addon__toggle-text">
          Faire parler la vidéo (+{voiceExtraCredit} crédits)
        </span>
      </button>

      {!enabled ? (
        <p className="via-voice-addon__hint via-voice-addon__hint--panel">
          Parole ou cri ? Active l&apos;option — mets les <strong>mots exacts</strong>{" "}
          ici, pas dans le prompt mouvement.
        </p>
      ) : null}

      {enabled ? (
        <div className="via-voice-addon__panel">
          <label className="via-step-label" htmlFor="video-voice-script">
            Parole du personnage (sync lèvres)
          </label>
          <p className="via-voice-addon__hint via-voice-addon__hint--panel">
            Texte dit à voix haute — sync lèvres réaliste.
          </p>
          <textarea
            id="video-voice-script"
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            rows={3}
            maxLength={maxChars}
            placeholder="Ex. dialogue : Laisse-moi ! — pour un cri : Aaaah ! Non ! (évite AAAAAHHHH sans espaces)"
            className="via-prompt-field"
          />
          <p className="via-voice-addon__hint">
            {text.trim().length}/{maxChars} caractères
          </p>

          {i2vAdminStudioEnabled ? (
            <VideoI2VVoiceSelect
              selectedVoiceId={i2vVoiceId}
              onSelectedVoiceId={onI2vVoiceId}
              suggestedFilter={suggestedVoiceFilter}
              suggestedFilterLabel={soundDetectLabel}
              disabled={voicePickerDisabled}
            />
          ) : null}

          {showSound ? (
            <VideoI2VSoundAutoControls
              soundAutoOn={i2vSoundAutoOn}
              onSoundAutoOnChange={onI2vSoundAutoOn}
              onManualAdjust={onI2vSoundManualAdjust}
              detectLabel={soundDetectLabel ?? null}
              detectPending={Boolean(i2vSoundDetectPending)}
              i2vAmbience={i2vAmbience}
              onI2vAmbience={onI2vAmbience}
              i2vSfx={i2vSfx}
              onI2vSfx={onI2vSfx}
              i2vSfxMoment={i2vSfxMoment}
              onI2vSfxMoment={onI2vSfxMoment}
              disabled={voicePickerDisabled}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
