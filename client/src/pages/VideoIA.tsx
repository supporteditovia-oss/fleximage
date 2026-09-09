import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Redirect, useLocation } from "wouter";
import {
  Camera,
  Car,
  Clapperboard,
  Film,
  Loader2,
  Sparkles,
  Upload,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLarpHistory } from "@/hooks/use-larps";
import { useVideoStudioGenerate } from "@/hooks/use-video-studio";
import { GenerationProgress } from "@/components/larp/GenerationProgress";
import { useToast } from "@/hooks/use-toast";
import { compressImageForGeneration } from "@/lib/compress-image";
import {
  computeVideoCreditCost,
  VIDEO_MOTION_PRESETS,
  VIDEO_VEHICLE_PRESETS,
  type VideoAspectRatio,
  type VideoWorkflow,
} from "@/lib/video-studio-config";
import { consumeVideoStudioPrefill } from "@/lib/video-studio-prefill";
import { useStudioPath } from "@/hooks/use-studio-path";
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

type ImageSource = "luxeflexia" | "upload";

const WORKFLOW_OPTIONS: {
  id: VideoWorkflow;
  label: string;
  emoji: string;
  description: string;
}[] = [
  {
    id: "image_to_video",
    label: "Animer une photo",
    emoji: "📸",
    description: "Image vers Vidéo",
  },
  {
    id: "video_to_video",
    label: "Remplacer dans une vidéo",
    emoji: "🚗",
    description: "Vidéo vers Vidéo",
  },
];

