import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Link, Redirect } from "wouter";
import { Crown, Film, Loader2, Sparkles, Upload, Video, Wand2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentPlan } from "@/hooks/use-billing";
import { useVideoUltraGenerate } from "@/hooks/use-video-ultra";
import { GenerationProgress } from "@/components/larp/GenerationProgress";
import {
  VideoGenerationLoader,
  VideoGenerationLoaderBackdrop,
} from "@/components/larp/VideoGenerationLoader";
import { releaseGenerationLoaderTheme } from "@/lib/generation-loader-theme";
import { defaultVideoLoaderEstimate } from "@/lib/video-generation-timing";
import "@/components/larp/generation-loader.css";
import { useToast } from "@/hooks/use-toast";
import { VideoCreditSummary } from "@/components/video/VideoCreditSummary";
import {
  computeVideoUltraCreditCost,
  VIDEO_ULTRA_DURATION_OPTIONS,
  VIDEO_ULTRA_RESOLUTION_OPTIONS,
  type VideoUltraDurationSec,
  type VideoUltraResolution,
} from "@shared/video-ultra-pricing";
import {
  formatVideoDurationLabel,
  readVideoDurationSec,
  validateVideoDurationForUpload,
} from "@/lib/video-duration";
import {
  prepareVideoFileForStudioWithTimeout,
  type StudioVideoUpload,
} from "@/lib/upload-video";
import { isVideoMediaFile } from "@/lib/media-file-detect";
import { useV2Access } from "@/hooks/use-v2-access";
import { releaseGenerationSubmitLock } from "@/lib/generation-submit-lock";
import { withNormalizedVideoFile } from "@/lib/media-file-detect";
import {
  VIDEO_V2V_MAX_DURATION_SEC,
  VIDEO_V2V_MIN_DURATION_SEC,
} from "@/lib/video-studio-config";
import "./video-ia-page.css";

function resolutionLabel(res: VideoUltraResolution): string {
  if (res === "4k") return "4K";
  return res;
}

