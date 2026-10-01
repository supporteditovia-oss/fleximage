import type { RefObject } from "react";
import { Film, Loader2, Upload } from "lucide-react";
import { VideoStudioModePicker } from "@/components/video/VideoStudioModePicker";
import { VideoStudioProLayout } from "@/components/video/VideoStudioProLayout";
import { VideoStudioAdvancedPanel } from "@/components/video/VideoStudioAdvancedPanel";
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
  // I2V
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
  // V2V
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

function PreviewEmpty({ label }: { label: string }) {
  return (
    <div className="via-preview-empty">
      <span className="via-preview-empty__label">{label}</span>
    </div>
  );
}

export function VideoIAStudioView(props: VideoIAStudioViewProps) {
  const isI2V = props.workflow === "image_to_video";

  const generateBtn = (
    <button
      type="button"
      className="via-cta via-cta--pro"
      disabled={
        isI2V
          ? !props.canGenerateI2V || props.i2vPending
          : !props.canGenerateV2V || props.v2vPending || props.videoImportBusy
      }
      onClick={() =>
        isI2V ? void props.onGenerateI2V() : void props.onGenerateV2V()
      }
    >
      {props.i2vPending || props.v2vPending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Génération…
        </>
      ) : props.isVideoCloudSync ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Envoi…
        </>
      ) : (
        <>
          <Film className="h-4 w-4" />
          Générer · {props.creditCost} crédits
        </>
      )}
    </button>
  );

  const actionBar = (
    <>
      <p className="via-gen-cost">
        Cette génération : <strong>{props.creditCost} crédits</strong>
      </p>
      {generateBtn}
    </>
  );

  if (isI2V) {
    const controls = (
      <>
        <input
          ref={props.imageFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void props.onImageUpload(e.target.files?.[0] ?? null)}
        />
        {!props.imagePreviewUrl ? (
          <button
            type="button"
            className="via-upload-compact"
            onClick={() => props.imageFileRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Importer une image
          </button>
        ) : (
          <button
            type="button"
            className="via-upload-compact via-upload-compact--ghost"
            onClick={() => props.imageFileRef.current?.click()}
          >
            Changer l&apos;image
          </button>
        )}

        <label className="via-field-label" htmlFor="via-i2v-prompt">
          Prompt
        </label>
        <textarea
          id="via-i2v-prompt"
          value={props.motionPrompt}
          onChange={(e) => props.onMotionPromptChange(e.target.value)}
          rows={4}
          maxLength={500}
          placeholder="Décris le mouvement : chute dans l'eau, marche lente, sourire caméra…"
          className="via-prompt-field via-prompt-field--pro"
          disabled={!props.imagePreviewUrl}
        />

        <VideoStudioAdvancedPanel
          open={props.advancedOpen}
          onOpenChange={props.onAdvancedOpenChange}
        >
          <p className="via-advanced__hint">Moteur cinéma sélectionné automatiquement.</p>
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
    );

    const preview = props.imagePreviewUrl ? (
      <div
        className={`via-preview-stage ${props.aspectRatio === "16:9" ? "is-landscape" : "is-portrait"}`}
      >
        <img src={props.imagePreviewUrl} alt="Aperçu" />
      </div>
    ) : (
      <PreviewEmpty label="Aperçu image" />
    );

    return (
      <div className="via-studio via-studio--pro">
        <VideoStudioModePicker active={props.workflow} onSelect={props.onModeSelect} />
        <VideoStudioProLayout
          controls={controls}
          preview={preview}
          actionBar={actionBar}
        />
      </div>
    );
  }

  const controls = (
    <>
      <input
        ref={props.videoFileRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => void props.onVideoUpload(e.target.files?.[0] ?? null)}
      />
      {!props.videoPreview ? (
        <button
          type="button"
          className="via-upload-compact"
          disabled={props.videoImportBusy}
          onClick={() => props.videoFileRef.current?.click()}
        >
          {props.videoImportBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Importer une vidéo
          <span className="via-upload-compact__meta">
            {props.v2vMinSec}–{props.v2vMaxSec} s · max {props.v2vMaxMb} Mo
          </span>
        </button>
      ) : (
        <button
          type="button"
          className="via-upload-compact via-upload-compact--ghost"
          onClick={() => props.videoFileRef.current?.click()}
        >
          Changer la vidéo
          {props.videoDurationSec ? ` · ${props.videoDurationSec} s` : ""}
        </button>
      )}

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
        className="via-prompt-field via-prompt-field--pro"
        disabled={!props.videoPreview}
      />

      {props.videoPreview && props.v2vPresets.length > 0 ? (
        <div className="via-chips via-chips--pro">
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
          <div className="via-orient-toggle via-orient-toggle--compact via-orient-toggle--wrap" role="group">
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
        <p className="via-advanced__hint">Moteur cinéma adapté à ton prompt — automatique.</p>
        {props.videoPreview ? (
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
            <button
              type="button"
              className="via-upload-compact via-upload-compact--ghost"
              onClick={() => props.refImageFileRef.current?.click()}
            >
              {props.refImageIsCustom ? "Changer la photo bonus" : "Photo bonus (optionnel)"}
            </button>
            <VideoSourceVoiceAddon
              enabled={props.preserveSourceVoice}
              onEnabledChange={props.onPreserveSourceVoice}
              voiceExtraCredit={props.voiceExtraCredit}
            />
          </>
        ) : null}
      </VideoStudioAdvancedPanel>
    </>
  );

  const preview = props.videoPreview ? (
    <div className="via-preview-stage is-video">
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
        className="via-preview-stage__video"
      />
    </div>
  ) : (
    <PreviewEmpty label="Aperçu vidéo" />
  );

  return (
    <div className="via-studio via-studio--pro">
      <VideoStudioModePicker active={props.workflow} onSelect={props.onModeSelect} />
      <VideoStudioProLayout
        controls={controls}
        preview={preview}
        actionBar={actionBar}
      />
    </div>
  );
}
