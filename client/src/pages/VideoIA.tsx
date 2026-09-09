import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  Clapperboard,
  Film,
  ImagePlus,
  Loader2,
  Mic,
  Sparkles,
  Upload,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLarpHistory } from "@/hooks/use-larps";
import { useVideoStudioGenerate } from "@/hooks/use-video-studio";
import { GenerationProgress } from "@/components/larp/GenerationProgress";
import { VideoResultPlayer } from "@/components/larp/VideoResultPlayer";
import { useToast } from "@/hooks/use-toast";
import { compressImageForGeneration } from "@/lib/compress-image";
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
import { readClonedVoices } from "@/lib/cloned-voices-storage";
import {
  computeVideoCreditCost,
  maxVoiceChars,
  VIDEO_MOTION_PRESETS,
  VIDEO_STUDIO_STEPS,
  VIDEO_VOICE_SCRIPT_PRESETS,
  type SubtitlePosition,
  type SubtitleStyle,
  type VideoAspectRatio,
  type VideoCameraMovement,
  type VideoDuration,
  type VideoMotionIntensity,
  type VideoQuality,
  type VideoStyle,
} from "@/lib/video-studio-config";
import { consumeVideoStudioPrefill } from "@/lib/video-studio-prefill";
import { useStudioPath } from "@/hooks/use-studio-path";

type ImageSource = "luxeflexia" | "upload" | "none";

