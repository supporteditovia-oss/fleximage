import type { RefObject } from "react";
import { Clapperboard, Loader2 } from "lucide-react";
import { VideoStudioProLayout } from "@/components/video/VideoStudioProLayout";
import { VideoStudioAdvancedPanel } from "@/components/video/VideoStudioAdvancedPanel";
import { VideoStudioWorkflowSwitch } from "@/components/video/VideoStudioWorkflowSwitch";
import { VideoMediaStage } from "@/components/video/VideoMediaStage";
import { V2VIntentPicker } from "@/components/video/V2VIntentPicker";
import { VideoVoiceAddon } from "@/components/video/VideoVoiceAddon";
import { VideoSourceVoiceAddon } from "@/components/video/VideoSourceVoiceAddon";
import type { VideoStudioMode } from "@/lib/video-studio-modes";
import type { V2VScenePreset } from "@/lib/video-studio-config";
import type { V2VStudioIntent } from "@/lib/v2v-studio-intent";
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
  advancedOpen: boolean;
  onAdvancedOpenChange: (open: boolean) => void;
  imageFileRef: RefObject<HTMLInputElement | null>;
  imagePreviewUrl: string | null;
  onImageUpload: (file: File | null) => void;
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
  voiceMaxChars: number;
  voiceExtraCredit: number;
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
  swapPlaceholder: string;
  v2vPresets: V2VScenePreset[];
  onPreset: (prompt: string) => void;
  refImageIsCustom: boolean;
  onRefImageUpload: (file: File | null) => void;
  preserveSourceVoice: boolean;
  onPreserveSourceVoice: (v: boolean) => void;
  canGenerateV2V: boolean;
  onGenerateV2V: () => void;
  v2vPending: boolean;
};

function GenerateFoot(props: {
  creditCost: number;
  pending: boolean;
  cloudSync?: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <>
      <div className="via-studio-foot__meta">
        <span className="via-studio-foot__label">Cette génération</span>
        <span className="via-studio-foot__credits">{props.creditCost} crédits</span>
      </div>
      <button
        type="button"
        className="via-cta via-cta--studio"
        disabled={props.disabled || props.pending}
        onClick={() => void props.onClick()}
      >
        {props.pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Génération…
          </>
        ) : props.cloudSync ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Envoi…
          </>
        ) : (
          <>
            <Clapperboard className="h-4 w-4" strokeWidth={2} />
            Générer · {props.creditCost} cr
          </>
        )}
      </button>
    </>
  );
}

