import type { RefObject } from "react";
import { Film, Loader2, Upload } from "lucide-react";
import { VideoStudioModePicker } from "@/components/video/VideoStudioModePicker";
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
  refImagePreview: string | null;
  onRefImageUpload: (file: File | null) => void;
  preserveSourceVoice: boolean;
  onPreserveSourceVoice: (v: boolean) => void;
  canGenerateV2V: boolean;
  onGenerateV2V: () => void;
  v2vPending: boolean;
};

export function VideoIAStudioView(props: VideoIAStudioViewProps) {
  const isI2V = props.workflow === "image_to_video";

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

            {props.imagePreviewUrl ? (
              <>
                <textarea
                  value={props.motionPrompt}
                  onChange={(e) => props.onMotionPromptChange(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Mouvement (ex. plongeon, marche lente…)"
                  className="via-prompt-field"
                  aria-label="Mouvement"
                />
                <VideoVoiceAddon
                  enabled={props.voiceEnabled}
                  onEnabledChange={props.onVoiceEnabled}
                  text={props.voiceText}
                  onTextChange={props.onVoiceText}
                  maxChars={props.voiceMaxChars}
                  voiceExtraCredit={props.voiceExtraCredit}
                />
              </>
            ) : null}

            <div className="via-orient-toggle" role="group" aria-label="Format">
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
            <div className="via-intent-block via-intent-block--tight">
              <p className="via-option-block__label">Type</p>
              <V2VIntentPicker
                active={props.v2vIntent}
                onSelect={props.onV2vIntent}
                variant="cards"
              />
            </div>

            <input
              ref={props.videoFileRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => void props.onVideoUpload(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              className={`via-upload-zone ${props.videoPreview ? "has-file" : ""}`}
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
                {props.videoImportBusy
                  ? "Lecture…"
                  : props.videoPreview
                    ? "Changer la vidéo"
                    : "Choisir une vidéo"}
              </span>
              <span className="via-upload-zone__meta">
                {props.v2vMinSec}–{props.v2vMaxSec} s · {props.v2vMaxMb} Mo
                {props.videoDurationSec ? ` · ${props.videoDurationSec} s` : ""}
              </span>
            </button>

            {props.videoPreview ? (
              <div className="via-preview-frame">
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
                />
              </div>
            ) : null}

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

            {props.videoPreview ? (
              <>
                <textarea
                  value={props.swapPrompt}
                  onChange={(e) => props.onSwapPrompt(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder={props.swapPlaceholder}
                  className="via-prompt-field"
                  aria-label="Transformation"
                />
                {props.v2vPresets.length > 0 ? (
                  <div className="via-chips">
                    {props.v2vPresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className="via-chip"
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
                  className={`via-upload-zone ${props.refImageIsCustom ? "has-file" : ""}`}
                  style={{ minHeight: "3.75rem" }}
                  onClick={() => props.refImageFileRef.current?.click()}
                >
                  <span className="via-upload-zone__text">
                    {props.refImageIsCustom ? "Changer photo bonus" : "+ Photo bonus (optionnel)"}
                  </span>
                </button>
                {props.refImageIsCustom && props.refImagePreview ? (
                  <div className="via-preview-frame" style={{ maxWidth: "8rem" }}>
                    <img src={props.refImagePreview} alt="" />
                  </div>
                ) : null}

                <VideoSourceVoiceAddon
                  enabled={props.preserveSourceVoice}
                  onEnabledChange={props.onPreserveSourceVoice}
                  voiceExtraCredit={props.voiceExtraCredit}
                />
              </>
            ) : null}

            <div className="via-orient-toggle" role="group" aria-label="Format">
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
