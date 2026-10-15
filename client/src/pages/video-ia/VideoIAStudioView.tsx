import { useMemo, type MouseEvent, type RefObject } from "react";
import { Film, Loader2, Trash2, Upload } from "lucide-react";
import { VideoStudioModePicker } from "@/components/video/VideoStudioModePicker";
import { VideoStudioPromptField } from "@/components/video/VideoStudioPromptField";
import { V2VIntentPicker } from "@/components/video/V2VIntentPicker";
import { VideoVoiceAddon } from "@/components/video/VideoVoiceAddon";
import type { I2VAmbience } from "@/components/video/VideoI2VAmbienceSelect";
import type { I2VSfx, I2VSfxMoment } from "@shared/i2v-sfx";
import { VideoSourceVoiceAddon } from "@/components/video/VideoSourceVoiceAddon";
import { StudioFeatureSteps } from "@/components/video/StudioFeatureSteps";
import { SceneLuxePhotosPanel } from "@/components/video/SceneLuxePhotosPanel";
import { SceneLuxePromptHelp } from "@/components/video/SceneLuxePromptHelp";
import type { SceneLuxePhotoRef } from "@/lib/scene-luxe-reference-photos";
import { isMotionStudioUiEnabled } from "@/lib/motion-studio-ui";
import { getVisibleV2VIntentOptions } from "@/lib/v2v-studio-intent";
import type { VideoStudioMode } from "@/lib/video-studio-modes";
import type { V2VStudioIntent } from "@/lib/v2v-studio-intent";
import {
  pickVideoRandomPrompt,
  videoTypewriterIdeas,
} from "@/lib/video-studio-prompt-pools";
import type {
  VideoAspectRatio,
  VideoQuality,
  VideoWorkflow,
} from "@/lib/video-studio-config";
import type { VideoUltraResolution } from "@shared/video-ultra-pricing";
import type { VideoI2VDurationSec } from "@shared/video-i2v-pricing";