export function VideoIAStudioView(props: VideoIAStudioViewProps) {
  const isI2V = props.workflow === "image_to_video";

  const foot = (
    <GenerateFoot
      creditCost={props.creditCost}
      pending={isI2V ? props.i2vPending : props.v2vPending}
      cloudSync={!isI2V && props.isVideoCloudSync}
      disabled={isI2V ? !props.canGenerateI2V : !props.canGenerateV2V || props.videoImportBusy}
      onClick={isI2V ? props.onGenerateI2V : props.onGenerateV2V}
    />
  );

  if (isI2V) {
    return (
      <div className="via-studio via-studio--pro studio-route-enter">
        <VideoStudioProLayout
          head={
            <VideoStudioWorkflowSwitch
              active={props.workflow}
              onSelect={props.onModeSelect}
            />
          }
          media={
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
              <VideoMediaStage
                kind="image"
                aspect={props.aspectRatio}
                mediaUrl={props.imagePreviewUrl}
                onPick={() => props.imageFileRef.current?.click()}
              />
            </>
          }
          editor={
            <>
              <label className="via-field-label" htmlFor="via-i2v-prompt">
                Prompt
              </label>
              <textarea
                id="via-i2v-prompt"
                value={props.motionPrompt}
                onChange={(e) => props.onMotionPromptChange(e.target.value)}
                rows={4}
                maxLength={500}
                placeholder="Décris le mouvement — chute dans l'eau, marche lente, sourire caméra…"
                className="via-prompt-field via-prompt-field--studio"
              />
              <VideoStudioAdvancedPanel
                open={props.advancedOpen}
                onOpenChange={props.onAdvancedOpenChange}
              >
                <div className="via-advanced__row">
                  <span className="via-advanced__key">Durée</span>
                  <div className="via-orient-toggle via-orient-toggle--compact" role="group">
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
                      5 s (+{props.i2vExtra5s})
                    </button>
                  </div>
                </div>
                <div className="via-advanced__row">
                  <span className="via-advanced__key">Résolution</span>
                  <div className="via-orient-toggle via-orient-toggle--compact" role="group">
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
                      1080p (+{props.i2vExtra1080})
                    </button>
                  </div>
                </div>
                <div className="via-advanced__row">
                  <span className="via-advanced__key">Format</span>
                  <div className="via-orient-toggle via-orient-toggle--compact" role="group">
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
                </div>
                <p className="via-advanced__hint">Moteur cinéma automatique.</p>
                {props.imagePreviewUrl ? (
                  <VideoVoiceAddon
                    enabled={props.voiceEnabled}
                    onEnabledChange={props.onVoiceEnabled}
                    text={props.voiceText}
                    onTextChange={props.onVoiceText}
                    maxChars={props.voiceMaxChars}
                    voiceExtraCredit={props.voiceExtraCredit}
                  />
                ) : null}
              </VideoStudioAdvancedPanel>
            </>
          }
          foot={foot}
        />
      </div>
    );
  }

  return (
    <div className="via-studio via-studio--pro studio-route-enter">
      <VideoStudioProLayout
        head={
          <VideoStudioWorkflowSwitch
            active={props.workflow}
            onSelect={props.onModeSelect}
          />
        }
        media={
          <>
            <input
              ref={props.videoFileRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => void props.onVideoUpload(e.target.files?.[0] ?? null)}
            />
            <VideoMediaStage
              kind="video"
              aspect="16:9"
              busy={props.videoImportBusy}
              mediaUrl={props.videoPreview}
              videoRef={props.videoPreviewRef}
              meta={`${props.v2vMinSec}–${props.v2vMaxSec} s · ${props.v2vMaxMb} Mo max${
                props.videoDurationSec ? ` · ${props.videoDurationSec} s` : ""
              }`}
              onPick={() => props.videoFileRef.current?.click()}
            />
          </>
        }
        editor={
          <>
            <label className="via-field-label" htmlFor="via-v2v-prompt">
              Prompt
            </label>
            <textarea
              id="via-v2v-prompt"
              value={props.swapPrompt}
              onChange={(e) => props.onSwapPrompt(e.target.value)}
              rows={5}
              maxLength={500}
              placeholder={props.swapPlaceholder}
              className="via-prompt-field via-prompt-field--studio"
            />
            {props.v2vPresets.length > 0 ? (
              <div className="via-chips via-chips--studio">
                {props.v2vPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className="via-chip via-chip--studio"
                    onClick={() => props.onPreset(preset.prompt)}
                  >
                    <span className="via-chip__emoji" aria-hidden>
                      {preset.emoji}
                    </span>
                    {preset.label}
                  </button>
                ))}
              </div>
            ) : null}
            <VideoStudioAdvancedPanel
              open={props.advancedOpen}
              onOpenChange={props.onAdvancedOpenChange}
            >
              <div className="via-advanced__row">
                <span className="via-advanced__key">Transformation</span>
                <V2VIntentPicker
                  active={props.v2vIntent}
                  onSelect={props.onV2vIntent}
                  variant="compact"
                />
              </div>
              <div className="via-advanced__row">
                <span className="via-advanced__key">Résolution</span>
                <div
                  className="via-orient-toggle via-orient-toggle--compact via-orient-toggle--wrap"
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
              <div className="via-advanced__row">
                <span className="via-advanced__key">Format</span>
                <div className="via-orient-toggle via-orient-toggle--compact" role="group">
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
              </div>
              <input
                ref={props.refImageFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  void props.onRefImageUpload(e.target.files?.[0] ?? null)
                }
              />
              <button
                type="button"
                className="via-link-btn"
                onClick={() => props.refImageFileRef.current?.click()}
              >
                {props.refImageIsCustom ? "Changer la photo bonus" : "+ Photo bonus (optionnel)"}
              </button>
              <VideoSourceVoiceAddon
                enabled={props.preserveSourceVoice}
                onEnabledChange={props.onPreserveSourceVoice}
                voiceExtraCredit={props.voiceExtraCredit}
              />
              <p className="via-advanced__hint">Moteur cinéma adapté à ton prompt.</p>
            </VideoStudioAdvancedPanel>
          </>
        }
        foot={foot}
      />
    </div>
  );
}
