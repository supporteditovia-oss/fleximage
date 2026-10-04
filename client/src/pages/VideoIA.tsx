import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";
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
import { VideoIAStudioView } from "@/pages/video-ia/VideoIAStudioView";
import { pathForVideoStudioMode, type VideoStudioMode } from "@/lib/video-studio-modes";
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
  VIDEO_V2V_MAX_DURATION_SEC,
  VIDEO_V2V_MIN_DURATION_SEC,
  VIDEO_V2V_MAX_SIZE_MB,
  type VideoAspectRatio,
  type VideoQuality,
  type VideoWorkflow,
} from "@/lib/video-studio-config";
import {
  computeV2VStudioCreditCost,
  normalizeVideoUltraDuration,
  v2vEngineFamilyFromProvider,
  v2vResolutionsForEngineFamily,
  type VideoUltraResolution,
} from "@shared/video-ultra-pricing";
import {
  finalizeI2VMotionPromptForSubmit,
  finalizeV2VPromptForSubmit,
} from "@/lib/v2v-prompt";
import {
  parseV2VIntentFromUrl,
  resolveV2VBillingProvider,
  resolveV2VProviderForStudioSubmit,
  type V2VStudioIntent,
} from "@/lib/v2v-studio-intent";
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

function v2vResolutionLabel(res: VideoUltraResolution): string {
  if (res === "4k") return "4K";
  return res;
}

