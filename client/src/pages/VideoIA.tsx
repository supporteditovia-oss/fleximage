import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Link, Redirect, useLocation } from "wouter";
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
  i2vDuration5sExtraCredits,
  i2vQuality1080ExtraCredits,
  type VideoI2VDurationSec,
} from "@shared/video-i2v-pricing";
import {
  computeVideoCreditCost,
  DEFAULT_IMAGE_TO_VIDEO_PROMPT,
  maxVoiceCharsForVideoDuration,
  VIDEO_I2V_OUTPUT_DURATION_SEC,
  VIDEO_V2V_MAX_DURATION_SEC,
  VIDEO_V2V_MIN_DURATION_SEC,
  VIDEO_V2V_MAX_SIZE_MB,
  VIDEO_V2V_PRESETS,
  type VideoAspectRatio,
  type VideoQuality,
  type VideoWorkflow,
} from "@/lib/video-studio-config";
import {
  computeV2VStudioCreditCost,
  normalizeVideoUltraDuration,
  VIDEO_ULTRA_RESOLUTION_OPTIONS,
  type VideoUltraResolution,
} from "@shared/video-ultra-pricing";
import {
  finalizeI2VMotionPromptForSubmit,
  finalizeV2VPromptForSubmit,
  isVehicleDrivingPrompt,
  resolveV2VProviderForStudio,
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
  prepareVideoFileForStudioWithTimeout,
  type StudioVideoUpload,
} from "@/lib/upload-video";
import { isImageMediaFile, isVideoMediaFile } from "@/lib/media-file-detect";
import { extractVideoFrameAsJpegFile } from "@/lib/video-frame";
import { useAdminPreviewFeatures } from "@/lib/admin-preview-features";
import { useV2Access } from "@/hooks/use-v2-access";
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
    hint: "3–5 s · 720p / 1080p · prix dynamique",
    icon: ImageIcon,
  },
  {
    id: "video_to_video",
    label: "Vidéo → Vidéo",
    hint: "3–8 s · 720p / 1080p / 4K · prix selon durée",
    icon: Wand2,
  },
];

function v2vResolutionLabel(res: VideoUltraResolution): string {
  if (res === "4k") return "4K";
  return res;
}

