import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Redirect, useLocation } from "wouter";
import {
  Film,
  ImageIcon,
  Loader2,
  Sparkles,
  Upload,
  Video,
  Wand2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentPlan } from "@/hooks/use-billing";
import { useVideoStudioGenerate } from "@/hooks/use-video-studio";
import { GenerationProgress } from "@/components/larp/GenerationProgress";
import {
  VideoGenerationLoader,
  VideoGenerationLoaderBackdrop,
} from "@/components/larp/VideoGenerationLoader";
import {
  defaultVideoLoaderEstimate,
  estimateVideoGenerationSeconds,
} from "@/lib/video-generation-timing";
import { releaseGenerationLoaderTheme } from "@/lib/generation-loader-theme";
import "@/components/larp/generation-loader.css";
import { useToast } from "@/hooks/use-toast";
import { compressImageForGeneration } from "@/lib/compress-image";
import { VideoCreditSummary } from "@/components/video/VideoCreditSummary";
import { VideoSourceVoiceAddon } from "@/components/video/VideoSourceVoiceAddon";
import { VideoVoiceAddon } from "@/components/video/VideoVoiceAddon";
import {
  adminPreviewVideoCreditCost,
  ADMIN_PRICING_REFERENCE,
} from "@shared/pricing-admin-reference";
import {
  DEFAULT_IMAGE_TO_VIDEO_PROMPT,
  maxVoiceCharsForVideoDuration,
  VIDEO_I2V_OUTPUT_DURATION_SEC,
  VIDEO_V2V_MAX_DURATION_SEC,
  VIDEO_V2V_MIN_DURATION_SEC,
  VIDEO_V2V_MAX_SIZE_MB,
  VIDEO_V2V_PRESETS,
  type VideoAspectRatio,
  type VideoWorkflow,
} from "@/lib/video-studio-config";
import {
  finalizeI2VMotionPromptForSubmit,
  finalizeV2VPromptForSubmit,
  isVehicleDrivingPrompt,
} from "@/lib/v2v-prompt";
import {
  formatVideoDurationLabel,
  readVideoDurationSec,
  validateVideoDurationForUpload,
} from "@/lib/video-duration";
import { consumeVideoStudioPrefill } from "@/lib/video-studio-prefill";
import {
  formatVideoSizeMb,
  prepareVideoFileForStudio,
  type StudioVideoUpload,
} from "@/lib/upload-video";
import { isImageMediaFile, isVideoMediaFile } from "@/lib/media-file-detect";
import { extractVideoFrameAsJpegFile } from "@/lib/video-frame";
import { useAdminPreviewFeatures } from "@/lib/admin-preview-features";
import { writeStudioMode } from "@/lib/v2-experience";
import { releaseGenerationSubmitLock } from "@/lib/generation-submit-lock";
import { withNormalizedVideoFile } from "@/lib/media-file-detect";
import "./video-ia-page.css";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const ADMIN_VIDEO_BURN = ADMIN_PRICING_REFERENCE.creditBurn;

