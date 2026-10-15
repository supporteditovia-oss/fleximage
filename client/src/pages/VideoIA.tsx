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
import {
  isMotionStagingToggleUiVisible,
  motionStagingTogglePayload,
  readMotionStagingFfmpegPostprocessOn,
  readMotionStagingPromptIntelligenceOn,
  readMotionStagingV2ContactShadowOn,
  readMotionStagingV2EdgeBlendOn,
  readMotionStagingV2EraseOn,
  readMotionStagingV2LightMatchOn,
  setMotionStagingFfmpegPostprocessOn,
  setMotionStagingPromptIntelligenceOn,
  setMotionStagingV2ContactShadowOn as persistMotionStagingV2Shadow,
  setMotionStagingV2EdgeBlendOn as persistMotionStagingV2Edge,
  setMotionStagingV2EraseOn as persistMotionStagingV2Erase,
  setMotionStagingV2LightMatchOn as persistMotionStagingV2Light,
} from "@/lib/motion-staging-toggles";
import { pathForVideoStudioMode, type VideoStudioMode } from "@/lib/video-studio-modes";
import {
  createEmptySceneLuxeSlots,
  newSceneLuxePhotoId,
  sceneLuxeFilledPhotos,
  SCENE_LUXE_MAX_PHOTOS,
  type SceneLuxePhotoRef,
  type SceneLuxePhotoSlots,
} from "@/lib/scene-luxe-reference-photos";
import {
  adminPreviewVideoCreditCost,
  ADMIN_PRICING_REFERENCE,
} from "@shared/pricing-admin-reference";
import {
  computePreviewV3V2VTransformCredits,
  PREVIEW_V3_CREDIT_BURN,
} from "@shared/subscription-preview-v3";
import { fetchI2vSoundDetect } from "@/lib/i2v-sound-auto-detect";
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
  coerceV2VStudioIntent,
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
  /** Voix/son I2V avancés — admin preview uniquement (pas les clients). */
  const i2vAdminStudioEnabled = adminPreview;
  const { data: plan } = useCurrentPlan({ enabled: Boolean(user) });
  const subscriptionPreviewV3Active = Boolean(plan?.subscriptionPreviewV3Active);
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
  const refImageIsCustomRef = useRef(false);
  useEffect(() => {
    refImageIsCustomRef.current = refImageIsCustom;
  }, [refImageIsCustom]);
  const [swapPrompt, setSwapPrompt] = useState("");
  const [sceneLuxeSlots, setSceneLuxeSlots] = useState<SceneLuxePhotoSlots>(
    createEmptySceneLuxeSlots,
  );
  const sceneLuxeSlotsRef = useRef<SceneLuxePhotoSlots>(createEmptySceneLuxeSlots());
  const scenePhotoAddChainRef = useRef<Promise<void>>(Promise.resolve());
  const [scenePhotosBusy, setScenePhotosBusy] = useState(false);
  useEffect(() => {
    sceneLuxeSlotsRef.current = sceneLuxeSlots;
  }, [sceneLuxeSlots]);
  const sceneLuxePhotos = useMemo(
    () => sceneLuxeFilledPhotos(sceneLuxeSlots),
    [sceneLuxeSlots],
  );
  const [v2vIntent, setV2vIntent] = useState<V2VStudioIntent>("scene");
  const showMotionStagingToggles = isMotionStagingToggleUiVisible();
  const [motionStagingPromptOn, setMotionStagingPromptOn] = useState(() =>
    readMotionStagingPromptIntelligenceOn(),
  );
  const [motionStagingFfmpegOn, setMotionStagingFfmpegOn] = useState(() =>
    readMotionStagingFfmpegPostprocessOn(),
  );
  const [motionStagingV2EraseOn, setMotionStagingV2EraseOn] = useState(() =>
    readMotionStagingV2EraseOn(),
  );
  const [motionStagingV2EdgeOn, setMotionStagingV2EdgeOn] = useState(() =>
    readMotionStagingV2EdgeBlendOn(),
  );
  const [motionStagingV2LightOn, setMotionStagingV2LightOn] = useState(() =>
    readMotionStagingV2LightMatchOn(),
  );
  const [motionStagingV2ShadowOn, setMotionStagingV2ShadowOn] = useState(() =>
    readMotionStagingV2ContactShadowOn(),
  );
  const [v2vResolution, setV2vResolution] =
    useState<VideoUltraResolution>("720p");

  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [i2vVoiceId, setI2vVoiceId] = useState<string | null>(null);
  const [suggestedVoiceFilter, setSuggestedVoiceFilter] = useState<
    "all" | "homme" | "femme" | null
  >(null);
  const [i2vAmbience, setI2vAmbience] = useState<
    "none" | "street" | "crowd_protest"
  >("none");
  const [i2vSfx, setI2vSfx] = useState<
    import("@shared/i2v-sfx").I2VSfx
  >("none");
  const [i2vSfxMoment, setI2vSfxMoment] = useState<
    import("@shared/i2v-sfx").I2VSfxMoment
  >("middle");
  const [i2vSoundAutoOn, setI2vSoundAutoOn] = useState(true);
  const [i2vSoundManualOverride, setI2vSoundManualOverride] = useState(false);
  const [i2vSoundDetectLabel, setI2vSoundDetectLabel] = useState<string | null>(
    null,
  );
  const [i2vSoundDetectPending, setI2vSoundDetectPending] = useState(false);
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

  useEffect(() => {
    setV2vIntent((prev) => coerceV2VStudioIntent(prev));
  }, []);

  /** Prod : admin + compte test preview ; clients après I2V_SOUND_STUDIO=1. */
  const i2vSoundStudioEnabled = i2vAdminStudioEnabled;

  useEffect(() => {
    if (!i2vSoundStudioEnabled || !voiceEnabled || !i2vSoundAutoOn) return;
    const prompt = motionPrompt.trim();
    if (prompt.length < 5) {
      setI2vSoundDetectLabel(null);
      return;
    }

    setI2vSoundManualOverride(false);
    setI2vSoundDetectPending(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        const detection = await fetchI2vSoundDetect({ motionPrompt: prompt });
        setI2vSoundDetectPending(false);
        if (!detection) return;
        setI2vSoundDetectLabel(detection.label_fr || null);
        setI2vAmbience(detection.ambiance);
        setI2vSfx(
          detection.sfx
            ? (detection.sfx as import("@shared/i2v-sfx").I2VSfx)
            : "none",
        );
        setI2vSfxMoment(detection.sfx_moment);
        const vf = detection.suggested_voice_filter;
        if (vf === "homme" || vf === "femme") {
          setSuggestedVoiceFilter(vf);
        } else {
          setSuggestedVoiceFilter(null);
        }
      })();
    }, 650);

    return () => {
      window.clearTimeout(timer);
    };
  }, [motionPrompt, voiceEnabled, i2vSoundAutoOn, i2vSoundStudioEnabled]);

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
    const next = coerceV2VStudioIntent(intent);
    setV2vIntent(next);
    syncV2vUrl(next);
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
    (i2vAdminStudioEnabled
      ? Boolean(i2vVoiceId) &&
        voiceText.trim().length >= 5 &&
        voiceText.length <= voiceMaxChars
      : voiceText.trim().length >= 5 && voiceText.length <= voiceMaxChars);

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

  const v2vCreditsForResolution = (res: VideoUltraResolution) => {
    const transformFamily =
      v2vEngineFamilyFromProvider(v2vProviderForBilling) === "transform";
    if (subscriptionPreviewV3Active && transformFamily) {
      let cost = computePreviewV3V2VTransformCredits(res);
      if (preserveSourceVoice) cost += PREVIEW_V3_CREDIT_BURN.videoVoiceExtra;
      return cost;
    }
    return adminPreview
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
  };

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

  const buildVoicePayload = () => {
    if (!voiceEnabled) return { voice_enabled: false };
    if (!i2vAdminStudioEnabled) {
      return {
        voice_enabled: true,
        voice_mode: "catalog" as const,
        voice_text: voiceText.trim(),
        voice_consent: true,
      };
    }
    if (!i2vVoiceId) return { voice_enabled: false };
    const isClone = i2vVoiceId.startsWith("clone:");
    const cloneId = isClone ? i2vVoiceId.slice("clone:".length) : undefined;
    return {
      voice_enabled: true,
      voice_mode: isClone ? ("cloned" as const) : ("catalog" as const),
      voice_clone_id: cloneId,
      i2v_voice_id: i2vVoiceId,
      voice_text: voiceText.trim(),
      voice_consent: true,
    };
  };

  const creditBalance = plan?.credits ?? 0;
  const canAfford = creditBalance >= creditCost;

  const canGenerateI2V =
    Boolean(imagePreviewUrl) &&
    motionPrompt.trim().length >= 5 &&
    voiceReady &&
    canAfford;
  const hasVideoReady = Boolean(videoSource || localVideoFile);
  const videoImportBusy = isVideoReading && !videoPreview;
  const motionRefReady =
    v2vIntent !== "motion" || Boolean(refImageBase64 || refImagePreview);
  const sceneLuxeReady =
    v2vIntent !== "scene" ||
    swapPrompt.trim().length >= 5 ||
    sceneLuxePhotos.length > 0;
  const canGenerateV2V =
    hasVideoReady &&
    sceneLuxeReady &&
    (v2vIntent !== "scene" ? swapPrompt.trim().length >= 5 : true) &&
    canAfford &&
    !videoImportBusy &&
    motionRefReady;

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

  const clearSceneLuxePhotos = useCallback(() => {
    setSceneLuxeSlots((prev) => {
      for (const p of prev) {
        if (p) URL.revokeObjectURL(p.previewUrl);
      }
      return createEmptySceneLuxeSlots();
    });
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
    clearSceneLuxePhotos();
    if (videoFileRef.current) videoFileRef.current.value = "";
    if (refImageFileRef.current) refImageFileRef.current.value = "";
  }, [clearSceneLuxePhotos]);

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
        if (refImageIsCustomRef.current) return;
        const frameFile = await extractVideoFrameAsJpegFile(fileReadyForCloud);
        if (videoUploadGenRef.current !== uploadGen) return;
        if (refImageIsCustomRef.current) return;
        const frameCompressed = await compressImageForGeneration(frameFile);
        if (videoUploadGenRef.current !== uploadGen) return;
        if (refImageIsCustomRef.current) return;
        const frameB64 = await fileToBase64(frameCompressed);
        if (videoUploadGenRef.current !== uploadGen) return;
        if (refImageIsCustomRef.current) return;
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
          60_000,
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
            "Sans l'option voix (+5 crédits), le prompt ne peut pas demander de parole ou de son. Active « Faire parler la vidéo » ou décris seulement le mouvement visuel.",
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
        ...(voiceEnabled && i2vSoundStudioEnabled
          ? {
              i2v_sound_auto: i2vSoundAutoOn,
              i2v_sound_manual_override: i2vSoundManualOverride,
              ...(i2vAmbience !== "none" ? { i2v_ambience: i2vAmbience } : {}),
              ...(i2vSfx !== "none"
                ? { i2v_sfx: i2vSfx, i2v_sfx_moment: i2vSfxMoment }
                : {}),
            }
          : {}),
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
      refImageIsCustomRef.current = true;
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

  const ingestScenePhotoFile = async (file: File): Promise<SceneLuxePhotoRef> => {
    const compressed = await compressImageForGeneration(file);
    const base64 = await fileToBase64(compressed);
    return {
      id: newSceneLuxePhotoId(),
      previewUrl: URL.createObjectURL(compressed),
      base64,
      role: "",
    };
  };

  const runScenePhotoImport = (task: () => Promise<void>) => {
    scenePhotoAddChainRef.current = scenePhotoAddChainRef.current
      .then(task)
      .catch(() => {});
    return scenePhotoAddChainRef.current;
  };

  const handleScenePhotoAddAtSlot = (slotIndex: number, file: File) => {
    void runScenePhotoImport(async () => {
      if (slotIndex < 0 || slotIndex >= SCENE_LUXE_MAX_PHOTOS) return;
      if (sceneLuxeSlotsRef.current[slotIndex]) return;

      setScenePhotosBusy(true);
      try {
        const photo = await ingestScenePhotoFile(file);
        setSceneLuxeSlots((prev) => {
          if (prev[slotIndex]) {
            URL.revokeObjectURL(photo.previewUrl);
            return prev;
          }
          const next = [...prev] as SceneLuxePhotoSlots;
          next[slotIndex] = photo;
          return next;
        });
      } catch {
        toast({
          variant: "destructive",
          title: "Import impossible",
          description: "Choisis une image JPG ou PNG valide.",
        });
      } finally {
        setScenePhotosBusy(false);
      }
    });
  };

  const handleScenePhotosAddMany = (files: File[]) => {
    if (files.length === 0) return;
    void runScenePhotoImport(async () => {
      const emptyIndices: number[] = [];
      const slots = sceneLuxeSlotsRef.current;
      for (let i = 0; i < SCENE_LUXE_MAX_PHOTOS; i++) {
        if (!slots[i]) emptyIndices.push(i);
      }
      const batch = files.slice(0, emptyIndices.length);
      if (batch.length === 0) {
        toast({
          variant: "destructive",
          title: "Maximum 9 photos",
          description: "Supprime une photo pour en ajouter une autre.",
        });
        return;
      }
      if (files.length > batch.length) {
        toast({
          title: "Maximum 9 photos",
          description: `Seules ${batch.length} photo(s) ont été ajoutées.`,
        });
      }

      setScenePhotosBusy(true);
      try {
        const pairs: { index: number; photo: SceneLuxePhotoRef }[] = [];
        for (let j = 0; j < batch.length; j++) {
          pairs.push({
            index: emptyIndices[j]!,
            photo: await ingestScenePhotoFile(batch[j]!),
          });
        }
        setSceneLuxeSlots((prev) => {
          const next = [...prev] as SceneLuxePhotoSlots;
          for (const { index, photo } of pairs) {
            if (next[index]) URL.revokeObjectURL(photo.previewUrl);
            else next[index] = photo;
          }
          return next;
        });
      } catch {
        toast({
          variant: "destructive",
          title: "Import impossible",
          description: "Choisis des images JPG ou PNG valides.",
        });
      } finally {
        setScenePhotosBusy(false);
      }
    });
  };

  const handleScenePhotoRemove = useCallback((id: string) => {
    setSceneLuxeSlots((prev) => {
      const next = [...prev] as SceneLuxePhotoSlots;
      for (let i = 0; i < next.length; i++) {
        if (next[i]?.id === id) {
          URL.revokeObjectURL(next[i]!.previewUrl);
          next[i] = null;
          break;
        }
      }
      return next;
    });
  }, []);

  const handleScenePhotoRoleChange = useCallback((id: string, role: string) => {
    setSceneLuxeSlots((prev) => {
      const next = [...prev] as SceneLuxePhotoSlots;
      for (let i = 0; i < next.length; i++) {
        const p = next[i];
        if (p?.id === id) next[i] = { ...p, role };
      }
      return next;
    });
  }, []);

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
    let motionRefB64 = refImageBase64;
    if (v2vIntent === "motion" && !motionRefB64 && localVideoFile) {
      try {
        const frameFile = await extractVideoFrameAsJpegFile(localVideoFile);
        const frameCompressed = await compressImageForGeneration(frameFile);
        motionRefB64 = await fileToBase64(frameCompressed);
        setRefImageBase64(motionRefB64);
        setRefImageIsCustom(false);
      } catch {
        toast({
          variant: "destructive",
          title: "Photo requise",
          description:
            "Pour Mouvement, ajoute ta photo (+ Ta photo) ou réimporte la vidéo.",
        });
        return;
      }
    }
    if (v2vIntent === "scene" && sceneLuxePhotos.length > 0) {
      referenceImages = sceneLuxePhotos.map((p) => p.base64);
    } else if (v2vProvider === "kling_motion" && motionRefB64) {
      referenceImages = [motionRefB64];
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
        ...(v2vIntent === "scene" && sceneLuxePhotos.length
          ? {
              reference_photo_roles: sceneLuxePhotos.map((p) => p.role.trim()),
            }
          : {}),
        ...(v2vIntent === "motion" && referenceImages?.length
          ? {
              motion_reference_source: refImageIsCustomRef.current
                ? ("uploaded" as const)
                : ("auto_frame" as const),
            }
          : {}),
        ...(v2vIntent === "motion" ? motionStagingTogglePayload() : {}),
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
      i2vVoiceId={i2vVoiceId}
      onI2vVoiceId={setI2vVoiceId}
      suggestedVoiceFilter={suggestedVoiceFilter}
      voiceMaxChars={voiceMaxChars}
      voiceExtraCredit={adminBurn.videoVoiceExtra}
      i2vAmbience={i2vAmbience}
      onI2vAmbience={setI2vAmbience}
      i2vSfx={i2vSfx}
      onI2vSfx={setI2vSfx}
      i2vSfxMoment={i2vSfxMoment}
      onI2vSfxMoment={setI2vSfxMoment}
      onI2vSoundManualAdjust={() => {
        setI2vSoundAutoOn(false);
        setI2vSoundManualOverride(true);
      }}
      i2vSoundAutoOn={i2vSoundAutoOn}
      onI2vSoundAutoOn={(on) => {
        setI2vSoundAutoOn(on);
        if (on) {
          setI2vSoundManualOverride(false);
          return;
        }
        setI2vAmbience("none");
        setI2vSfx("none");
        setI2vSfxMoment("middle");
        setI2vSoundDetectLabel(null);
        setI2vSoundManualOverride(false);
      }}
      i2vSoundDetectLabel={i2vSoundDetectLabel}
      i2vSoundDetectPending={i2vSoundDetectPending}
      i2vSoundStudioEnabled={i2vSoundStudioEnabled}
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
      sceneLuxeSlots={sceneLuxeSlots}
      scenePhotosBusy={scenePhotosBusy}
      onScenePhotoAddAtSlot={handleScenePhotoAddAtSlot}
      onScenePhotosAddMany={handleScenePhotosAddMany}
      onScenePhotoRemove={handleScenePhotoRemove}
      onScenePhotoRoleChange={handleScenePhotoRoleChange}
      preserveSourceVoice={preserveSourceVoice}
      onPreserveSourceVoice={setPreserveSourceVoice}
      canGenerateV2V={canGenerateV2V}
      onGenerateV2V={handleGenerateV2V}
      v2vPending={isSubmitting || generateVideo.isPending}
      showMotionStagingToggles={showMotionStagingToggles}
      motionStagingPromptOn={motionStagingPromptOn}
      onMotionStagingPromptOn={(on) => {
        setMotionStagingPromptOn(on);
        setMotionStagingPromptIntelligenceOn(on);
      }}
      motionStagingFfmpegOn={motionStagingFfmpegOn}
      onMotionStagingFfmpegOn={(on) => {
        setMotionStagingFfmpegOn(on);
        setMotionStagingFfmpegPostprocessOn(on);
      }}
      motionStagingV2EraseOn={motionStagingV2EraseOn}
      onMotionStagingV2EraseOn={(on) => {
        setMotionStagingV2EraseOn(on);
        persistMotionStagingV2Erase(on);
      }}
      motionStagingV2EdgeOn={motionStagingV2EdgeOn}
      onMotionStagingV2EdgeOn={(on) => {
        setMotionStagingV2EdgeOn(on);
        persistMotionStagingV2Edge(on);
      }}
      motionStagingV2LightOn={motionStagingV2LightOn}
      onMotionStagingV2LightOn={(on) => {
        setMotionStagingV2LightOn(on);
        persistMotionStagingV2Light(on);
      }}
      motionStagingV2ShadowOn={motionStagingV2ShadowOn}
      onMotionStagingV2ShadowOn={(on) => {
        setMotionStagingV2ShadowOn(on);
        persistMotionStagingV2Shadow(on);
      }}
    />
  );
}

