import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Redirect, useLocation } from "wouter";
import {
  Clapperboard,
  Film,
  ImageIcon,
  Loader2,
  Sparkles,
  Upload,
  Video,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentPlan } from "@/hooks/use-billing";
import { useVideoStudioGenerate } from "@/hooks/use-video-studio";
import { GenerationProgress } from "@/components/larp/GenerationProgress";
import { GenerationLoader } from "@/components/larp/GenerationLoader";
import "@/components/larp/generation-loader.css";
import { useToast } from "@/hooks/use-toast";
import { compressImageForGeneration } from "@/lib/compress-image";
import { VideoCreditSummary } from "@/components/video/VideoCreditSummary";
import { VideoVoiceAddon } from "@/components/video/VideoVoiceAddon";
import {
  computeVideoCreditCost,
  DEFAULT_IMAGE_TO_VIDEO_PROMPT,
  maxVoiceCharsForVideoDuration,
  VIDEO_FLAT_CREDIT_COST,
  VIDEO_V2V_MAX_DURATION_SEC,
  VIDEO_V2V_MAX_SIZE_MB,
  VIDEO_VEHICLE_PRESETS,
  type VideoAspectRatio,
  type VideoWorkflow,
} from "@/lib/video-studio-config";
import {
  readVideoDurationSec,
  validateVideoDurationForUpload,
} from "@/lib/video-duration";
import { consumeVideoStudioPrefill } from "@/lib/video-studio-prefill";
import {
  formatVideoSizeMb,
  prepareVideoFileForStudio,
  type StudioVideoUpload,
} from "@/lib/upload-video";
import { useAdminPreviewFeatures } from "@/lib/admin-preview-features";
import { writeStudioMode } from "@/lib/v2-experience";
import "./video-ia-page.css";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const WORKFLOW_OPTIONS: {
  id: VideoWorkflow;
  label: string;
  emoji: string;
  hint: string;
}[] = [
  {
    id: "image_to_video",
    label: "Image → Vidéo",
    emoji: "📸",
    hint: "Ta photo prend vie",
  },
  {
    id: "video_to_video",
    label: "Vidéo → Vidéo",
    emoji: "🚗",
    hint: "Swap voiture ou objet",
  },
];