export type VideoIAStudioViewProps = {
  workflow: VideoWorkflow;
  onModeSelect: (mode: VideoStudioMode) => void;
  creditCost: number;
  imageFileRef: RefObject<HTMLInputElement | null>;
  imagePreviewUrl: string | null;
  onImageUpload: (file: File | null) => void;
  onClearImage: () => void;
  onClearVideo: () => void;
  onClearRefImage: () => void;
  motionPrompt: string;
  onMotionPromptChange: (v: string) => void;
  durationSec: VideoI2VDurationSec;
  onDurationSec: (n: VideoI2VDurationSec) => void;
  i2vExtra5s: number;
  videoQuality: VideoQuality;
  onVideoQuality: (q: VideoQuality) => void;
  i2vExtra1080: number;
  aspectRatio: VideoAspectRatio;
  onAspectRatio: (r: VideoAspectRatio) => void;
  voiceEnabled: boolean;
  onVoiceEnabled: (v: boolean) => void;
  voiceText: string;
  onVoiceText: (v: string) => void;
  i2vVoiceId: string | null;
  onI2vVoiceId: (id: string) => void;
  suggestedVoiceFilter?: "all" | "homme" | "femme" | null;
  voiceMaxChars: number;
  voiceExtraCredit: number;
  i2vAmbience: I2VAmbience;
  onI2vAmbience: (v: I2VAmbience) => void;
  i2vSfx: I2VSfx;
  onI2vSfx: (v: I2VSfx) => void;
  i2vSfxMoment: I2VSfxMoment;
  onI2vSfxMoment: (v: I2VSfxMoment) => void;
  i2vSoundAutoOn: boolean;
  onI2vSoundAutoOn: (on: boolean) => void;
  onI2vSoundManualAdjust: () => void;
  i2vSoundDetectLabel: string | null;
  i2vSoundDetectPending: boolean;
  i2vSoundStudioEnabled: boolean;
  canGenerateI2V: boolean;
  onGenerateI2V: () => void;
  i2vPending: boolean;
  videoFileRef: RefObject<HTMLInputElement | null>;
  refImageFileRef: RefObject<HTMLInputElement | null>;
  videoPreview: string | null;
  videoPreviewRef: RefObject<HTMLVideoElement | null>;
  videoImportBusy: boolean;
  isVideoCloudSync: boolean;
  onVideoUpload: (file: File | null) => void;
  videoDurationSec: number | null;
  v2vMinSec: number;
  v2vMaxSec: number;
  v2vMaxMb: number;
  v2vIntent: V2VStudioIntent;
  onV2vIntent: (i: V2VStudioIntent) => void;
  v2vResolution: VideoUltraResolution;
  onV2vResolution: (r: VideoUltraResolution) => void;
  v2vResolutionOptions: VideoUltraResolution[];
  v2vResolutionLabel: (r: VideoUltraResolution) => string;
  v2vCreditsForResolution: (r: VideoUltraResolution) => number;
  swapPrompt: string;
  onSwapPrompt: (v: string) => void;
  refImageIsCustom: boolean;
  refImagePreview: string | null;
  onRefImageUpload: (file: File | null) => void;
  sceneLuxeSlots: readonly (SceneLuxePhotoRef | null)[];
  scenePhotosBusy: boolean;
  onScenePhotoAddAtSlot: (slotIndex: number, file: File) => void;
  onScenePhotosAddMany: (files: File[]) => void;
  onScenePhotoRemove: (id: string) => void;
  onScenePhotoRoleChange: (id: string, role: string) => void;
  preserveSourceVoice: boolean;
  onPreserveSourceVoice: (v: boolean) => void;
  canGenerateV2V: boolean;
  onGenerateV2V: () => void;
  v2vPending: boolean;
  showMotionStagingToggles?: boolean;
  motionStagingPromptOn?: boolean;
  onMotionStagingPromptOn?: (on: boolean) => void;
  motionStagingFfmpegOn?: boolean;
  onMotionStagingFfmpegOn?: (on: boolean) => void;
  motionStagingV2EraseOn?: boolean;
  onMotionStagingV2EraseOn?: (on: boolean) => void;
  motionStagingV2EdgeOn?: boolean;
  onMotionStagingV2EdgeOn?: (on: boolean) => void;
  motionStagingV2LightOn?: boolean;
  onMotionStagingV2LightOn?: (on: boolean) => void;
  motionStagingV2ShadowOn?: boolean;
  onMotionStagingV2ShadowOn?: (on: boolean) => void;
};

function MediaClearButton(props: {
  label: string;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      className="via-media-clear"
      aria-label={props.label}
      onClick={props.onClick}
    >
      <Trash2 className="h-3.5 w-3.5" aria-hidden />
      Supprimer
    </button>
  );
}

function AspectFormatToggle(props: {
  aspectRatio: VideoAspectRatio;
  onAspectRatio: (r: VideoAspectRatio) => void;
}) {
  return (
    <div className="via-orient-toggle via-orient-toggle--format" role="group" aria-label="Format">
      <button
        type="button"
        className={`via-orient-toggle__btn ${props.aspectRatio === "9:16" ? "is-active" : ""}`}
        onClick={() => props.onAspectRatio("9:16")}
      >
        9:16
      </button>
      <button
        type="button"
        className={`via-orient-toggle__btn ${props.aspectRatio === "16:9" ? "is-active" : ""}`}
        onClick={() => props.onAspectRatio("16:9")}
      >
        16:9
      </button>
    </div>
  );
}