export default function VideoIA() {
  const [, setLocation] = useLocation();
  const studioPath = useStudioPath();
  const adminPreview = useAdminPreviewFeatures();
  const { toast } = useToast();
  const generateVideo = useVideoStudioGenerate();
  const { data: historyItems } = useLarpHistory();

  const imageFileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);

  const [workflow, setWorkflow] = useState<VideoWorkflow>("image_to_video");
  const [imageSource, setImageSource] = useState<ImageSource>("luxeflexia");
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedLarpId, setSelectedLarpId] = useState<string | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadBase64, setUploadBase64] = useState<string | null>(null);

  const [motionPrompt, setMotionPrompt] = useState("");
  const [durationSec] = useState<5>(5);
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>("9:16");

  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoBase64, setVideoBase64] = useState<string | null>(null);
  const [vehiclePreset, setVehiclePreset] = useState<string>("lamborghini_urus");
  const [vehiclePrompt, setVehiclePrompt] = useState("");

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

  const imageItems = useMemo(() => {
    return (historyItems ?? [])
      .filter(
        (item) => item.generationType === "image" && item.status === "success",
      )
      .flatMap((item) => {
        const urls = item.outputAssets.length
          ? item.outputAssets
          : item.watermarkedAssets;
        return urls.map((url: string) => ({
          url,
          larpId: item.id,
        }));
      });
  }, [historyItems]);

  useEffect(() => {
    const prefill = consumeVideoStudioPrefill();
    if (prefill) {
      setWorkflow("image_to_video");
      setSelectedImageUrl(prefill.imageUrl);
      setSelectedLarpId(prefill.sourceLarpId ?? null);
      setImageSource("luxeflexia");
    }
  }, []);

  const previewUrl = uploadPreview || selectedImageUrl;

  const creditCost = computeVideoCreditCost({
    workflow,
    durationSec,
    quality: "standard",
    voiceEnabled: false,
  });

  const canGenerateI2V = Boolean(previewUrl) && motionPrompt.trim().length >= 10;
  const canGenerateV2V =
    Boolean(videoBase64) &&
    (vehiclePrompt.trim().length >= 5 || Boolean(vehiclePreset));

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;
    try {
      const compressed = await compressImageForGeneration(file);
      const b64 = await fileToBase64(compressed);
      setUploadBase64(b64);
      setUploadPreview(URL.createObjectURL(compressed));
      setSelectedImageUrl(null);
      setSelectedLarpId(null);
      setImageSource("upload");
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
        motion_prompt: motionPrompt.trim(),
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
              image_url: selectedImageUrl || undefined,
              source_larp_id: selectedLarpId || undefined,
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
        vehicle_preset: vehiclePrompt.trim() ? undefined : vehiclePreset,
        vehicle_prompt: vehiclePrompt.trim() || undefined,
        source: "video_studio",
      });
      setTaskId(result.taskId);
      setGenerationEstimate(result.estimatedSeconds ?? 240);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Remplacement véhicule impossible";
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
          inputImageUrl={previewUrl || videoPreview || undefined}
          onReset={resetStudio}
          resultType="video"
          initialEstimatedSeconds={generationEstimate ?? undefined}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-4 md:pb-10 md:pt-8">
      <header className="mb-6 text-center md:mb-8">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--lx-gold)]/25 bg-white/80 px-3 py-1 text-xs font-medium text-[var(--lx-gold)]">
          <Clapperboard className="h-3.5 w-3.5" />
          Vidéo IA
          <span className="rounded bg-[var(--lx-gold)]/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
            Admin preview
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1a1408] md:text-3xl">
          Studio Vidéo IA
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground md:text-base">
          Anime une photo ou remplace un véhicule dans ta vidéo smartphone.
        </p>
      </header>

      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
        {WORKFLOW_OPTIONS.map((option) => {
          const active = workflow === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setWorkflow(option.id)}
              className={`flex flex-1 flex-col items-center rounded-2xl border px-4 py-4 text-center transition sm:max-w-xs ${
                active
                  ? "border-[var(--lx-gold)] bg-[var(--lx-gold)]/10 shadow-sm"
                  : "border-[var(--lx-gold)]/20 bg-white/80 hover:border-[var(--lx-gold)]/40"
              }`}
            >
              <span className="text-2xl" aria-hidden>
                {option.emoji}
              </span>
              <span className="mt-1 text-sm font-semibold text-[#1a1408]">
                {option.label}
              </span>
              <span className="text-xs text-muted-foreground">
                ({option.description})
              </span>
            </button>
          );
        })}
      </div>

      {workflow === "image_to_video" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5 rounded-2xl border border-[var(--lx-gold)]/15 bg-white/85 p-4 shadow-sm backdrop-blur md:p-6">
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Camera className="h-5 w-5 text-[var(--lx-gold)]" />
                Image source
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ["luxeflexia", "Mes créations LuxeFlexIA", Sparkles],
                    ["upload", "Importer une image", Upload],
                  ] as const
                ).map(([id, label, Icon]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setImageSource(id)}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-sm transition-all ${
                      imageSource === id
                        ? "border-[var(--lx-gold)] bg-[var(--lx-gold)]/8"
                        : "border-border hover:border-[var(--lx-gold)]/40"
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {label}
                  </button>
                ))}
              </div>

              {imageSource === "luxeflexia" && (
                <div className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                  {imageItems.map((item) => (
                    <button
                      key={`${item.larpId}-${item.url}`}
                      type="button"
                      onClick={() => {
                        setSelectedImageUrl(item.url);
                        setSelectedLarpId(item.larpId);
                        setUploadPreview(null);
                        setUploadBase64(null);
                      }}
                      className={`relative aspect-[9/16] overflow-hidden rounded-lg ring-2 ${
                        selectedImageUrl === item.url
                          ? "ring-[var(--lx-gold)]"
                          : "ring-transparent"
                      }`}
                    >
                      <img
                        src={item.url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                  {imageItems.length === 0 && (
                    <p className="col-span-full text-sm text-muted-foreground">
                      Aucune image générée.{" "}
                      <button
                        type="button"
                        className="underline"
                        onClick={() => setLocation(studioPath)}
                      >
                        Crée une image d'abord
                      </button>
                    </p>
                  )}
                </div>
              )}

              {imageSource === "upload" && (
                <div>
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
                    onClick={() => imageFileRef.current?.click()}
                  >
                    Choisir une image
                  </Button>
                </div>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Prompt de mouvement</h2>
              <textarea
                value={motionPrompt}
                onChange={(e) => setMotionPrompt(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder='Ex. : "Il marche lentement, regarde la caméra et sourit."'
                className="w-full rounded-xl border border-[var(--lx-gold)]/20 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--lx-gold)]/25"
              />
              <div className="flex flex-wrap gap-2">
                {VIDEO_MOTION_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setMotionPrompt(preset.prompt)}
                    className="rounded-full border border-[var(--lx-gold)]/25 px-3 py-1 text-xs font-medium hover:bg-[var(--lx-gold)]/10"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Durée
                <select
                  className="mt-1 w-full rounded-lg border p-2 text-sm"
                  value={durationSec}
                  disabled
                >
                  <option value={5}>5 secondes</option>
                </select>
              </label>
              <label className="text-sm font-medium">
                Format
                <select
                  className="mt-1 w-full rounded-lg border p-2 text-sm"
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
              className="w-full bg-[linear-gradient(135deg,#e8c547_0%,#c9a227_45%,#8b6914_100%)] text-[#1a1408] sm:w-auto"
              disabled={!canGenerateI2V || isSubmitting || generateVideo.isPending}
              onClick={() => void handleGenerateI2V()}
            >
              {isSubmitting || generateVideo.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Génération en cours…
                </>
              ) : (
                <>
                  <Film className="mr-2 h-4 w-4" />
                  Générer ma vidéo ({creditCost} crédits)
                </>
              )}
            </Button>
          </div>

          <aside className="rounded-2xl border border-[var(--lx-gold)]/15 bg-white/90 p-3 shadow-sm">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Aperçu
            </p>
            <div
              className={`relative mx-auto overflow-hidden rounded-xl bg-black ${
                aspectRatio === "16:9"
                  ? "aspect-video w-full"
                  : "aspect-[9/16] w-full max-w-[240px]"
              }`}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Aperçu source"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Video className="h-10 w-10 opacity-40" />
                </div>
              )}
            </div>
          </aside>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5 rounded-2xl border border-[var(--lx-gold)]/15 bg-white/85 p-4 shadow-sm backdrop-blur md:p-6">
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Video className="h-5 w-5 text-[var(--lx-gold)]" />
                Vidéo source
              </h2>
              <p className="text-sm text-muted-foreground">
                Importe une vidéo filmée au smartphone (ex. : ta voiture garée).
                Le décor, le sol, les reflets et les mouvements de caméra seront
                conservés.
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
                onClick={() => videoFileRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Importer une vidéo
              </Button>
            </section>

            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Car className="h-5 w-5 text-[var(--lx-gold)]" />
                Véhicule de remplacement
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {VIDEO_VEHICLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setVehiclePreset(preset.id);
                      setVehiclePrompt("");
                    }}
                    className={`rounded-xl border p-3 text-left text-sm transition ${
                      vehiclePreset === preset.id && !vehiclePrompt.trim()
                        ? "border-[var(--lx-gold)] bg-[var(--lx-gold)]/8"
                        : "border-border hover:border-[var(--lx-gold)]/40"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <label className="block text-sm font-medium">
                Ou prompt véhicule personnalisé
                <input
                  value={vehiclePrompt}
                  onChange={(e) => setVehiclePrompt(e.target.value)}
                  maxLength={500}
                  placeholder="Ex. : Rolls-Royce Cullinan noir, finitions chrome…"
                  className="mt-1 w-full rounded-lg border p-2 text-sm"
                />
              </label>
            </section>

            <section>
              <label className="text-sm font-medium">
                Format de sortie
                <select
                  className="mt-1 w-full rounded-lg border p-2 text-sm sm:max-w-xs"
                  value={aspectRatio}
                  onChange={(e) =>
                    setAspectRatio(e.target.value as VideoAspectRatio)
                  }
                >
                  <option value="9:16">9:16 vertical</option>
                  <option value="16:9">16:9 horizontal</option>
                </select>
              </label>
            </section>

            <Button
              className="w-full bg-[linear-gradient(135deg,#e8c547_0%,#c9a227_45%,#8b6914_100%)] text-[#1a1408] sm:w-auto"
              disabled={!canGenerateV2V || isSubmitting || generateVideo.isPending}
              onClick={() => void handleGenerateV2V()}
            >
              {isSubmitting || generateVideo.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Remplacement en cours…
                </>
              ) : (
                <>
                  <Car className="mr-2 h-4 w-4" />
                  Remplacer le véhicule ({creditCost} crédits)
                </>
              )}
            </Button>
          </div>

          <aside className="rounded-2xl border border-[var(--lx-gold)]/15 bg-white/90 p-3 shadow-sm">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Aperçu vidéo
            </p>
            <div className="relative aspect-[9/16] w-full max-w-[240px] overflow-hidden rounded-xl bg-black">
              {videoPreview ? (
                <video
                  src={videoPreview}
                  className="h-full w-full object-cover"
                  controls
                  muted
                  playsInline
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Video className="h-10 w-10 opacity-40" />
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Retrouve toutes tes vidéos dans{" "}
        <button
          type="button"
          className="font-medium underline"
          onClick={() => setLocation("/historique")}
        >
          Mes vidéos
        </button>{" "}
        (historique).
      </p>
    </div>
  );
}