const WORKFLOW_OPTIONS: {
  id: VideoWorkflow;
  label: string;
  hint: string;
  icon: typeof ImageIcon;
}[] = [
  {
    id: "image_to_video",
    label: "Image → Vidéo",
    hint: `${ADMIN_VIDEO_BURN.videoI2V} cr / génération · 5 s`,
    icon: ImageIcon,
  },
  {
    id: "video_to_video",
    label: "Vidéo → Vidéo",
    hint: `${ADMIN_VIDEO_BURN.videoV2V} cr · 3–8 s · 720p`,
    icon: Wand2,
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
  /** Lecture durée + vignette (court). */
  const [isVideoReading, setIsVideoReading] = useState(false);
  /** Envoi cloud / encodage base64 en arrière-plan — ne bloque plus toute la page. */
  const [isVideoCloudSync, setIsVideoCloudSync] = useState(false);
  const [showVideoPlayback, setShowVideoPlayback] = useState(false);
  const videoUploadGenRef = useRef(0);
  const [refImagePreview, setRefImagePreview] = useState<string | null>(null);
  const [refImageBase64, setRefImageBase64] = useState<string | null>(null);
  /** false = vignette auto extraite de la vidéo (cachée en UI, utilisée côté serveur). */
  const [refImageIsCustom, setRefImageIsCustom] = useState(false);
  const [swapPrompt, setSwapPrompt] = useState("");

  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [preserveSourceVoice, setPreserveSourceVoice] = useState(false);

  const [taskId, setTaskId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generationEstimate, setGenerationEstimate] = useState<number | null>(
    null,
  );

  useEffect(() => {
    writeStudioMode("video");
    document.documentElement.classList.add("luxeflexia-video-page");
    setIsVideoReading(false);
    setIsVideoCloudSync(false);
    setIsSubmitting(false);
    releaseGenerationSubmitLock();
    generateVideo.reset();
    return () => {
      document.documentElement.classList.remove("luxeflexia-video-page");
    };
    // Remise à zéro des états bloqués au retour sur la page (refresh mobile).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount uniquement
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
    (voiceText.trim().length >= 5 && voiceText.length <= voiceMaxChars);

  const adminBurn = ADMIN_PRICING_REFERENCE.creditBurn;
  const creditCost = adminPreviewVideoCreditCost({
    workflow,
    voiceEnabled,
    preserveSourceAudio: preserveSourceVoice,
  });

  const buildVoicePayload = () =>
    voiceEnabled
      ? {
          voice_enabled: true,
          voice_mode: "catalog" as const,
          voice_text: voiceText.trim(),
          voice_consent: true,
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
    canAfford &&
    !isVideoReading &&
    !isVideoCloudSync &&
    Boolean(videoSource);

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;
    if (!isImageMediaFile(file)) {
      toast({
        variant: "destructive",
        title: "Format invalide",
        description: "Importe une photo JPG, PNG, WebP ou HEIC.",
      });
      return;
    }
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
    const normalized = withNormalizedVideoFile(file);
    if (!isVideoMediaFile(normalized)) {
      toast({
        variant: "destructive",
        title: "Format invalide",
        description:
          "Importe une vidéo (MP4, MOV…) — enregistrement, TikTok téléchargé, etc.",
      });
      return;
    }
    if (normalized.size > VIDEO_V2V_MAX_SIZE_MB * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Vidéo trop lourde",
        description: `Ta vidéo fait ${formatVideoSizeMb(normalized.size)} Mo (max ${VIDEO_V2V_MAX_SIZE_MB} Mo). Filme en 720p ou compresse avant d'importer.`,
      });
      return;
    }
    const uploadGen = ++videoUploadGenRef.current;
    setShowVideoPlayback(false);
    setIsVideoReading(true);
    setIsVideoCloudSync(false);
    setVideoSource(null);
    let fileReadyForCloud: File | null = null;
    try {
      const duration = await readVideoDurationSec(normalized);
      const check = validateVideoDurationForUpload(duration);
      if (!check.ok) {
        toast({
          variant: "destructive",
          title: "Vidéo refusée",
          description: check.message,
        });
        return;
      }
      fileReadyForCloud = normalized;

      setVideoPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(normalized);
      });
      setVideoDurationSec(Number(formatVideoDurationLabel(duration)));

      try {
        const frameFile = await extractVideoFrameAsJpegFile(normalized);
        const frameCompressed = await compressImageForGeneration(frameFile);
        const frameB64 = await fileToBase64(frameCompressed);
        setRefImageBase64(frameB64);
        setRefImageIsCustom(false);
        setRefImagePreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(frameCompressed);
        });
      } catch {
        /* aperçu vidéo brut si frame impossible */
      }
    } catch (err: unknown) {
      setVideoPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setVideoDurationSec(null);
      setRefImageBase64(null);
      setRefImageIsCustom(false);
      setRefImagePreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      const message =
        err instanceof Error ? err.message : "Impossible de lire cette vidéo.";
      toast({
        variant: "destructive",
        title: "Import impossible",
        description: message,
      });
    } finally {
      setIsVideoReading(false);
    }

    if (!fileReadyForCloud) return;

    setIsVideoCloudSync(true);
    void (async () => {
      try {
        const prepared = await prepareVideoFileForStudio(fileReadyForCloud);
        if (videoUploadGenRef.current !== uploadGen) return;
        setVideoSource(prepared);
      } catch (err: unknown) {
        if (videoUploadGenRef.current !== uploadGen) return;
        const message =
          err instanceof Error ? err.message : "Impossible d'envoyer la vidéo.";
        toast({
          variant: "destructive",
          title: "Envoi impossible",
          description: message,
        });
        setVideoPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        setVideoDurationSec(null);
      } finally {
        if (videoUploadGenRef.current === uploadGen) {
          setIsVideoCloudSync(false);
        }
      }
    })();
  };

  const handleGenerateI2V = async () => {
    if (isSubmitting || generateVideo.isPending || taskId) return;
    if (!canGenerateI2V) return;

    releaseGenerationLoaderTheme();
    flushSync(() => {
      setGenerationEstimate(
        estimateVideoGenerationSeconds({
          workflow: "image_to_video",
          durationSec,
          quality: "standard",
          voiceEnabled,
        }),
      );
      setIsSubmitting(true);
    });
    try {
      const rawPrompt =
        motionPrompt.trim().length >= 10
          ? motionPrompt.trim()
          : `${motionPrompt.trim()}. ${DEFAULT_IMAGE_TO_VIDEO_PROMPT}`;
      const prompt = finalizeI2VMotionPromptForSubmit(rawPrompt, voiceEnabled);
      if (prompt.length < 10) {
        toast({
          variant: "destructive",
          title: "Voix non activée",
          description:
            "Sans l'option voix (+5 crédits), le prompt ne peut pas demander de parole ou de son. Active « Ajouter une voix IA » ou décris seulement le mouvement visuel.",
        });
        setIsSubmitting(false);
        return;
      }

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
      if (result.estimatedSeconds) setGenerationEstimate(result.estimatedSeconds);
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
      setRefImageIsCustom(true);
      setRefImagePreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(compressed);
      });
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

    releaseGenerationLoaderTheme();
    flushSync(() => {
      setGenerationEstimate(
        estimateVideoGenerationSeconds({
          workflow: "video_to_video",
          v2vProvider: "kling_motion",
          sourceVideoDurationSec: videoDurationSec,
          preserveSourceAudio: preserveSourceVoice,
        }),
      );
      setIsSubmitting(true);
    });
    try {
      const sanitizedPrompt = finalizeV2VPromptForSubmit(
        swapPrompt,
        preserveSourceVoice,
      );

      const result = await generateVideo.mutateAsync({
        workflow: "video_to_video",
        aspect_ratio: aspectRatio,
        ...(videoSource.mode === "url"
          ? { video_url: videoSource.videoUrl }
          : { videos: [videoSource.dataUrl] }),
        vehicle_prompt: sanitizedPrompt,
        source_video_duration_sec: videoDurationSec ?? undefined,
        preserve_source_audio: preserveSourceVoice,
        voice_enabled: false,
        ...(refImageBase64 ? { reference_images: [refImageBase64] } : {}),
        source: "video_studio",
      });
      setTaskId(result.taskId);
      if (result.estimatedSeconds) setGenerationEstimate(result.estimatedSeconds);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Remplacement impossible";
      toast({ variant: "destructive", title: "Erreur", description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetStudio = useCallback(() => {
    releaseGenerationLoaderTheme();
    document.documentElement.removeAttribute("data-fullscreen-overlay");
    document.body.removeAttribute("data-fullscreen-overlay");
    setTaskId(null);
    setGenerationEstimate(null);
    setIsSubmitting(false);
  }, []);

  const isV2V = workflow === "video_to_video";
  const loaderImageUrl = isV2V
    ? refImagePreview || undefined
    : imagePreviewUrl || undefined;
  const loaderVideoUrl = isV2V ? videoPreview || undefined : undefined;
  const loaderSpecs = isV2V
    ? [
        "Motion cinéma",
        videoDurationSec ? `${videoDurationSec} s` : "V2V",
        "720p",
        aspectRatio,
      ]
    : [`${durationSec} s`, "24 fps", aspectRatio];

  if (!adminPreview) {
    return <Redirect to="/create" />;
  }

  const showSubmitLoader =
    (isSubmitting || generateVideo.isPending) && !taskId;

  if (showSubmitLoader) {
    return (
      <>
        <VideoGenerationLoaderBackdrop zIndex={99} />
        <VideoGenerationLoader
          taskId="video-submit"
          status="connecting"
          workflow={workflow}
          estimatedSeconds={
            generationEstimate ??
            defaultVideoLoaderEstimate({
              workflow,
              sourceVideoDurationSec: videoDurationSec,
              preserveSourceAudio: preserveSourceVoice,
              durationSec,
              voiceEnabled,
            })
          }
          inputImageUrl={loaderImageUrl}
          inputVideoUrl={loaderVideoUrl}
          aspectRatio={aspectRatio}
          specs={loaderSpecs}
        />
      </>
    );
  }

  if (taskId) {
    return (
      <>
        <VideoGenerationLoaderBackdrop zIndex={99} />
        <div className="mx-auto min-h-[calc(100dvh-5rem)] max-w-5xl px-4 py-6">
          <GenerationProgress
            taskId={taskId}
            inputImageUrl={loaderImageUrl}
            inputVideoUrl={loaderVideoUrl}
            onReset={resetStudio}
            resultType="video"
            videoWorkflow={workflow}
            aspectRatio={aspectRatio}
            videoSpecs={loaderSpecs}
            initialEstimatedSeconds={generationEstimate ?? undefined}
            sourceVideoDurationSec={videoDurationSec}
            preserveSourceAudio={preserveSourceVoice}
          />
        </div>
      </>
    );
  }

  return (
    <div className="via-studio pb-28 md:pb-10">
      <header className="via-hero via-hero--premium">
        <div className="via-hero__shine" aria-hidden />
        <p className="via-hero__eyebrow">
          <Film className="h-3.5 w-3.5" aria-hidden />
          Studio cinéma
        </p>
        <h1 className="via-hero__title">Vidéo IA</h1>
        <p className="via-hero__sub">
          Anime ta photo ou transforme ta vidéo smartphone — décor, personnage,
          objet, lieu. Rendu cinématique prêt pour TikTok &amp; Reels.
        </p>
        <div className="via-capabilities">
          <span className="via-capability">Dubai · Yacht · Jet</span>
          <span className="via-capability">Personnage · Tenue</span>
          <span className="via-capability">Objet · Véhicule</span>
          <span className="via-capability">
            Admin · grille v2 · I2V {adminBurn.videoI2V} cr
          </span>
        </div>
      </header>

      <div className="via-mode-grid">
        {WORKFLOW_OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setWorkflow(option.id)}
              className={`via-mode-card ${workflow === option.id ? "is-active" : ""}`}
            >
              <span className="via-mode-card__icon" aria-hidden>
                <Icon className="h-4 w-4" />
              </span>
              <span className="via-mode-card__label">{option.label}</span>
              <span className="via-mode-card__hint">{option.hint}</span>
            </button>
          );
        })}
      </div>

      <div key={workflow} className="via-panel via-panel-enter">
        <VideoCreditSummary creditCost={creditCost} />

        {workflow === "image_to_video" ? (
          <>
            <p className="via-step-pill">
              <ImageIcon className="h-3.5 w-3.5" />
              Étape 1
            </p>
            <h2 className="via-step-title">Importe ta photo</h2>
            <p className="via-step-desc">
              JPG ou PNG — ta propre image. Vidéo verticale max{" "}
              {VIDEO_I2V_OUTPUT_DURATION_SEC} s ·{" "}
              <strong>{adminBurn.videoI2V} crédits</strong> par génération. Par
              défaut la vidéo est <strong>muette</strong> — active l&apos;option
              voix IA (+{adminBurn.videoVoiceExtra} crédits) pour entendre un
              texte à lire.
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
                <p className="via-step-pill" style={{ marginTop: "1.25rem" }}>
                  <Sparkles className="h-3.5 w-3.5" />
                  Étape 2 — Mouvement &amp; scène
                </p>
                <p className="via-step-desc" style={{ marginTop: "0.35rem" }}>
                  <strong>Action visuelle seulement</strong> : ce que fait le
                  corps, la caméra, l&apos;environnement (tomber, sourire,
                  ralenti…).{" "}
                  <strong>Pas de paroles ni de cris ici</strong> — sans
                  l&apos;option voix, la vidéo reste muette même si tu écris
                  « il parle ». À l&apos;envoi,{" "}
                  <strong>Gemini optimise ton prompt</strong> puis l&apos;IA
                  vidéo génère le clip.
                </p>
                <textarea
                  value={motionPrompt}
                  onChange={(e) => setMotionPrompt(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Ex. : Il tombe dans l'eau en souriant, caméra lente, éclaboussures…"
                  className="via-prompt-field"
                />
              </>
            )}

            {imagePreviewUrl ? (
              <VideoVoiceAddon
                enabled={voiceEnabled}
                onEnabledChange={(next) => {
                  setVoiceEnabled(next);
                  if (!next) {
                    setVoiceText("");
                  }
                }}
                text={voiceText}
                onTextChange={setVoiceText}
                maxChars={voiceMaxChars}
                voiceExtraCredit={adminBurn.videoVoiceExtra}
              />
            ) : null}

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
            <p className="via-step-pill">
              <Video className="h-3.5 w-3.5" />
              Étape 1
            </p>
            <h2 className="via-step-title">Importe ta vidéo</h2>
            <p className="via-step-desc">
              Filme avec ton smartphone — idéalement avec{" "}
              <strong>toi ou tes mains visibles</strong> (ex. au volant). Scène,
              objet ou véhicule…{" "}
              <strong>
                {VIDEO_V2V_MIN_DURATION_SEC}–{VIDEO_V2V_MAX_DURATION_SEC} s
              </strong>{" "}
              en <strong>720p</strong> ·{" "}
              {adminBurn.videoV2V} crédits. Le studio conserve ta caméra et tous
              les mouvements. Change le décor (Dubai, yacht…),
              le personnage, la tenue ou l&apos;objet. Par défaut, la vidéo est{" "}
              <strong>muette</strong> — active l&apos;option voix (+
              {adminBurn.videoVoiceExtra} crédits)
              pour garder ta voix filmée.
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
              disabled={isVideoReading}
              onClick={() => videoFileRef.current?.click()}
            >
              <span className="via-upload-zone__icon">
                {isVideoReading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
              </span>
              <span className="via-upload-zone__text">
                {isVideoReading
                  ? "Lecture de la vidéo…"
                  : videoPreview
                    ? "Changer la vidéo"
                    : "Choisir une vidéo"}
              </span>
              <span className="via-upload-zone__meta">
                Vidéo · 720p · {VIDEO_V2V_MIN_DURATION_SEC}–{VIDEO_V2V_MAX_DURATION_SEC} s · max{" "}
                {VIDEO_V2V_MAX_SIZE_MB} Mo
                {videoDurationSec ? ` · ${videoDurationSec}s détectées` : ""}
              </span>
            </button>

            {videoPreview && (
              <div className="via-preview-frame">
                {refImagePreview && !showVideoPlayback ? (
                  <button
                    type="button"
                    className="via-preview-frame__still-btn"
                    onClick={() => setShowVideoPlayback(true)}
                  >
                    <img
                      src={refImagePreview}
                      alt="Aperçu de ta vidéo"
                      className="via-preview-frame__still"
                    />
                    <span className="via-preview-frame__play-hint">
                      Appuie pour lire la vidéo
                    </span>
                  </button>
                ) : (
                  <video
                    src={videoPreview}
                    poster={refImagePreview ?? undefined}
                    controls
                    autoPlay={showVideoPlayback}
                    muted
                    playsInline
                    preload="metadata"
                  />
                )}
              </div>
            )}
            {isVideoCloudSync ? (
              <p className="via-step-desc" style={{ marginTop: "0.5rem" }}>
                <Loader2
                  className="mr-1 inline h-3.5 w-3.5 animate-spin align-[-2px]"
                  aria-hidden
                />
                Finalisation de l&apos;import en arrière-plan… Tu peux déjà
                remplir le prompt.
              </p>
            ) : null}

            {videoPreview && (
              <>
                <p className="via-step-desc" style={{ marginTop: "0.85rem" }}>
                  En haut : <strong>ta vidéo source</strong> (mouvements, caméra).
                  Le studio prépare automatiquement une image à partir de cette
                  vidéo — tu n&apos;as rien à faire de plus.
                </p>

                <p className="via-step-pill" style={{ marginTop: "1rem" }}>
                  <ImageIcon className="h-3.5 w-3.5" />
                  Photo bonus (optionnel)
                </p>
                <p className="via-step-desc" style={{ marginBottom: "0.65rem" }}>
                  Uniquement si tu veux imposer un look précis (Urus, tenue,
                  personnage…) en plus de ta vidéo. Sinon, ignore cette étape.
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
                  className={`via-upload-zone ${refImageIsCustom ? "has-file" : ""}`}
                  style={{ minHeight: "4.25rem" }}
                  onClick={() => refImageFileRef.current?.click()}
                >
                  <span className="via-upload-zone__text">
                    {refImageIsCustom
                      ? "Changer la photo bonus"
                      : "Ajouter une photo bonus (optionnel)"}
                  </span>
                </button>
                {refImageIsCustom && refImagePreview ? (
                  <div className="via-preview-frame" style={{ maxWidth: "8rem" }}>
                    <img src={refImagePreview} alt="Photo bonus" />
                  </div>
                ) : null}

                <p className="via-step-pill" style={{ marginTop: "1.25rem" }}>
                  <Sparkles className="h-3.5 w-3.5" />
                  Étape 2 — Prompt
                </p>
                <p className="via-step-desc" style={{ marginTop: "0.35rem" }}>
                  Écris en français librement — à l&apos;envoi,{" "}
                  <strong>Gemini 2.5 Flash</strong> reformule le prompt (plus
                  précis, plus réaliste) puis l&apos;IA vidéo applique la
                  transformation sur ta vidéo.
                </p>
                <textarea
                  value={swapPrompt}
                  onChange={(e) => setSwapPrompt(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Ex. : Remplace ma voiture et ma clé par le modèle exact demandé (clé OEM incluse) — ex. Purosangue, G-Class, RS6…"
                  className="via-prompt-field"
                />
                {!preserveSourceVoice ? (
                  <p className="via-voice-blocked-note">
                    Sans l&apos;option voix (+5 cr), les demandes de voix ou de
                    son dans le prompt sont ignorées — sortie 100 % muette.
                  </p>
                ) : null}
                {isVehicleDrivingPrompt(swapPrompt) ? (
                  <p className="via-voice-blocked-note">
                    Véhicule détecté (<strong>toutes marques</strong>) : swap
                    complet voiture + <strong>clé OEM du modèle demandé</strong>{" "}
                    (Purosangue → clé Ferrari, G-Class → clé Mercedes…),
                    compteur calé, logique réelle P / D / écrans.
                  </p>
                ) : null}
                <div className="via-chips">
                  {VIDEO_V2V_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className="via-chip"
                      onClick={() =>
                        setSwapPrompt(
                          `${preset.prompt} Garde le décor, le sol, les reflets et les mouvements de caméra identiques.`,
                        )
                      }
                    >
                      <span className="via-chip__emoji" aria-hidden>
                        {preset.emoji}
                      </span>
                      {preset.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {videoPreview ? (
              <VideoSourceVoiceAddon
                enabled={preserveSourceVoice}
                onEnabledChange={setPreserveSourceVoice}
                voiceExtraCredit={adminBurn.videoVoiceExtra}
              />
            ) : null}

            <button
              type="button"
              className="via-cta"
              disabled={
                !canGenerateV2V ||
                isSubmitting ||
                generateVideo.isPending ||
                isVideoReading ||
                isVideoCloudSync
              }
              onClick={() => void handleGenerateV2V()}
            >
              {isVideoCloudSync ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Import en cours…
                </>
              ) : isSubmitting || generateVideo.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Remplacement…
                </>
              ) : (
                <>
                  <Film className="h-4 w-4" />
                  Transformer ma vidéo · {creditCost} crédits
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