export function VideoIAStudioView(props: VideoIAStudioViewProps) {
  const isI2V = props.workflow === "image_to_video";
  const aspectPreviewClass =
    props.aspectRatio === "16:9" ? "is-landscape" : "is-portrait";

  const typewriterIdeas = useMemo(
    () => videoTypewriterIdeas(props.workflow, props.v2vIntent),
    [props.workflow, props.v2vIntent],
  );

  const randomPrompt = () => {
    if (isI2V) {
      props.onMotionPromptChange(
        pickVideoRandomPrompt("image_to_video", props.v2vIntent),
      );
    } else {
      props.onSwapPrompt(
        pickVideoRandomPrompt("video_to_video", props.v2vIntent),
      );
    }
  };

  const motionUi = isMotionStudioUiEnabled();
  const showV2vIntentPicker = getVisibleV2VIntentOptions().length > 1;
  const mediaReady = isI2V
    ? Boolean(props.imagePreviewUrl)
    : Boolean(props.videoPreview);
  const promptReady = isI2V
    ? props.motionPrompt.trim().length >= 5
    : props.swapPrompt.trim().length >= 5;
  const canSubmit = isI2V ? props.canGenerateI2V : props.canGenerateV2V;

  const featureSteps = [
    {
      id: 1 as const,
      label: isI2V ? "Média · image" : "Média · vidéo",
      done: mediaReady,
      active: !mediaReady,
    },
    {
      id: 2 as const,
      label: "Texte · consigne",
      done: promptReady,
      active: mediaReady && !promptReady,
    },
    {
      id: 3 as const,
      label: "Générer",
      done: false,
      active: mediaReady && promptReady && canSubmit,
    },
  ];

  return (
    <div className="via-studio">
      <header className="via-hero via-hero--premium via-hero--minimal">
        <div className="via-hero__shine" aria-hidden />
        <h1 className="via-hero__title">Vidéo IA</h1>
      </header>

      <VideoStudioModePicker
        active={props.workflow}
        onSelect={props.onModeSelect}
        variant="cards"
      />

      <div key={props.workflow} className="via-panel via-panel-enter">
        <StudioFeatureSteps steps={featureSteps} />
        {isI2V ? (
          <>
            <input
              ref={props.imageFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) =>
                void props.onImageUpload(e.target.files?.[0] ?? null)
              }
            />
            <AspectFormatToggle
              aspectRatio={props.aspectRatio}
              onAspectRatio={props.onAspectRatio}
            />

            <div
              className={`via-media-slot ${
                props.aspectRatio === "16:9" ? "is-landscape" : "is-portrait"
              }`}
            >
              <button
                type="button"
                className={`via-upload-zone via-upload-zone--hero ${
                  props.imagePreviewUrl ? "has-file has-image" : ""
                } ${props.aspectRatio === "16:9" ? "is-landscape" : "is-portrait"}`}
                onClick={() => props.imageFileRef.current?.click()}
              >
                {props.imagePreviewUrl ? (
                  <>
                    <img
                      className="via-upload-zone__preview"
                      src={props.imagePreviewUrl}
                      alt=""
                    />
                    <span className="via-upload-zone__change-bar">
                      <Upload className="h-4 w-4" aria-hidden />
                      Changer
                    </span>
                  </>
                ) : (
                  <>
                    <span className="via-upload-zone__icon">
                      <Upload className="h-4 w-4" />
                    </span>
                    <span className="via-upload-zone__text">Choisir une image</span>
                    <span className="via-upload-zone__meta">JPG · PNG · 10 Mo</span>
                  </>
                )}
              </button>
              {props.imagePreviewUrl ? (
                <MediaClearButton
                  label="Supprimer l'image"
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onClearImage();
                  }}
                />
              ) : null}
            </div>

            <div className="via-option-block via-option-block--prominent">
              <p className="via-option-block__label">Durée</p>
              <div className="via-orient-toggle via-orient-toggle--wide" role="group">
                <button
                  type="button"
                  className={`via-orient-toggle__btn ${props.durationSec === 3 ? "is-active" : ""}`}
                  onClick={() => props.onDurationSec(3)}
                >
                  3 s
                </button>
                <button
                  type="button"
                  className={`via-orient-toggle__btn ${props.durationSec === 5 ? "is-active" : ""}`}
                  onClick={() => props.onDurationSec(5)}
                >
                  5 s
                  <span className="via-orient-toggle__hint">+{props.i2vExtra5s} cr</span>
                </button>
              </div>
            </div>

            <div className="via-option-block via-option-block--prominent">
              <p className="via-option-block__label">Qualité</p>
              <div className="via-orient-toggle via-orient-toggle--wide" role="group">
                <button
                  type="button"
                  className={`via-orient-toggle__btn ${props.videoQuality === "standard" ? "is-active" : ""}`}
                  onClick={() => props.onVideoQuality("standard")}
                >
                  720p
                </button>
                <button
                  type="button"
                  className={`via-orient-toggle__btn ${props.videoQuality === "high" ? "is-active" : ""}`}
                  onClick={() => props.onVideoQuality("high")}
                >
                  1080p
                  <span className="via-orient-toggle__hint">+{props.i2vExtra1080} cr</span>
                </button>
              </div>
            </div>

            <VideoStudioPromptField
              value={props.motionPrompt}
              onChange={props.onMotionPromptChange}
              typewriterIdeas={typewriterIdeas}
              onRandom={randomPrompt}
              fallbackPlaceholder="Ex. Il regarde la caméra, sourit, puis baisse les yeux vers son assiette…"
              ariaLabel="Consigne de mouvement"
            />
            <VideoVoiceAddon
              enabled={props.voiceEnabled}
              onEnabledChange={props.onVoiceEnabled}
              text={props.voiceText}
              onTextChange={props.onVoiceText}
              i2vVoiceId={props.i2vVoiceId}
              onI2vVoiceId={props.onI2vVoiceId}
              suggestedVoiceFilter={props.suggestedVoiceFilter}
              soundDetectLabel={props.i2vSoundDetectLabel}
              voicePickerDisabled={props.i2vPending}
              maxChars={props.voiceMaxChars}
              voiceExtraCredit={props.voiceExtraCredit}
              soundStudioEnabled={props.voiceEnabled && props.i2vSoundStudioEnabled}
              i2vAdminStudioEnabled={props.i2vSoundStudioEnabled}
              i2vSoundAutoOn={props.i2vSoundAutoOn}
              onI2vSoundAutoOn={props.onI2vSoundAutoOn}
              onI2vSoundManualAdjust={props.onI2vSoundManualAdjust}
              i2vSoundDetectPending={props.i2vSoundDetectPending}
              i2vAmbience={props.i2vAmbience}
              onI2vAmbience={props.onI2vAmbience}
              i2vSfx={props.i2vSfx}
              onI2vSfx={props.onI2vSfx}
              i2vSfxMoment={props.i2vSfxMoment}
              onI2vSfxMoment={props.onI2vSfxMoment}
            />

            <button
              type="button"
              className="via-cta"
              disabled={!props.canGenerateI2V || props.i2vPending}
              onClick={() => void props.onGenerateI2V()}
            >
              {props.i2vPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Génération…
                </>
              ) : (
                <>
                  <Film className="h-4 w-4" />
                  Générer · {props.creditCost} cr
                </>
              )}
            </button>
          </>
        ) : (
          <>
            {showV2vIntentPicker ? (
              <div className="via-intent-block via-intent-block--tight">
                <p className="via-option-block__label">Type</p>
                <V2VIntentPicker
                  active={props.v2vIntent}
                  onSelect={props.onV2vIntent}
                  variant="cards"
                />
              </div>
            ) : null}

            {motionUi && props.v2vIntent === "motion" ? (
              <div className="via-motion-scope-notice" role="note">
                <p className="via-motion-scope-notice__lead">
                  <strong>Avant d’importer</strong> — le studio prépare la scène
                  (personne d’origine retirée, ta photo dans la pièce) puis
                  applique la danse, comme sur les clips IA pro :
                </p>
                <ul className="via-motion-tips">
                  <li>
                    <strong>Photo</strong> :{" "}
                    <strong>une seule personne</strong>, de préférence{" "}
                    <strong>en pied</strong> (tête + pieds visibles). Pour une
                    danse plein corps, évite le buste seul — choisis une pose de
                    départ proche de la <strong>première image</strong> de la
                    vidéo (meilleur contact pieds / sol).
                  </li>
                  <li>
                    <strong>Vidéo</strong> : 3–8 s,{" "}
                    <strong>caméra / plan fixe</strong> (pas de travelling ni zoom),
                    <strong> une seule personne</strong> visible — debout ou assis,
                    le remplacement suit la <strong>même posture</strong> que dans le clip.
                  </li>
                  <li>
                    Évite les vidéos déjà <strong>compressées ou réexportées</strong>{" "}
                    (WhatsApp, Instagram, Snap) — privilégie un MP4{" "}
                    <strong>720p</strong> filmé ou exporté d’une traite.
                  </li>
                </ul>
                {props.showMotionStagingToggles ? (
                  <div
                    className="via-motion-staging-toggles"
                    role="group"
                    aria-label="Options staging Mouvement"
                  >
                    <p className="via-motion-staging-toggles__title">
                      Staging — comparer avant/après (preview)
                    </p>
                    <label className="via-motion-staging-toggles__row">
                      <input
                        type="checkbox"
                        checked={props.motionStagingPromptOn ?? true}
                        onChange={(e) =>
                          props.onMotionStagingPromptOn?.(e.target.checked)
                        }
                      />
                      Prompt intelligent Gemini (photo + frame + texte)
                    </label>
                    <label className="via-motion-staging-toggles__row">
                      <input
                        type="checkbox"
                        checked={props.motionStagingFfmpegOn ?? true}
                        onChange={(e) =>
                          props.onMotionStagingFfmpegOn?.(e.target.checked)
                        }
                      />
                      Post-traitement FFmpeg (deflicker + netteté + 1080p)
                    </label>
                    <p className="via-motion-staging-toggles__subtitle">
                      Anti-sticker — phase 1 (composite frame 0)
                    </p>
                    <label className="via-motion-staging-toggles__row">
                      <input
                        type="checkbox"
                        checked={props.motionStagingV2EraseOn ?? true}
                        onChange={(e) =>
                          props.onMotionStagingV2EraseOn?.(e.target.checked)
                        }
                      />
                      Effacement total (masque + vérif résidu)
                    </label>
                    <label className="via-motion-staging-toggles__row">
                      <input
                        type="checkbox"
                        checked={props.motionStagingV2EdgeOn ?? true}
                        onChange={(e) =>
                          props.onMotionStagingV2EdgeOn?.(e.target.checked)
                        }
                      />
                      Bords propres (blend + décontamination)
                    </label>
                    <label className="via-motion-staging-toggles__row">
                      <input
                        type="checkbox"
                        checked={props.motionStagingV2LightOn ?? true}
                        onChange={(e) =>
                          props.onMotionStagingV2LightOn?.(e.target.checked)
                        }
                      />
                      Même lumière (harmonisation scène)
                    </label>
                    <label className="via-motion-staging-toggles__row">
                      <input
                        type="checkbox"
                        checked={props.motionStagingV2ShadowOn ?? true}
                        onChange={(e) =>
                          props.onMotionStagingV2ShadowOn?.(e.target.checked)
                        }
                      />
                      Ombres (contact au sol)
                    </label>
                    <p className="via-motion-staging-toggles__hint">
                      Choix mémorisé dans ce navigateur. Visible uniquement sur
                      l’URL preview (pas www.luxeflexia.com).
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            <AspectFormatToggle
              aspectRatio={props.aspectRatio}
              onAspectRatio={props.onAspectRatio}
            />

            <input
              ref={props.videoFileRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => void props.onVideoUpload(e.target.files?.[0] ?? null)}
            />
            <div className={`via-media-slot ${aspectPreviewClass}`}>
              {!props.videoPreview ? (
                <button
                  type="button"
                  className={`via-upload-zone via-upload-zone--hero via-upload-zone--format ${aspectPreviewClass}`}
                  disabled={props.videoImportBusy}
                  onClick={() => props.videoFileRef.current?.click()}
                >
                  <span className="via-upload-zone__icon">
                    {props.videoImportBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                  </span>
                  <span className="via-upload-zone__text">
                    {props.videoImportBusy ? "Lecture…" : "Choisir une vidéo"}
                  </span>
                  <span className="via-upload-zone__meta">
                    {props.v2vMinSec}–{props.v2vMaxSec} s · {props.v2vMaxMb} Mo
                  </span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className={`via-preview-frame via-preview-frame--interactive ${aspectPreviewClass}`}
                    onClick={() => props.videoFileRef.current?.click()}
                  >
                    <video
                      ref={props.videoPreviewRef}
                      src={props.videoPreview}
                      poster={props.refImagePreview ?? undefined}
                      controls
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="auto"
                      className="via-preview-frame__video"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="via-preview-frame__change-bar">
                      <Upload className="h-3.5 w-3.5" aria-hidden />
                      Changer
                    </span>
                  </button>
                  <MediaClearButton
                    label="Supprimer la vidéo"
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onClearVideo();
                    }}
                  />
                </>
              )}
            </div>

            <div className="via-option-block via-option-block--prominent">
              <p className="via-option-block__label">Qualité</p>
              <div
                className="via-orient-toggle via-orient-toggle--wide via-orient-toggle--wrap"
                role="group"
              >
                {props.v2vResolutionOptions.map((res) => (
                  <button
                    key={res}
                    type="button"
                    className={`via-orient-toggle__btn ${props.v2vResolution === res ? "is-active" : ""}`}
                    onClick={() => props.onV2vResolution(res)}
                  >
                    {props.v2vResolutionLabel(res)}
                    <span className="via-orient-toggle__hint">
                      {props.v2vCreditsForResolution(res)} cr
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <VideoStudioPromptField
              value={props.swapPrompt}
              onChange={props.onSwapPrompt}
              typewriterIdeas={typewriterIdeas}
              onRandom={randomPrompt}
              fallbackPlaceholder="Ex. Remplace ma voiture par une Urus noire — garde le cadrage et la lumière du clip…"
              ariaLabel="Transformation"
            />

            {props.v2vIntent === "scene" ? <SceneLuxePromptHelp /> : null}

            {props.v2vIntent === "scene" ? (
              <SceneLuxePhotosPanel
                slots={props.sceneLuxeSlots}
                busy={props.scenePhotosBusy}
                onAddAtSlot={props.onScenePhotoAddAtSlot}
                onAddMany={props.onScenePhotosAddMany}
                onRemove={props.onScenePhotoRemove}
                onRoleChange={props.onScenePhotoRoleChange}
              />
            ) : null}

            {props.videoPreview ? (
              <>
                {props.v2vIntent === "motion" ? (
                  <>
                    <input
                      ref={props.refImageFileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        void props.onRefImageUpload(e.target.files?.[0] ?? null)
                      }
                    />
                    <div className="via-ref-photo-row">
                      <button
                        type="button"
                        className={`via-upload-zone via-upload-zone--compact ${
                          props.refImageIsCustom ? "has-file" : ""
                        }`}
                        onClick={() => props.refImageFileRef.current?.click()}
                      >
                        <span className="via-upload-zone__text">
                          {props.refImageIsCustom
                            ? "Changer ta photo"
                            : "+ Ta photo (1 personne, en pied si possible)"}
                        </span>
                      </button>
                      {props.refImageIsCustom && props.refImagePreview ? (
                        <>
                          <div className="via-preview-frame via-preview-frame--thumb">
                            <img src={props.refImagePreview} alt="" />
                          </div>
                          <MediaClearButton
                            label="Supprimer la photo"
                            onClick={(e) => {
                              e.stopPropagation();
                              props.onClearRefImage();
                            }}
                          />
                        </>
                      ) : null}
                    </div>
                  </>
                ) : null}

                <VideoSourceVoiceAddon
                  enabled={props.preserveSourceVoice}
                  onEnabledChange={props.onPreserveSourceVoice}
                  voiceExtraCredit={props.voiceExtraCredit}
                />
              </>
            ) : null}

            {motionUi && props.v2vIntent === "motion" ? (
              <p className="via-motion-scope-notice via-motion-scope-notice--compact" role="note">
                <strong>1 photo = 1 personnage remplacé.</strong> Scène, caméra et
                gestes = ta vidéo source.
              </p>
            ) : null}

            <button
              type="button"
              className="via-cta"
              disabled={
                !props.canGenerateV2V || props.v2vPending || props.videoImportBusy
              }
              onClick={() => void props.onGenerateV2V()}
            >
              {props.isVideoCloudSync ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Envoi…
                </>
              ) : props.v2vPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Génération…
                </>
              ) : (
                <>
                  <Film className="h-4 w-4" />
                  Transformer · {props.creditCost} cr
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
