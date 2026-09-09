import { useCallback, useEffect, useRef, useState } from "react";
import { Redirect, useLocation } from "wouter";
import {
  Camera,
  Car,
  Clapperboard,
  Film,
  Loader2,
  Upload,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVideoStudioGenerate } from "@/hooks/use-video-studio";
import { GenerationProgress } from "@/components/larp/GenerationProgress";
import { useToast } from "@/hooks/use-toast";
import { compressImageForGeneration } from "@/lib/compress-image";
import {
  computeVideoCreditCost,
  DEFAULT_IMAGE_TO_VIDEO_PROMPT,
  VIDEO_VEHICLE_PRESETS,
  type VideoAspectRatio,
  type VideoWorkflow,
} from "@/lib/video-studio-config";
import { consumeVideoStudioPrefill } from "@/lib/video-studio-prefill";
import { useAdminPreviewFeatures } from "@/lib/admin-preview-features";
import { writeStudioMode } from "@/lib/v2-experience";

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
    hint: "Importe ta photo, l'IA la fait bouger",
  },
  {
    id: "video_to_video",
    label: "Vidéo → Vidéo",
    emoji: "🚗",
    hint: "Importe ta vidéo, l'IA remplace l'objet",
  },
];

export default function VideoIA() {
  const [, setLocation] = useLocation();
  const adminPreview = useAdminPreviewFeatures();
  const { toast } = useToast();
  const generateVideo = useVideoStudioGenerate();

  const imageFileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);

  const [workflow, setWorkflow] = useState<VideoWorkflow>("image_to_video");

  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadBase64, setUploadBase64] = useState<string | null>(null);
  const [prefillImageUrl, setPrefillImageUrl] = useState<string | null>(null);
  const [prefillLarpId, setPrefillLarpId] = useState<string | null>(null);

  const [durationSec] = useState<5>(5);
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>("9:16");

  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoBase64, setVideoBase64] = useState<string | null>(null);
  const [swapPrompt, setSwapPrompt] = useState("");

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

  const creditCost = computeVideoCreditCost({
    workflow,
    durationSec,
    quality: "standard",
    voiceEnabled: false,
  });

  const canGenerateI2V = Boolean(imagePreviewUrl);
  const canGenerateV2V = Boolean(videoBase64) && swapPrompt.trim().length >= 5;

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
    if (file.size > 20 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Vidéo trop lourde",
        description: "Maximum 20 Mo pour l'upload.",
      });
      return;
    }
    try {
      const b64 = await fileToBase64(file);
      setVideoBase64(b64);
      setVideoPreview(URL.createObjectURL(file));
    } catch {
      toast({
        variant: "destructive",
        title: "Import impossible",
        description: "Impossible de lire cette vidéo.",
      });
    }
  };

  const handleGenerateI2V = async () => {
    if (isSubmitting || generateVideo.isPending || taskId) return;
    if (!canGenerateI2V) return;

    setIsSubmitting(true);
    try {
      const result = await generateVideo.mutateAsync({
        workflow: "image_to_video",
        motion_prompt: DEFAULT_IMAGE_TO_VIDEO_PROMPT,
        duration_sec: durationSec,
        aspect_ratio: aspectRatio,
        camera_movement: "slow_zoom",
        motion_intensity: "natural",
        style: "cinematic",
        quality: "standard",
        voice_enabled: false,
        subtitles_enabled: false,
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

  const handleGenerateV2V = async () => {
    if (isSubmitting || generateVideo.isPending || taskId) return;
    if (!canGenerateV2V || !videoBase64) return;

    setIsSubmitting(true);
    try {
      const result = await generateVideo.mutateAsync({
        workflow: "video_to_video",
        aspect_ratio: aspectRatio,
        videos: [videoBase64],
        vehicle_prompt: swapPrompt.trim(),
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
    <div className="mx-auto max-w-4xl px-4 pb-28 pt-4 md:pb-10 md:pt-8">
      <header className="mb-6 text-center">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--lx-gold)]/25 bg-white/80 px-3 py-1 text-xs font-medium text-[var(--lx-gold)]">
          <Clapperboard className="h-3.5 w-3.5" />
          Vidéo IA
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1a1408] md:text-3xl">
          Studio Vidéo IA
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          Deux modes : anime ta photo, ou remplace un objet dans ta vidéo.
          L&apos;IA gère le mouvement automatiquement.
        </p>
      </header>

      <div className="mb-6 grid gap-2 sm:grid-cols-2">
        {WORKFLOW_OPTIONS.map((option) => {
          const active = workflow === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setWorkflow(option.id)}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                active
                  ? "border-[var(--lx-gold)] bg-[var(--lx-gold)]/10"
                  : "border-[var(--lx-gold)]/20 bg-white/80 hover:border-[var(--lx-gold)]/40"
              }`}
            >
              <span className="text-xl" aria-hidden>
                {option.emoji}
              </span>
              <p className="mt-1 text-sm font-semibold">{option.label}</p>
              <p className="text-xs text-muted-foreground">{option.hint}</p>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-[var(--lx-gold)]/15 bg-white/90 p-4 shadow-sm md:p-6">
        {workflow === "image_to_video" ? (
          <div className="space-y-5">
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <Camera className="h-4 w-4 text-[var(--lx-gold)]" />
                1. Importe ta photo
              </h2>
              <p className="text-sm text-muted-foreground">
                Ta propre image (JPG/PNG). L&apos;IA la transforme en vidéo 5
                secondes — mouvement, expressions, tout est automatique.
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
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => imageFileRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Choisir une image
              </Button>
              {imagePreviewUrl && (
                <div className="mx-auto max-w-[200px] overflow-hidden rounded-xl ring-2 ring-[var(--lx-gold)]/30">
                  <img
                    src={imagePreviewUrl}
                    alt="Aperçu"
                    className="aspect-[9/16] w-full object-cover"
                  />
                </div>
              )}
            </section>

            <section>
              <label className="text-sm font-medium">
                Format
                <select
                  className="mt-1 block w-full rounded-lg border p-2 text-sm sm:max-w-xs"
                  value={aspectRatio}
                  onChange={(e) =>
                    setAspectRatio(e.target.value as VideoAspectRatio)
                  }
                >
                  <option value="9:16">9:16 vertical (TikTok/Reels)</option>
                  <option value="16:9">16:9 horizontal</option>
                </select>
              </label>
            </section>

            <Button
              className="w-full bg-[linear-gradient(135deg,#e8c547_0%,#c9a227_45%,#8b6914_100%)] text-[#1a1408]"
              disabled={!canGenerateI2V || isSubmitting || generateVideo.isPending}
              onClick={() => void handleGenerateI2V()}
            >
              {isSubmitting || generateVideo.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Génération…
                </>
              ) : (
                <>
                  <Film className="mr-2 h-4 w-4" />
                  Générer ma vidéo ({creditCost} crédits)
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <Video className="h-4 w-4 text-[var(--lx-gold)]" />
                1. Importe ta vidéo
              </h2>
              <p className="text-sm text-muted-foreground">
                Filme avec ton téléphone (ex. ta Clio garée). L&apos;IA garde ta
                caméra, le décor et les mouvements.
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
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => videoFileRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Choisir une vidéo
              </Button>
              {videoPreview && (
                <video
                  src={videoPreview}
                  className="mx-auto max-h-48 max-w-full rounded-xl"
                  controls
                  muted
                  playsInline
                />
              )}
            </section>

            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <Car className="h-4 w-4 text-[var(--lx-gold)]" />
                2. Dis à l&apos;IA quoi remplacer
              </h2>
              <textarea
                value={swapPrompt}
                onChange={(e) => setSwapPrompt(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Ex. : Remplace ma Clio par une Lamborghini Urus. Garde les mêmes mouvements de caméra."
                className="w-full rounded-xl border border-[var(--lx-gold)]/20 p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--lx-gold)]/25"
              />
              <div className="flex flex-wrap gap-2">
                {VIDEO_VEHICLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      setSwapPrompt(
                        `Remplace le véhicule dans la vidéo par ${preset.label}. Garde le décor, le sol, les reflets et les mouvements de caméra identiques.`,
                      )
                    }
                    className="rounded-full border border-[var(--lx-gold)]/25 px-3 py-1 text-xs font-medium hover:bg-[var(--lx-gold)]/10"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </section>

            <Button
              className="w-full bg-[linear-gradient(135deg,#e8c547_0%,#c9a227_45%,#8b6914_100%)] text-[#1a1408]"
              disabled={!canGenerateV2V || isSubmitting || generateVideo.isPending}
              onClick={() => void handleGenerateV2V()}
            >
              {isSubmitting || generateVideo.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Remplacement…
                </>
              ) : (
                <>
                  <Car className="mr-2 h-4 w-4" />
                  Remplacer le véhicule ({creditCost} crédits)
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Tes vidéos finies sont dans{" "}
        <button
          type="button"
          className="underline"
          onClick={() => setLocation("/historique")}
        >
          Historique → Mes vidéos
        </button>
      </p>
    </div>
  );
}