export default function VideoIA() {
  const [, setLocation] = useLocation();
  const studioPath = useStudioPath();
  const { toast } = useToast();
  const generateVideo = useVideoStudioGenerate();
  const { data: historyItems } = useLarpHistory();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [imageSource, setImageSource] = useState<ImageSource>("luxeflexia");
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedLarpId, setSelectedLarpId] = useState<string | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadBase64, setUploadBase64] = useState<string | null>(null);

  const [motionPrompt, setMotionPrompt] = useState("");
  const [durationSec, setDurationSec] = useState<VideoDuration>(5);
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>("9:16");
  const [cameraMovement, setCameraMovement] =
    useState<VideoCameraMovement>("slow_zoom");
  const [motionIntensity, setMotionIntensity] =
    useState<VideoMotionIntensity>("natural");
  const [style, setStyle] = useState<VideoStyle>("cinematic");
  const [quality, setQuality] = useState<VideoQuality>("standard");

  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceMode, setVoiceMode] = useState<"cloned" | "catalog" | "none">(
    "none",
  );
  const [voiceCloneId, setVoiceCloneId] = useState<string>("");
  const [voiceText, setVoiceText] = useState("");
  const [voiceConsent, setVoiceConsent] = useState(false);

  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [subtitleStyle, setSubtitleStyle] =
    useState<SubtitleStyle>("minimal_white");
  const [subtitlePosition, setSubtitlePosition] =
    useState<SubtitlePosition>("bottom");
  const [overlayText, setOverlayText] = useState("");

  const [taskId, setTaskId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generationEstimate, setGenerationEstimate] = useState<number | null>(
    null,
  );

  const clonedVoices = useMemo(() => readClonedVoices(), []);

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
          createdAt: item.createdAt,
          prompt: item.finalPrompt,
        }));
      });
  }, [historyItems]);

  useEffect(() => {
    const prefill = consumeVideoStudioPrefill();
    if (prefill) {
      setSelectedImageUrl(prefill.imageUrl);
      setSelectedLarpId(prefill.sourceLarpId ?? null);
      setImageSource("luxeflexia");
      setStep(1);
    }
  }, []);

  const creditCost = computeVideoCreditCost({
    durationSec,
    quality,
    voiceEnabled,
  });

  const voiceCharLimit = maxVoiceChars(durationSec);
  const voiceTooLong = voiceEnabled && voiceText.trim().length > voiceCharLimit;

  const previewUrl = uploadPreview || selectedImageUrl;

  const canProceedImage = Boolean(previewUrl);
  const canProceedMotion = motionPrompt.trim().length >= 10;
  const canProceedVoice =
    !voiceEnabled ||
    (voiceMode === "none") ||
    (voiceMode === "catalog" && voiceText.trim().length > 0 && !voiceTooLong) ||
    (voiceMode === "cloned" &&
      voiceCloneId &&
      voiceText.trim().length > 0 &&
      voiceConsent &&
      !voiceTooLong);

  const handleUpload = async (file: File | null) => {
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

  const handleGenerate = async () => {
    if (isSubmitting || generateVideo.isPending || taskId) return;
    if (!previewUrl) {
      toast({ variant: "destructive", title: "Choisis une image source." });
      return;
    }
    if (!canProceedMotion || !canProceedVoice) return;

    setIsSubmitting(true);
    try {
      const result = await generateVideo.mutateAsync({
        motion_prompt: motionPrompt.trim(),
        duration_sec: durationSec,
        aspect_ratio: aspectRatio,
        camera_movement: cameraMovement,
        motion_intensity: motionIntensity,
        style,
        quality,
        ...(uploadBase64
          ? { images: [uploadBase64] }
          : {
              image_url: selectedImageUrl || undefined,
              source_larp_id: selectedLarpId || undefined,
            }),
        voice_enabled: voiceEnabled,
        voice_mode: voiceEnabled ? voiceMode : "none",
        voice_clone_id:
          voiceEnabled && voiceMode === "cloned" ? voiceCloneId : undefined,
        voice_text: voiceEnabled ? voiceText.trim() : undefined,
        voice_consent: voiceEnabled ? voiceConsent : undefined,
        subtitles_enabled: subtitlesEnabled,
        subtitle_style: subtitleStyle,
        subtitle_position: subtitlePosition,
        overlay_text:
          !voiceEnabled && overlayText.trim() ? overlayText.trim() : undefined,
        source: "video_studio",
      });
      setTaskId(result.taskId);
      setGenerationEstimate(
        typeof result.estimatedSeconds === "number"
          ? result.estimatedSeconds
          : durationSec === 10
            ? 180
            : 120,
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Génération vidéo impossible";
      toast({ variant: "destructive", title: "Erreur", description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetStudio = useCallback(() => {
    setTaskId(null);
    setGenerationEstimate(null);
    setStep(0);
  }, []);

  if (taskId) {
    return (
      <div className="mx-auto min-h-[calc(100dvh-5rem)] max-w-5xl px-4 py-6">
        <GenerationProgress
          taskId={taskId}
          inputImageUrl={previewUrl || undefined}
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
          Studio Vidéo IA
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1a1408] md:text-3xl">
          Crée ta vidéo IA
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground md:text-base">
          Transforme une image en vidéo réaliste, ajoute un mouvement, une voix
          et des sous-titres.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
        {VIDEO_STUDIO_STEPS.map((label, idx) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(idx)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              step === idx
                ? "bg-[var(--lx-gold)] text-[#1a1408]"
                : "bg-white/70 text-muted-foreground ring-1 ring-[var(--lx-gold)]/15"
            }`}
          >
            {idx + 1}. {label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5 rounded-2xl border border-[var(--lx-gold)]/15 bg-white/85 p-4 shadow-sm backdrop-blur md:p-6">
          {step === 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Image source</h2>
              <div className="grid gap-2 sm:grid-cols-3">
                {(
                  [
                    ["luxeflexia", "Mes créations", Sparkles],
                    ["upload", "Importer", Upload],
                    ["none", "Créer d'abord", ImagePlus],
                  ] as const
                ).map(([id, label, Icon]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      if (id === "none") {
                        setLocation(studioPath);
                        return;
                      }
                      setImageSource(id);
                    }}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-sm transition-all ${
                      imageSource === id
                        ? "border-[var(--lx-gold)] bg-[var(--lx-gold)]/8"
                        : "border-border hover:border-[var(--lx-gold)]/40"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </button>
                ))}
              </div>

              {imageSource === "luxeflexia" && (
                <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
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
                      Aucune image générée pour l'instant. Crée une image d'abord.
                    </p>
                  )}
                </div>
              )}

              {imageSource === "upload" && (
                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void handleUpload(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileRef.current?.click()}
                  >
                    Choisir une image
                  </Button>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  disabled={!canProceedImage}
                  onClick={() => setStep(1)}
                >
                  Continuer
                </Button>
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Mouvement & prompt</h2>
              <label className="block text-sm font-medium">
                Que doit-il se passer dans la vidéo ?
              </label>
              <textarea
                value={motionPrompt}
                onChange={(e) => setMotionPrompt(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Exemple : La caméra avance lentement, il sourit puis regarde la ville derrière lui..."
                className="w-full rounded-xl border border-[var(--lx-gold)]/20 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--lx-gold)]/25"
              />
              <p className="text-xs text-muted-foreground">
                {motionPrompt.length}/2000 — Décris l'action, la caméra,
                l'ambiance et ce qui doit rester stable.
              </p>

              <div className="flex flex-wrap gap-2">
                {VIDEO_MOTION_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setMotionPrompt(preset.prompt)}
                    className="rounded-full border border-[var(--lx-gold)]/20 px-3 py-1 text-xs hover:bg-[var(--lx-gold)]/10"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  Durée
                  <select
                    className="mt-1 w-full rounded-lg border p-2 text-sm"
                    value={durationSec}
                    onChange={(e) =>
                      setDurationSec(Number(e.target.value) as VideoDuration)
                    }
                  >
                    <option value={5}>5 secondes</option>
                    <option value={10}>10 secondes</option>
                  </select>
                </label>
                <label className="text-sm">
                  Format
                  <select
                    className="mt-1 w-full rounded-lg border p-2 text-sm"
                    value={aspectRatio}
                    onChange={(e) =>
                      setAspectRatio(e.target.value as VideoAspectRatio)
                    }
                  >
                    <option value="9:16">9:16 (TikTok/Reels)</option>
                    <option value="16:9">16:9 (YouTube)</option>
                    <option value="1:1">1:1 (Carré)</option>
                  </select>
                </label>
                <label className="text-sm">
                  Mouvement caméra
                  <select
                    className="mt-1 w-full rounded-lg border p-2 text-sm"
                    value={cameraMovement}
                    onChange={(e) =>
                      setCameraMovement(e.target.value as VideoCameraMovement)
                    }
                  >
                    <option value="fixed">Fixe</option>
                    <option value="slow_zoom">Zoom lent</option>
                    <option value="dolly_in">Travelling avant</option>
                    <option value="truck">Travelling latéral</option>
                    <option value="light_pan">Rotation légère</option>
                  </select>
                </label>
                <label className="text-sm">
                  Intensité
                  <select
                    className="mt-1 w-full rounded-lg border p-2 text-sm"
                    value={motionIntensity}
                    onChange={(e) =>
                      setMotionIntensity(e.target.value as VideoMotionIntensity)
                    }
                  >
                    <option value="low">Faible</option>
                    <option value="natural">Naturelle</option>
                    <option value="dynamic">Dynamique</option>
                  </select>
                </label>
                <label className="text-sm">
                  Style
                  <select
                    className="mt-1 w-full rounded-lg border p-2 text-sm"
                    value={style}
                    onChange={(e) => setStyle(e.target.value as VideoStyle)}
                  >
                    <option value="realistic">Réaliste</option>
                    <option value="cinematic">Cinématique</option>
                    <option value="ugc">UGC smartphone</option>
                    <option value="luxury_ad">Publicité luxe</option>
                  </select>
                </label>
                <label className="text-sm">
                  Qualité
                  <select
                    className="mt-1 w-full rounded-lg border p-2 text-sm"
                    value={quality}
                    onChange={(e) => setQuality(e.target.value as VideoQuality)}
                  >
                    <option value="standard">Standard</option>
                    <option value="high">Haute qualité</option>
                  </select>
                </label>
              </div>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(0)}>
                  Retour
                </Button>
                <Button
                  disabled={!canProceedMotion}
                  onClick={() => setStep(2)}
                >
                  Continuer
                </Button>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Voix (optionnel)</h2>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={voiceEnabled}
                  onChange={(e) => setVoiceEnabled(e.target.checked)}
                />
                Ajouter une voix à ma vidéo
              </label>

              {voiceEnabled && (
                <>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {(
                      [
                        ["cloned", "Ma voix clonée"],
                        ["catalog", "Voix IA"],
                        ["none", "Aucune voix"],
                      ] as const
                    ).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setVoiceMode(mode)}
                        className={`rounded-lg border p-3 text-sm ${
                          voiceMode === mode
                            ? "border-[var(--lx-gold)] bg-[var(--lx-gold)]/8"
                            : ""
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {voiceMode === "cloned" && (
                    <select
                      className="w-full rounded-lg border p-2 text-sm"
                      value={voiceCloneId}
                      onChange={(e) => setVoiceCloneId(e.target.value)}
                    >
                      <option value="">Choisir une voix clonée</option>
                      {clonedVoices.map((v) => (
                        <option key={v.id} value={v.serverCloneId || v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {voiceMode !== "none" && (
                    <>
                      <textarea
                        value={voiceText}
                        onChange={(e) => setVoiceText(e.target.value)}
                        rows={3}
                        placeholder="Ce que la voix doit dire…"
                        className="w-full rounded-xl border p-3 text-sm"
                      />
                      <p
                        className={`text-xs ${voiceTooLong ? "text-destructive" : "text-muted-foreground"}`}
                      >
                        {voiceText.length}/{voiceCharLimit} caractères max pour{" "}
                        {durationSec}s
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {VIDEO_VOICE_SCRIPT_PRESETS.map((script) => (
                          <button
                            key={script}
                            type="button"
                            onClick={() => setVoiceText(script)}
                            className="rounded-full border px-2 py-1 text-[11px]"
                          >
                            {script.slice(0, 42)}…
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {voiceMode === "cloned" && (
                    <label className="flex items-start gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={voiceConsent}
                        onChange={(e) => setVoiceConsent(e.target.checked)}
                      />
                      Je confirme avoir le droit d'utiliser cette voix et
                      consens à son utilisation dans cette vidéo IA.
                    </label>
                  )}
                </>
              )}

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  Retour
                </Button>
                <Button
                  disabled={!canProceedVoice}
                  onClick={() => setStep(3)}
                >
                  Continuer
                </Button>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Sous-titres</h2>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={subtitlesEnabled}
                  onChange={(e) => setSubtitlesEnabled(e.target.checked)}
                  disabled={!voiceEnabled || voiceMode === "none"}
                />
                Ajouter des sous-titres (depuis le texte vocal)
              </label>

              {subtitlesEnabled && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    className="rounded-lg border p-2 text-sm"
                    value={subtitleStyle}
                    onChange={(e) =>
                      setSubtitleStyle(e.target.value as SubtitleStyle)
                    }
                  >
                    <option value="minimal_white">Minimal blanc</option>
                    <option value="luxury_gold">Luxe doré</option>
                    <option value="tiktok_dynamic">TikTok dynamique</option>
                    <option value="black_on_white">Noir sur fond blanc</option>
                  </select>
                  <select
                    className="rounded-lg border p-2 text-sm"
                    value={subtitlePosition}
                    onChange={(e) =>
                      setSubtitlePosition(e.target.value as SubtitlePosition)
                    }
                  >
                    <option value="bottom">Bas</option>
                    <option value="center">Centre</option>
                    <option value="top">Haut</option>
                  </select>
                </div>
              )}

              {!voiceEnabled && (
                <>
                  <label className="text-sm font-medium">
                    Texte à l'écran (optionnel)
                  </label>
                  <input
                    value={overlayText}
                    onChange={(e) => setOverlayText(e.target.value)}
                    maxLength={120}
                    placeholder="Hook POV court…"
                    className="w-full rounded-lg border p-2 text-sm"
                  />
                </>
              )}

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  Retour
                </Button>
                <Button onClick={() => setStep(4)}>Continuer</Button>
              </div>
            </section>
          )}

          {step === 4 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Récapitulatif</h2>
              <div className="rounded-xl border border-[var(--lx-gold)]/20 bg-[var(--lx-gold)]/5 p-4 text-sm">
                <p>
                  Cette vidéo de <strong>{durationSec}s</strong> en format{" "}
                  <strong>{aspectRatio}</strong> coûte{" "}
                  <strong>{creditCost} crédits</strong>.
                </p>
                <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                  <li>Qualité : {quality === "high" ? "Haute" : "Standard"}</li>
                  <li>Voix : {voiceEnabled && voiceMode !== "none" ? "Oui" : "Non"}</li>
                  <li>Sous-titres : {subtitlesEnabled ? "Oui" : "Non"}</li>
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">
                  Vidéo générée ou modifiée par IA.
                </p>
              </div>
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(3)}>
                  Retour
                </Button>
                <Button
                  className="bg-[linear-gradient(135deg,#e8c547_0%,#c9a227_45%,#8b6914_100%)] text-[#1a1408]"
                  disabled={isSubmitting || generateVideo.isPending}
                  onClick={() => void handleGenerate()}
                >
                  {isSubmitting || generateVideo.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Génération en cours…
                    </>
                  ) : (
                    <>
                      <Film className="mr-2 h-4 w-4" />
                      Générer la vidéo
                    </>
                  )}
                </Button>
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <div className="sticky top-4 rounded-2xl border border-[var(--lx-gold)]/15 bg-white/90 p-3 shadow-sm">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Aperçu
            </p>
            <div
              className={`relative mx-auto overflow-hidden rounded-xl bg-black ${
                aspectRatio === "16:9"
                  ? "aspect-video w-full"
                  : aspectRatio === "1:1"
                    ? "aspect-square w-full max-w-[280px]"
                    : "aspect-[9/16] w-full max-w-[280px]"
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
              {subtitlesEnabled && voiceText && (
                <div
                  className={`absolute inset-x-2 rounded px-2 py-1 text-center text-xs font-semibold ${
                    subtitleStyle === "luxury_gold"
                      ? "text-[#e8c547]"
                      : subtitleStyle === "black_on_white"
                        ? "bg-white text-black"
                        : "text-white drop-shadow"
                  } ${
                    subtitlePosition === "top"
                      ? "top-3"
                      : subtitlePosition === "center"
                        ? "top-1/2 -translate-y-1/2"
                        : "bottom-3"
                  }`}
                >
                  {voiceText.slice(0, 80)}
                </div>
              )}
              {!voiceEnabled && overlayText && (
                <div className="absolute inset-x-2 bottom-3 rounded bg-black/50 px-2 py-1 text-center text-xs text-white">
                  {overlayText}
                </div>
              )}
            </div>
            {voiceEnabled && voiceMode !== "none" && (
              <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Mic className="h-3 w-3" />
                Lip-sync activé si visage détecté
              </p>
            )}
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 border-t border-[var(--lx-gold)]/15 bg-white/95 p-3 backdrop-blur md:hidden">
        {step === 4 ? (
          <Button
            className="w-full"
            disabled={isSubmitting || generateVideo.isPending}
            onClick={() => void handleGenerate()}
          >
            {isSubmitting ? "Génération…" : `Générer (${creditCost} crédits)`}
          </Button>
        ) : (
          <Button
            className="w-full"
            variant="outline"
            onClick={() => setStep((s) => Math.min(s + 1, 4))}
          >
            Étape suivante
          </Button>
        )}
      </div>
    </div>
  );
}