export default function VideoUltra() {
  const { v2Enabled, isLoading: v2Loading } = useV2Access();
  const { user, profile } = useAuth();
  const { data: plan } = useCurrentPlan({ enabled: Boolean(user) });
  const { toast } = useToast();
  const generateUltra = useVideoUltraGenerate();

  const videoFileRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoSource, setVideoSource] = useState<StudioVideoUpload | null>(null);
  const [localVideoFile, setLocalVideoFile] = useState<File | null>(null);
  const [videoDurationSec, setVideoDurationSec] = useState<number | null>(null);
  const [isVideoReading, setIsVideoReading] = useState(false);
  const [isVideoCloudSync, setIsVideoCloudSync] = useState(false);
  const videoUploadGenRef = useRef(0);

  const [prompt, setPrompt] = useState("");
  const [durationSec, setDurationSec] = useState<VideoUltraDurationSec>(5);
  const [resolution, setResolution] = useState<VideoUltraResolution>("720p");

  const [taskId, setTaskId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generationEstimate, setGenerationEstimate] = useState<number | null>(
    120,
  );

  const creditCost = computeVideoUltraCreditCost({ durationSec, resolution });
  const creditsBalance = plan?.credits ?? profile?.credits ?? 0;
  const hasEnoughCredits = creditsBalance >= creditCost;

  useEffect(() => {
    document.documentElement.classList.add("luxeflexia-video-page");
    setIsSubmitting(false);
    releaseGenerationSubmitLock();
    generateUltra.reset();
    return () => {
      document.documentElement.classList.remove("luxeflexia-video-page");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = videoPreviewRef.current;
    if (!el || !videoPreview) return;
    void el.play().catch(() => {});
  }, [videoPreview]);

  const resetStudio = useCallback(() => {
    setTaskId(null);
    setIsSubmitting(false);
    releaseGenerationSubmitLock();
    generateUltra.reset();
  }, [generateUltra]);

  const handleVideoUpload = (file: File | null) => {
    if (!file) return;
    if (!isVideoMediaFile(file)) {
      toast({
        variant: "destructive",
        title: "Format non supporté",
        description: "Importe un clip MP4 ou MOV (3–8 secondes).",
      });
      return;
    }

    const uploadGen = videoUploadGenRef.current + 1;
    videoUploadGenRef.current = uploadGen;
    setIsVideoReading(true);
    setVideoSource(null);
    setLocalVideoFile(null);

    void (async () => {
      try {
        const normalized = await withNormalizedVideoFile(file);
        const objectUrl = URL.createObjectURL(normalized);
        setVideoPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return objectUrl;
        });
        setLocalVideoFile(normalized);

        const dur = await readVideoDurationSec(normalized);
        const check = validateVideoDurationForUpload(dur);
        if (!check.ok) {
          toast({
            variant: "destructive",
            title: "Durée invalide",
            description: check.message,
          });
          setVideoPreview(null);
          setLocalVideoFile(null);
          return;
        }
        setVideoDurationSec(dur);
      } catch {
        toast({
          variant: "destructive",
          title: "Lecture impossible",
          description: "Réessaie avec un autre fichier vidéo.",
        });
      } finally {
        if (videoUploadGenRef.current === uploadGen) {
          setIsVideoReading(false);
        }
      }
    })();
  };

  const canGenerate =
    Boolean(localVideoFile || videoSource) &&
    prompt.trim().length >= 10 &&
    hasEnoughCredits &&
    !isVideoReading;

  const handleGenerate = async () => {
    if (isSubmitting || generateUltra.isPending || taskId || !canGenerate) return;

    let source = videoSource;
    if (!source && localVideoFile) {
      setIsVideoCloudSync(true);
      try {
        source = await prepareVideoFileForStudioWithTimeout(localVideoFile, 45_000);
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

    releaseGenerationLoaderTheme();
    flushSync(() => {
      setGenerationEstimate(120);
      setIsSubmitting(true);
    });

    try {
      const result = await generateUltra.mutateAsync({
        prompt: prompt.trim(),
        duration_sec: durationSec,
        resolution,
        ...(source.mode === "url"
          ? { video_url: source.videoUrl }
          : { videos: [source.dataUrl] }),
        source_video_duration_sec: videoDurationSec ?? undefined,
        source: "video_ultra",
      });
      setTaskId(result.taskId);
      if (result.estimatedSeconds) {
        setGenerationEstimate(result.estimatedSeconds);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Transformation impossible";
      toast({ variant: "destructive", title: "Erreur", description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (v2Loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!v2Enabled) {
    return <Redirect to="/create" />;
  }

  const loaderVideoUrl = videoPreview || undefined;

  if (isSubmitting && !taskId) {
    return (
      <>
        <VideoGenerationLoaderBackdrop zIndex={99} />
        <VideoGenerationLoader
          taskId="video-ultra-submit"
          status="connecting"
          workflow="video_to_video"
          estimatedSeconds={
            generationEstimate ??
            defaultVideoLoaderEstimate({
              workflow: "video_to_video",
              sourceVideoDurationSec: videoDurationSec,
            })
          }
          inputVideoUrl={loaderVideoUrl}
          aspectRatio="16:9"
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
            inputVideoUrl={loaderVideoUrl}
            onReset={resetStudio}
            resultType="video"
            videoWorkflow="video_to_video"
            aspectRatio="16:9"
            initialEstimatedSeconds={generationEstimate ?? undefined}
            sourceVideoDurationSec={videoDurationSec}
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
          <Crown className="h-3.5 w-3.5" aria-hidden />
          Studio premium
        </p>
        <h1 className="via-hero__title">Transformation Pro</h1>
        <p className="via-hero__sub">
          Importe ta vidéo, décris le changement (décor, voiture, luxe…). L&apos;IA
          transforme la scène en gardant ta silhouette, tes mouvements et ta voix
          d&apos;origine.
        </p>
        <div className="via-capabilities">
          <span className="via-capability">Vidéo source → clip transformé</span>
          <span className="via-capability">3–8 s · 720p · 1080p · 4K</span>
          <span className="via-capability">Débit à la réussite</span>
        </div>
        <p className="mt-4 text-sm text-[var(--lx-muted)]">
          <Link href="/video-ia" className="underline underline-offset-2">
            ← Retour au studio Vidéo IA (Image→Vidéo / V2V classique)
          </Link>
        </p>
      </header>

      <VideoCreditSummary creditCost={creditCost} />

      {!hasEnoughCredits && (
        <p className="via-step-desc text-amber-600 dark:text-amber-400">
          Il te manque {creditCost - creditsBalance} jetons pour cette configuration.
        </p>
      )}

      <p className="via-step-pill">
        <Video className="h-3.5 w-3.5" />
        Étape 1 — Vidéo source
      </p>
      <p className="via-step-desc">
        Clip {VIDEO_V2V_MIN_DURATION_SEC}–{VIDEO_V2V_MAX_DURATION_SEC} secondes (MP4
        recommandé). La personne et l&apos;audio de référence sont conservés.
      </p>

      <input
        ref={videoFileRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => handleVideoUpload(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        className={`via-upload-zone ${videoPreview ? "has-file" : ""}`}
        onClick={() => videoFileRef.current?.click()}
        disabled={isVideoReading || isVideoCloudSync}
      >
        <span className="via-upload-zone__icon">
          {isVideoReading || isVideoCloudSync ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
        </span>
        <span className="via-upload-zone__text">
          {videoPreview ? "Changer la vidéo" : "Choisir une vidéo"}
        </span>
        <span className="via-upload-zone__meta">
          {videoDurationSec != null
            ? formatVideoDurationLabel(videoDurationSec)
            : "MP4 · MOV · max 100 Mo"}
        </span>
      </button>

      {videoPreview && (
        <div className="via-preview-frame is-landscape">
          <video
            ref={videoPreviewRef}
            src={videoPreview}
            controls
            playsInline
            muted
            className="h-full w-full object-contain"
          />
        </div>
      )}

      <div className="via-option-block via-option-block--prominent">
        <p className="via-option-block__label">Durée générée</p>
        <div
          className="via-orient-toggle via-orient-toggle--wide"
          role="group"
          aria-label="Durée"
        >
          {VIDEO_ULTRA_DURATION_OPTIONS.map((sec) => (
            <button
              key={sec}
              type="button"
              className={`via-orient-toggle__btn ${durationSec === sec ? "is-active" : ""}`}
              onClick={() => setDurationSec(sec)}
            >
              {sec} s
            </button>
          ))}
        </div>
      </div>

      <div className="via-option-block via-option-block--prominent">
        <p className="via-option-block__label">Qualité</p>
        <div
          className="via-orient-toggle via-orient-toggle--wide"
          role="group"
          aria-label="Qualité"
        >
          {VIDEO_ULTRA_RESOLUTION_OPTIONS.map((res) => (
            <button
              key={res}
              type="button"
              className={`via-orient-toggle__btn ${resolution === res ? "is-active" : ""}`}
              onClick={() => setResolution(res)}
            >
              {resolutionLabel(res)}
              <span className="via-orient-toggle__hint">
                {computeVideoUltraCreditCost({ durationSec, resolution: res })} cr
              </span>
            </button>
          ))}
        </div>
      </div>

      <p className="via-step-pill" style={{ marginTop: "1.25rem" }}>
        <Sparkles className="h-3.5 w-3.5" />
        Étape 2 — Prompt
      </p>
      <p className="via-step-desc">
        Décris la transformation souhaitée — le studio ancre automatiquement ta
        vidéo importée pour garder tes mouvements.
      </p>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={4}
        maxLength={3000}
        placeholder="Ex. : Remplacer la voiture par une Lamborghini noire, décor Dubai la nuit, reflets néon premium…"
        className="via-prompt-field"
      />

      <button
        type="button"
        className="via-cta"
        disabled={!canGenerate || isSubmitting || generateUltra.isPending}
        onClick={() => void handleGenerate()}
      >
        {isSubmitting || generateUltra.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Envoi…
          </>
        ) : (
          <>
            <Wand2 className="h-4 w-4" aria-hidden />
            Lancer Transformation Pro · {creditCost} cr
          </>
        )}
      </button>

      <p className="via-step-desc mt-3 text-center text-xs opacity-80">
        <Film className="mr-1 inline h-3 w-3" aria-hidden />
        Les jetons ne sont débités qu&apos;une fois la vidéo prête.
      </p>
    </div>
  );
}