export default function VideoIA() {
  const [, setLocation] = useLocation();
  const adminPreview = useAdminPreviewFeatures();
  const { v2Enabled, isLoading: v2Loading } = useV2Access();
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
  const [durationSec, setDurationSec] = useState<VideoI2VDurationSec>(5);
  const [videoQuality, setVideoQuality] = useState<VideoQuality>("standard");
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>("9:16");

  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoSource, setVideoSource] = useState<StudioVideoUpload | null>(
    null,
  );
  /** Fichier local prêt dès la lecture metadata — ne pas attendre R2/base64. */
  const [localVideoFile, setLocalVideoFile] = useState<File | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const [videoDurationSec, setVideoDurationSec] = useState<number | null>(null);
  /** Lecture durée + vignette (court). */
  const [isVideoReading, setIsVideoReading] = useState(false);
  /** Envoi cloud / encodage base64 en arrière-plan — ne bloque plus toute la page. */
  const [isVideoCloudSync, setIsVideoCloudSync] = useState(false);
  const videoUploadGenRef = useRef(0);
  const [refImagePreview, setRefImagePreview] = useState<string | null>(null);
  const [refImageBase64, setRefImageBase64] = useState<string | null>(null);
  /** false = vignette auto extraite de la vidéo (cachée en UI, utilisée côté serveur). */
  const [refImageIsCustom, setRefImageIsCustom] = useState(false);
  const [swapPrompt, setSwapPrompt] = useState("");
  const [v2vResolution, setV2vResolution] =
    useState<VideoUltraResolution>("720p");

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

  /** iOS Safari : lancer la lecture dès que le blob est prêt (évite écran noir). */
  useEffect(() => {
    const el = videoPreviewRef.current;
    if (!el || !videoPreview) return;
    const kick = () => {
      try {
        if (el.paused) void el.play().catch(() => {});
      } catch {
        /* autoplay policy */
      }
    };
    el.addEventListener("loadeddata", kick);
    if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) kick();
    return () => el.removeEventListener("loadeddata", kick);
  }, [videoPreview]);

  const imagePreviewUrl = uploadPreview || prefillImageUrl;

  const voiceMaxChars = maxVoiceCharsForVideoDuration(
    workflow === "video_to_video" ? videoDurationSec : durationSec,
  );

  const voiceReady =
    !voiceEnabled ||
    (voiceText.trim().length >= 5 && voiceText.length <= voiceMaxChars);

  const adminBurn = ADMIN_PRICING_REFERENCE.creditBurn;
  const i2vBillingGrid = adminPreview ? ("admin_v2" as const) : ("prod" as const);
  const i2vExtra5s = i2vDuration5sExtraCredits(i2vBillingGrid);
  const i2vExtra1080 = i2vQuality1080ExtraCredits(i2vBillingGrid);
  const v2vBillingDurationSec = normalizeVideoUltraDuration(
    videoDurationSec ?? 5,
  );

  const v2vCreditsForResolution = (res: VideoUltraResolution) =>
    adminPreview
      ? adminPreviewVideoCreditCost({
          workflow: "video_to_video",
          durationSec: v2vBillingDurationSec,
          v2vResolution: res,
          preserveSourceAudio: preserveSourceVoice,
        })
      : computeV2VStudioCreditCost({
          sourceVideoDurationSec: v2vBillingDurationSec,
          resolution: res,
          preserveSourceAudio: preserveSourceVoice,
        });

  const creditCost =
    workflow === "video_to_video"
      ? v2vCreditsForResolution(v2vResolution)
      : adminPreview
        ? adminPreviewVideoCreditCost({
            workflow: "image_to_video",
            durationSec,
            quality: videoQuality,
            voiceEnabled,
          })
        : computeVideoCreditCost({
            workflow: "image_to_video",
            durationSec,
            quality: videoQuality,
            voiceEnabled,
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
  const hasVideoReady = Boolean(videoSource || localVideoFile);
  const videoImportBusy = isVideoReading && !videoPreview;
  const canGenerateV2V =
    hasVideoReady &&
    swapPrompt.trim().length >= 5 &&
    canAfford &&
    !videoImportBusy;

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
          "Importe une vidéo — MP4, MOV iPhone, enregistrement caméra, etc.",
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
    setIsVideoReading(true);
    setIsVideoCloudSync(false);
    setVideoSource(null);
    setLocalVideoFile(null);
    setVideoDurationSec(null);
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
      setLocalVideoFile(normalized);

      setVideoPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(normalized);
      });
      setVideoDurationSec(Number(formatVideoDurationLabel(duration)));
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

    void (async () => {
      try {
        const frameFile = await extractVideoFrameAsJpegFile(fileReadyForCloud);
        if (videoUploadGenRef.current !== uploadGen) return;
        const frameCompressed = await compressImageForGeneration(frameFile);
        if (videoUploadGenRef.current !== uploadGen) return;
        const frameB64 = await fileToBase64(frameCompressed);
        if (videoUploadGenRef.current !== uploadGen) return;
        setRefImageBase64(frameB64);
        setRefImageIsCustom(false);
        setRefImagePreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(frameCompressed);
        });
      } catch {
        /* vignette auto optionnelle — la V2V fonctionne sans */
      }
    })();

    setIsVideoCloudSync(true);
    void (async () => {
      try {
        const prepared = await prepareVideoFileForStudioWithTimeout(
          fileReadyForCloud,
        );
        if (videoUploadGenRef.current !== uploadGen) return;
        setVideoSource(prepared);
      } catch (err: unknown) {
        if (videoUploadGenRef.current !== uploadGen) return;
        const isTimeout =
          err instanceof Error && err.message === "PREPARE_VIDEO_TIMEOUT";
        if (!isTimeout) {
          const message =
            err instanceof Error ? err.message : "Impossible d'envoyer la vidéo.";
          toast({
            variant: "destructive",
            title: "Préparation lente",
            description: `${message} Tu peux quand même lancer la transformation — envoi au clic.`,
          });
        }
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
          quality: videoQuality,
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
        quality: videoQuality,
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
    if (!canGenerateV2V) return;

    let source = videoSource;
    if (!source && localVideoFile) {
      setIsVideoCloudSync(true);
      try {
        source = await prepareVideoFileForStudio(localVideoFile);
        setVideoSource(source);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Impossible d'envoyer la vidéo.";
        toast({
          variant: "destructive",
          title: "Envoi impossible",
          description: message,
        });
        return;
      } finally {
        setIsVideoCloudSync(false);
      }
    }
    if (!source) return;

    const v2vProvider = resolveV2VProviderForStudio(swapPrompt);

    let referenceImages: string[] | undefined;
    if (refImageBase64) {
      referenceImages = [refImageBase64];
    } else if (
      localVideoFile &&
      !refImageIsCustom &&
      v2vProvider !== "runway_aleph"
    ) {
      try {
        const frameFile = await extractVideoFrameAsJpegFile(localVideoFile);
        const frameCompressed = await compressImageForGeneration(frameFile);
        const frameB64 = await fileToBase64(frameCompressed);
        setRefImageBase64(frameB64);
        setRefImageIsCustom(false);
        referenceImages = [frameB64];
      } catch {
        /* Kling seulement — Aleph n'a pas besoin de frame avant envoi */
      }
    }

    releaseGenerationLoaderTheme();
    flushSync(() => {
      setGenerationEstimate(
        estimateVideoGenerationSeconds({
          workflow: "video_to_video",
          v2vProvider,
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
        ...(source.mode === "url"
          ? { video_url: source.videoUrl }
          : { videos: [source.dataUrl] }),
        vehicle_prompt: sanitizedPrompt,
        source_video_duration_sec: videoDurationSec ?? undefined,
        v2v_resolution: v2vResolution,
        preserve_source_audio: preserveSourceVoice,
        voice_enabled: false,
        ...(referenceImages?.length
          ? { reference_images: referenceImages }
          : {}),
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
    : [
        `${durationSec} s`,
        videoQuality === "high" ? "1080p" : "720p",
        "24 fps",
        aspectRatio,
      ];

  if (v2Loading && user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!v2Enabled) {
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
        <p className="mt-4 text-sm text-[var(--lx-muted)]">
          <Link href="/transformation-pro" className="underline underline-offset-2">
            Transformation Pro — décor premium, ta voix conservée →
          </Link>
        </p>
      </header>

      <div className="via-mode-grid">
        {WORKFLOW_OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setWorkflow(option.id);
                if (option.id === "video_to_video") {
                  setAspectRatio("16:9");
                }
              }}
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
              JPG ou PNG — ta propre image.               Choisis la <strong>durée</strong> (3 ou{" "}
              {VIDEO_I2V_OUTPUT_DURATION_SEC} s) et la <strong>qualité</strong>{" "}
              (720p / 1080p) : le prix se met à jour automatiquement. Le mode{" "}
              <strong>3 s</strong> reste facturé comme un clip court côté studio
              (génération 5 s max). Par défaut la vidéo est{" "}
              <strong>muette</strong> — active l&apos;option voix IA (+
              {adminBurn.videoVoiceExtra} crédits) pour entendre un texte à
              lire.
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

            <div className="via-option-block via-option-block--prominent">
              <p className="via-option-block__label">Durée du clip</p>
              <div
                className="via-orient-toggle via-orient-toggle--wide"
                role="group"
                aria-label="Durée"
              >
                <button
                  type="button"
                  className={`via-orient-toggle__btn ${durationSec === 3 ? "is-active" : ""}`}
                  onClick={() => setDurationSec(3)}
                >
                  3 secondes
                </button>
                <button
                  type="button"
                  className={`via-orient-toggle__btn ${durationSec === 5 ? "is-active" : ""}`}
                  onClick={() => setDurationSec(5)}
                >
                  5 secondes
                  <span className="via-orient-toggle__hint">
                    +{i2vExtra5s} cr
                  </span>
                </button>
              </div>
            </div>

            <div className="via-option-block via-option-block--prominent">
              <p className="via-option-block__label">Qualité</p>
              <div
                className="via-orient-toggle via-orient-toggle--wide"
                role="group"
                aria-label="Qualité"
              >
                <button
                  type="button"
                  className={`via-orient-toggle__btn ${videoQuality === "standard" ? "is-active" : ""}`}
                  onClick={() => setVideoQuality("standard")}
                >
                  720p
                </button>
                <button
                  type="button"
                  className={`via-orient-toggle__btn ${videoQuality === "high" ? "is-active" : ""}`}
                  onClick={() => setVideoQuality("high")}
                >
                  1080p
                  <span className="via-orient-toggle__hint">
                    +{i2vExtra1080} cr
                  </span>
                </button>
              </div>
            </div>

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
                  « il parle ». À l&apos;envoi, le studio{" "}
                  <strong>optimise ton prompt</strong> puis génère le clip
                  cinématique.
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
              Filme avec ton smartphone — conduite, danse, scène, objet ou
              véhicule…{" "}
              <strong>
                {VIDEO_V2V_MIN_DURATION_SEC}–{VIDEO_V2V_MAX_DURATION_SEC} s
              </strong>
              . Choisis la <strong>qualité</strong> (720p / 1080p / 4K) : le prix
              s&apos;ajuste selon la durée détectée
              {videoDurationSec
                ? ` (${v2vBillingDurationSec} s)`
                : " (5 s par défaut avant import)"}
              . Le studio conserve ta caméra et tes mouvements. Par défaut la
              vidéo est <strong>muette</strong> — active l&apos;option voix (+
              {adminBurn.videoVoiceExtra} crédits) pour garder ta voix filmée.
            </p>

            <div className="via-option-block via-option-block--prominent">
              <p className="via-option-block__label">Qualité de sortie</p>
              <div
                className="via-orient-toggle via-orient-toggle--wide"
                role="group"
                aria-label="Qualité vidéo"
              >
                {VIDEO_ULTRA_RESOLUTION_OPTIONS.map((res) => (
                  <button
                    key={res}
                    type="button"
                    className={`via-orient-toggle__btn ${v2vResolution === res ? "is-active" : ""}`}
                    onClick={() => setV2vResolution(res)}
                  >
                    {v2vResolutionLabel(res)}
                    <span className="via-orient-toggle__hint">
                      {v2vCreditsForResolution(res)} cr
                    </span>
                  </button>
                ))}
              </div>
            </div>

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
              disabled={videoImportBusy}
              onClick={() => videoFileRef.current?.click()}
            >
              <span className="via-upload-zone__icon">
                {videoImportBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
              </span>
              <span className="via-upload-zone__text">
                {videoImportBusy
                  ? "Lecture de la vidéo…"
                  : videoPreview
                    ? "Changer la vidéo"
                    : "Choisir une vidéo"}
              </span>
              <span className="via-upload-zone__meta">
                Vidéo · {VIDEO_V2V_MIN_DURATION_SEC}–{VIDEO_V2V_MAX_DURATION_SEC} s · max{" "}
                {VIDEO_V2V_MAX_SIZE_MB} Mo
                {videoDurationSec ? ` · ${videoDurationSec}s détectées` : ""}
              </span>
            </button>

            {videoPreview && (
              <div className="via-preview-frame">
                <video
                  ref={videoPreviewRef}
                  src={videoPreview}
                  poster={refImagePreview ?? undefined}
                  controls
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  className="via-preview-frame__video"
                  onLoadedMetadata={(e) => {
                    const el = e.currentTarget;
                    try {
                      if (el.duration > 0.05) {
                        el.currentTime = Math.min(0.05, el.duration * 0.02);
                      }
                      void el.play().catch(() => {});
                    } catch {
                      /* iOS blob seek */
                    }
                  }}
                />
              </div>
            )}
            {isVideoCloudSync ? (
              <p className="via-step-desc" style={{ marginTop: "0.5rem" }}>
                <Loader2
                  className="mr-1 inline h-3.5 w-3.5 animate-spin align-[-2px]"
                  aria-hidden
                />
                Préparation serveur en cours… Tu peux remplir le prompt et
                lancer — envoi final au clic si besoin.
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
                  Écris en français librement (comme en Image IA : « remplace
                  l&apos;intérieur par… », « mets-moi à Dubaï… »). À
                  l&apos;envoi, le studio <strong>reformule et affûte</strong>{" "}
                  ton prompt puis applique la transformation sur ta vidéo —
                  visage non requis.
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
                videoImportBusy
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