export default function VideoIA() {
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
  const [v2vIntent, setV2vIntent] = useState<V2VStudioIntent>("scene");
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("workflow");
    if (raw === "video_to_video" || raw === "image_to_video") {
      setWorkflow(raw);
    }
    const intentFromUrl = parseV2VIntentFromUrl(params.get("intent"));
    if (intentFromUrl) setV2vIntent(intentFromUrl);
  }, []);

  const syncV2vUrl = useCallback(
    (intent: V2VStudioIntent) => {
      window.history.replaceState(
        null,
        "",
        pathForVideoStudioMode("video_to_video", intent),
      );
    },
    [],
  );

  const handleV2vIntentSelect = (intent: V2VStudioIntent) => {
    setV2vIntent(intent);
    syncV2vUrl(intent);
  };

  const handleStudioModeSelect = (mode: VideoStudioMode) => {
    setWorkflow(mode);
    if (mode === "video_to_video") {
      setAspectRatio("16:9");
      syncV2vUrl(v2vIntent);
    } else {
      window.history.replaceState(null, "", pathForVideoStudioMode(mode));
    }
  };

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

  const v2vProviderForBilling = useMemo(
    () => resolveV2VBillingProvider(v2vIntent, swapPrompt),
    [v2vIntent, swapPrompt],
  );

  const v2vResolutionOptions = useMemo(
    () =>
      v2vResolutionsForEngineFamily(
        v2vEngineFamilyFromProvider(v2vProviderForBilling),
      ),
    [v2vProviderForBilling],
  );

  useEffect(() => {
    if (workflow !== "video_to_video") return;
    if (v2vResolutionOptions.includes(v2vResolution)) return;
    setV2vResolution(v2vResolutionOptions[v2vResolutionOptions.length - 1]!);
  }, [workflow, v2vResolution, v2vResolutionOptions]);

  const v2vCreditsForResolution = (res: VideoUltraResolution) =>
    adminPreview
      ? adminPreviewVideoCreditCost({
          workflow: "video_to_video",
          durationSec: v2vBillingDurationSec,
          v2vResolution: res,
          preserveSourceAudio: preserveSourceVoice,
          v2vProvider: v2vProviderForBilling,
        })
      : computeV2VStudioCreditCost({
          sourceVideoDurationSec: v2vBillingDurationSec,
          resolution: res,
          preserveSourceAudio: preserveSourceVoice,
          v2vProvider: v2vProviderForBilling,
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

  const handleClearImage = useCallback(() => {
    setUploadPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setUploadBase64(null);
    setPrefillImageUrl(null);
    setPrefillLarpId(null);
    if (imageFileRef.current) imageFileRef.current.value = "";
  }, []);

  const handleClearVideo = useCallback(() => {
    videoUploadGenRef.current += 1;
    setVideoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setLocalVideoFile(null);
    setVideoSource(null);
    setVideoDurationSec(null);
    setIsVideoReading(false);
    setIsVideoCloudSync(false);
    setRefImageBase64(null);
    setRefImageIsCustom(false);
    setRefImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (videoFileRef.current) videoFileRef.current.value = "";
    if (refImageFileRef.current) refImageFileRef.current.value = "";
  }, []);

  const handleClearRefImage = useCallback(() => {
    setRefImageBase64(null);
    setRefImageIsCustom(false);
    setRefImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (refImageFileRef.current) refImageFileRef.current.value = "";
  }, []);

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

    if (source.mode === "inline") {
      const approxBytes = Math.floor((source.dataUrl.length * 3) / 4);
      if (approxBytes > 3.5 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "Vidéo trop lourde",
          description:
            "L'envoi direct n'a pas abouti. Réessaie en Wi‑Fi (upload cloud) ou avec une vidéo plus légère en 720p.",
        });
        return;
      }
    }

    const v2vProvider = resolveV2VProviderForStudioSubmit(v2vIntent);

    let referenceImages: string[] | undefined;
    if (v2vProvider === "kling_motion" && refImageBase64) {
      referenceImages = [refImageBase64];
    } else if (
      localVideoFile &&
      !refImageIsCustom &&
      v2vProvider === "kling_motion"
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
        v2v_intent: v2vIntent,
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
    <VideoIAStudioView
      key={workflow}
      workflow={workflow}
      onModeSelect={handleStudioModeSelect}
      creditCost={creditCost}
      imageFileRef={imageFileRef}
      imagePreviewUrl={imagePreviewUrl}
      onImageUpload={handleImageUpload}
      onClearImage={handleClearImage}
      onClearVideo={handleClearVideo}
      onClearRefImage={handleClearRefImage}
      motionPrompt={motionPrompt}
      onMotionPromptChange={setMotionPrompt}
      durationSec={durationSec}
      onDurationSec={setDurationSec}
      i2vExtra5s={i2vExtra5s}
      videoQuality={videoQuality}
      onVideoQuality={setVideoQuality}
      i2vExtra1080={i2vExtra1080}
      aspectRatio={aspectRatio}
      onAspectRatio={setAspectRatio}
      voiceEnabled={voiceEnabled}
      onVoiceEnabled={setVoiceEnabled}
      voiceText={voiceText}
      onVoiceText={setVoiceText}
      voiceMaxChars={voiceMaxChars}
      voiceExtraCredit={adminBurn.videoVoiceExtra}
      canGenerateI2V={canGenerateI2V}
      onGenerateI2V={handleGenerateI2V}
      i2vPending={isSubmitting || generateVideo.isPending}
      videoFileRef={videoFileRef}
      refImageFileRef={refImageFileRef}
      videoPreview={videoPreview}
      videoPreviewRef={videoPreviewRef}
      videoImportBusy={videoImportBusy}
      isVideoCloudSync={isVideoCloudSync}
      onVideoUpload={handleVideoUpload}
      videoDurationSec={videoDurationSec}
      v2vMinSec={VIDEO_V2V_MIN_DURATION_SEC}
      v2vMaxSec={VIDEO_V2V_MAX_DURATION_SEC}
      v2vMaxMb={VIDEO_V2V_MAX_SIZE_MB}
      v2vIntent={v2vIntent}
      onV2vIntent={handleV2vIntentSelect}
      v2vResolution={v2vResolution}
      onV2vResolution={setV2vResolution}
      v2vResolutionOptions={v2vResolutionOptions}
      v2vResolutionLabel={v2vResolutionLabel}
      v2vCreditsForResolution={v2vCreditsForResolution}
      swapPrompt={swapPrompt}
      onSwapPrompt={setSwapPrompt}
      refImageIsCustom={refImageIsCustom}
      refImagePreview={refImagePreview}
      onRefImageUpload={handleRefImageUpload}
      preserveSourceVoice={preserveSourceVoice}
      onPreserveSourceVoice={setPreserveSourceVoice}
      canGenerateV2V={canGenerateV2V}
      onGenerateV2V={handleGenerateV2V}
      v2vPending={isSubmitting || generateVideo.isPending}
    />
  );
}