export default function VideoIA() {
  const [, setLocation] = useLocation();
  const adminPreview = useAdminPreviewFeatures();
  const { user } = useAuth();
  const { data: plan } = useCurrentPlan({ enabled: Boolean(user) });
  const { toast } = useToast();
  const generateVideo = useVideoStudioGenerate();

  const imageFileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const refImageFileRef = useRef<HTMLInputElement>(null);

  const [workflow, setWorkflow] = useState<VideoWorkflow>("image_to_video");

  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadBase64, setUploadBase64] = useState<string | null>(null);
  const [prefillImageUrl, setPrefillImageUrl] = useState<string | null>(null);
  const [prefillLarpId, setPrefillLarpId] = useState<string | null>(null);

  const [motionPrompt, setMotionPrompt] = useState("");
  const [durationSec] = useState<5>(5);
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>("9:16");

  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoSource, setVideoSource] = useState<StudioVideoUpload | null>(
    null,
  );
  const [videoDurationSec, setVideoDurationSec] = useState<number | null>(null);
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [refImagePreview, setRefImagePreview] = useState<string | null>(null);
  const [refImageBase64, setRefImageBase64] = useState<string | null>(null);
  const [swapPrompt, setSwapPrompt] = useState("");

  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [voiceConsent, setVoiceConsent] = useState(false);

  const [taskId, setTaskId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generationEstimate, setGenerationEstimate] = useState<number | null>(
    null,
  );

  useEffect(() => {
    writeStudioMode("video");
    document.documentElement.classList.add("luxeflexia-video-page");
    return () => {
      document.documentElement.classList.remove("luxeflexia-video-page");
    };
  }, []);

  useEffect(() => {
    const prefill = consumeVideoStudioPrefill();
    if (prefill) {
      setWorkflow("image_to_video");
      setPrefillImageUrl(prefill.imageUrl);
      setPrefillLarpId(prefill.sourceLarpId ?? null);
    }
  }, []);

  const imagePreviewUrl = uploadPreview || prefillImageUrl;

  const voiceMaxChars = maxVoiceCharsForVideoDuration(
    workflow === "video_to_video" ? videoDurationSec : durationSec,
  );

  const voiceReady =
    !voiceEnabled ||
    (voiceText.trim().length >= 5 && voiceConsent && voiceText.length <= voiceMaxChars);

  const creditCost = computeVideoCreditCost({
    workflow,
    durationSec,
    quality: "standard",
    voiceEnabled,
    sourceVideoDurationSec: videoDurationSec,
  });

  const buildVoicePayload = () =>
    voiceEnabled
      ? {
          voice_enabled: true,
          voice_mode: "catalog" as const,
          voice_text: voiceText.trim(),
          voice_consent: voiceConsent,
        }
      : { voice_enabled: false };

  const creditBalance = plan?.credits ?? 0;
  const canAfford = creditBalance >= creditCost;

  const canGenerateI2V =
    Boolean(imagePreviewUrl) &&
    motionPrompt.trim().length >= 5 &&
    voiceReady &&
    canAfford;
  const canGenerateV2V =
    Boolean(videoSource) &&
    swapPrompt.trim().length >= 5 &&
    voiceReady &&
    canAfford &&
    !isVideoUploading;

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;
    try {
      const compressed = await compressImageForGeneration(file);
      const b64 = await fileToBase64(compressed);
      setUploadBase64(b64);
      setUploadPreview(URL.createObjectURL(compressed));
      setPrefillImageUrl(null);
      setPrefillLarpId(null);
    } catch {
      toast({
        variant: "destructive",
        title: "Import impossible",
        description: "Choisis une image JPG ou PNG valide.",
      });
    }
  };

  const handleVideoUpload = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast({
        variant: "destructive",
        title: "Format invalide",
        description: "Importe une vidéo MP4 filmée au smartphone.",
      });
      return;
    }
    if (file.size > VIDEO_V2V_MAX_SIZE_MB * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Vidéo trop lourde",
        description: `Ta vidéo fait ${formatVideoSizeMb(file.size)} Mo (max ${VIDEO_V2V_MAX_SIZE_MB} Mo). Filme en 1080p ou coupe avant d'importer.`,
      });
      return;
    }
    setIsVideoUploading(true);
    setVideoSource(null);
    try {
      const duration = await readVideoDurationSec(file);
      const check = validateVideoDurationForUpload(duration);
      if (!check.ok) {
        toast({
          variant: "destructive",
          title: "Vidéo refusée",
          description: check.message,
        });
        return;
      }
      const preview = URL.createObjectURL(file);
      setVideoDurationSec(Math.ceil(duration));
      setVideoPreview(preview);
      const prepared = await prepareVideoFileForStudio(file);
      setVideoSource(prepared);
    } catch (err: unknown) {
      setVideoPreview(null);
      setVideoDurationSec(null);
      const message =
        err instanceof Error ? err.message : "Impossible de lire cette vidéo.";
      toast({
        variant: "destructive",
        title: "Import impossible",
        description: message,
      });
    } finally {
      setIsVideoUploading(false);
    }
  };

  const handleGenerateI2V = async () => {
    if (isSubmitting || generateVideo.isPending || taskId) return;
    if (!canGenerateI2V) return;

    setIsSubmitting(true);
    try {
      const prompt =
        motionPrompt.trim().length >= 10
          ? motionPrompt.trim()
          : `${motionPrompt.trim()}. ${DEFAULT_IMAGE_TO_VIDEO_PROMPT}`;

      const result = await generateVideo.mutateAsync({
        workflow: "image_to_video",
        motion_prompt: prompt,
        duration_sec: durationSec,
        aspect_ratio: aspectRatio,
        camera_movement: "slow_zoom",
        motion_intensity: "natural",
        style: "cinematic",
        quality: "standard",
        subtitles_enabled: false,
        ...buildVoicePayload(),
        ...(uploadBase64
          ? { images: [uploadBase64] }
          : {
              image_url: prefillImageUrl || undefined,
              source_larp_id: prefillLarpId || undefined,
            }),
        source: "video_studio",
      });
      setTaskId(result.taskId);
      setGenerationEstimate(result.estimatedSeconds ?? 120);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Génération vidéo impossible";
      toast({ variant: "destructive", title: "Erreur", description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefImageUpload = async (file: File | null) => {
    if (!file) return;
    try {
      const compressed = await compressImageForGeneration(file);
      const b64 = await fileToBase64(compressed);
      setRefImageBase64(b64);
      setRefImagePreview(URL.createObjectURL(compressed));
    } catch {
      toast({
        variant: "destructive",
        title: "Import impossible",
        description: "Choisis une image JPG ou PNG valide.",
      });
    }
  };

  const handleGenerateV2V = async () => {
    if (isSubmitting || generateVideo.isPending || taskId) return;
    if (!canGenerateV2V || !videoSource) return;

    setIsSubmitting(true);
    try {
      const result = await generateVideo.mutateAsync({
        workflow: "video_to_video",
        aspect_ratio: aspectRatio,
        ...(videoSource.mode === "url"
          ? { video_url: videoSource.videoUrl }
          : { videos: [videoSource.dataUrl] }),
        vehicle_prompt: swapPrompt.trim(),
        source_video_duration_sec: videoDurationSec ?? undefined,
        ...buildVoicePayload(),
        ...(refImageBase64 ? { reference_images: [refImageBase64] } : {}),
        source: "video_studio",
      });
      setTaskId(result.taskId);
      setGenerationEstimate(result.estimatedSeconds ?? 240);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Remplacement impossible";
      toast({ variant: "destructive", title: "Erreur", description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetStudio = useCallback(() => {
    setTaskId(null);
    setGenerationEstimate(null);
  }, []);

  if (!adminPreview) {
    return <Redirect to="/create" />;
  }

  if ((isSubmitting || generateVideo.isPending) && !taskId) {
    return createPortal(
      <GenerationLoader
        taskId="video-pending"
        status="connecting"
        estimatedSeconds={generationEstimate ?? 120}
        inputImageUrl={imagePreviewUrl || videoPreview || undefined}
      />,
      document.body,
    );
  }

  if (taskId) {
    return (
      <div className="mx-auto min-h-[calc(100dvh-5rem)] max-w-5xl px-4 py-6">
        <GenerationProgress
          taskId={taskId}
          inputImageUrl={imagePreviewUrl || videoPreview || undefined}
          onReset={resetStudio}
          resultType="video"
          initialEstimatedSeconds={generationEstimate ?? undefined}
        />
      </div>
    );
  }

  return (
    <div className="via-studio pb-28 md:pb-10">
      <header className="text-center">
        <div className="via-hero__badge">
          <Clapperboard className="h-3.5 w-3.5" />
          Studio premium
        </div>
        <h1 className="via-hero__title">Vidéo IA</h1>
        <p className="via-hero__sub">
          Anime ta photo ou transforme ta vidéo smartphone. Rendu cinématique,
          prêt pour TikTok &amp; Reels.
        </p>
      </header>

      <div className="via-mode-grid">
        {WORKFLOW_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setWorkflow(option.id)}
            className={`via-mode-card ${workflow === option.id ? "is-active" : ""}`}
          >
            <span className="via-mode-card__emoji" aria-hidden>
              {option.emoji}
            </span>
            <span className="via-mode-card__label">{option.label}</span>
            <span className="via-mode-card__hint">{option.hint}</span>
          </button>
        ))}
      </div>

      <div key={workflow} className="via-panel via-panel-enter">
        <VideoCreditSummary creditCost={creditCost} />

        {workflow === "image_to_video" ? (
          <>
            <p className="via-step-label">
              <ImageIcon className="h-3.5 w-3.5" />
              Étape 1
            </p>
            <h2 className="via-step-title">Importe ta photo</h2>
            <p className="via-step-desc">
              JPG ou PNG — ta propre image. Vidéo verticale max 8 s ·{" "}
              <strong>{VIDEO_FLAT_CREDIT_COST} crédits</strong> par génération.
            </p>

            <input
              ref={imageFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) =>
                void handleImageUpload(e.target.files?.[0] ?? null)
              }
            />
            <button
              type="button"
              className={`via-upload-zone ${imagePreviewUrl ? "has-file" : ""}`}
              onClick={() => imageFileRef.current?.click()}
            >
              <span className="via-upload-zone__icon">
                <Upload className="h-4 w-4" />
              </span>
              <span className="via-upload-zone__text">
                {imagePreviewUrl ? "Changer l'image" : "Choisir une image"}
              </span>
              <span className="via-upload-zone__meta">JPG · PNG · max 10 Mo</span>
            </button>

            {imagePreviewUrl && (
              <div
                className={`via-preview-frame ${aspectRatio === "16:9" ? "is-landscape" : ""}`}
              >
                <img src={imagePreviewUrl} alt="Aperçu" />
              </div>
            )}

            {imagePreviewUrl && (
              <>
                <label className="via-step-label" style={{ marginTop: "1.25rem" }}>
                  <Sparkles className="h-3.5 w-3.5" />
                  Étape 2 — Prompt
                </label>
                <textarea
                  value={motionPrompt}
                  onChange={(e) => setMotionPrompt(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Ex. : Je veux qu'il tombe dans l'eau en souriant, caméra lente…"
                  className="via-prompt-field"
                />
              </>
            )}

            <div className="via-orient-toggle" role="group" aria-label="Orientation">
              <button
                type="button"
                className={`via-orient-toggle__btn ${aspectRatio === "9:16" ? "is-active" : ""}`}
                onClick={() => setAspectRatio("9:16")}
              >
                Vertical
              </button>
              <button
                type="button"
                className={`via-orient-toggle__btn ${aspectRatio === "16:9" ? "is-active" : ""}`}
                onClick={() => setAspectRatio("16:9")}
              >
                Paysage
              </button>
            </div>

            {imagePreviewUrl ? (
              <VideoVoiceAddon
                enabled={voiceEnabled}
                onEnabledChange={setVoiceEnabled}
                text={voiceText}
                onTextChange={setVoiceText}
                consent={voiceConsent}
                onConsentChange={setVoiceConsent}
                maxChars={voiceMaxChars}
              />
            ) : null}

            <button
              type="button"
              className="via-cta"
              disabled={!canGenerateI2V || isSubmitting || generateVideo.isPending}
              onClick={() => void handleGenerateI2V()}
            >
              {isSubmitting || generateVideo.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Génération…
                </>
              ) : (
                <>
                  <Film className="h-4 w-4" />
                  Générer ma vidéo · {creditCost} crédits
                </>
              )}
            </button>
          </>
        ) : (
          <>
            <p className="via-step-label">
              <Video className="h-3.5 w-3.5" />
              Étape 1
            </p>
            <h2 className="via-step-title">Importe ta vidéo</h2>
            <p className="via-step-desc">
              Filme avec ton téléphone — ex. ta Clio garée.{" "}
              <strong>Max {VIDEO_V2V_MAX_DURATION_SEC}s</strong> ·{" "}
              {VIDEO_FLAT_CREDIT_COST} crédits par vidéo.
              L&apos;IA conserve ta caméra, le décor et tous les mouvements.
            </p>

            <input
              ref={videoFileRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) =>
                void handleVideoUpload(e.target.files?.[0] ?? null)
              }
            />
            <button
              type="button"
              className={`via-upload-zone ${videoPreview ? "has-file" : ""}`}
              disabled={isVideoUploading}
              onClick={() => videoFileRef.current?.click()}
            >
              <span className="via-upload-zone__icon">
                {isVideoUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
              </span>
              <span className="via-upload-zone__text">
                {isVideoUploading
                  ? "Envoi de la vidéo…"
                  : videoPreview
                    ? "Changer la vidéo"
                    : "Choisir une vidéo"}
              </span>
              <span className="via-upload-zone__meta">
                MP4 · max {VIDEO_V2V_MAX_SIZE_MB} Mo · max {VIDEO_V2V_MAX_DURATION_SEC}s
                {videoDurationSec ? ` · ${videoDurationSec}s détectées` : ""}
              </span>
            </button>

            {videoPreview && (
              <div className="via-preview-frame">
                <video src={videoPreview} controls muted playsInline />
              </div>
            )}

            {videoPreview && (
              <>
                <label className="via-step-label" style={{ marginTop: "1.25rem" }}>
                  <ImageIcon className="h-3.5 w-3.5" />
                  Photo de référence (optionnel)
                </label>
                <p className="via-step-desc" style={{ marginBottom: "0.65rem" }}>
                  Photo du véhicule, personnage ou objet à intégrer — pour un
                  rendu plus précis.
                </p>
                <input
                  ref={refImageFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    void handleRefImageUpload(e.target.files?.[0] ?? null)
                  }
                />
                <button
                  type="button"
                  className={`via-upload-zone ${refImagePreview ? "has-file" : ""}`}
                  style={{ minHeight: "5rem" }}
                  onClick={() => refImageFileRef.current?.click()}
                >
                  <span className="via-upload-zone__text">
                    {refImagePreview
                      ? "Changer la photo de référence"
                      : "Ajouter une photo de référence"}
                  </span>
                </button>
                {refImagePreview && (
                  <div className="via-preview-frame" style={{ maxWidth: "8rem" }}>
                    <img src={refImagePreview} alt="Référence" />
                  </div>
                )}

                <label className="via-step-label" style={{ marginTop: "1.25rem" }}>
                  <Sparkles className="h-3.5 w-3.5" />
                  Étape 2 — Prompt
                </label>
                <textarea
                  value={swapPrompt}
                  onChange={(e) => setSwapPrompt(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Ex. : Remplace ma Clio par une Lamborghini Urus, garde exactement les mêmes mouvements."
                  className="via-prompt-field"
                />
                <div className="via-chips">
                  {VIDEO_VEHICLE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className="via-chip"
                      onClick={() =>
                        setSwapPrompt(
                          `Remplace le véhicule par ${preset.label}. Garde le décor, le sol, les reflets et les mouvements de caméra identiques.`,
                        )
                      }
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {videoPreview ? (
              <VideoVoiceAddon
                enabled={voiceEnabled}
                onEnabledChange={setVoiceEnabled}
                text={voiceText}
                onTextChange={setVoiceText}
                consent={voiceConsent}
                onConsentChange={setVoiceConsent}
                maxChars={voiceMaxChars}
              />
            ) : null}

            <button
              type="button"
              className="via-cta"
              disabled={
                !canGenerateV2V ||
                isSubmitting ||
                generateVideo.isPending ||
                isVideoUploading
              }
              onClick={() => void handleGenerateV2V()}
            >
              {isVideoUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Envoi de la vidéo…
                </>
              ) : isSubmitting || generateVideo.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Remplacement…
                </>
              ) : (
                <>
                  <Film className="h-4 w-4" />
                  Remplacer le véhicule · {creditCost} crédits
                </>
              )}
            </button>
          </>
        )}
      </div>

      <p className="via-footer-link">
        Retrouve tes créations dans{" "}
        <button type="button" onClick={() => setLocation("/historique")}>
          Historique → Mes vidéos
        </button>
      </p>
    </div>
  );
}
