import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  useGenerateMarketing,
  useMarketingStatus,
  useUploadMarketingImage,
} from "@/hooks/use-marketing-studio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { createCanvasSafeImageUrl } from "@/lib/canvas-image";
import {
  exportMarketingLoaderVideo,
  marketingLoaderTimelineMs,
  MARKETING_LOADER_BLUR_START_MS,
  MARKETING_LOADER_IMAGE_APPEAR_MS,
  MARKETING_LOADER_PREPARING_MS,
} from "@/components/admin/MarketingLoaderVideo";
import {
  KeyboardWritingPreview,
  clampWritingSpeed,
  DEFAULT_WRITING_SPEED_MULTIPLIER,
  MIN_WRITING_SPEED_MULTIPLIER,
  MAX_WRITING_SPEED_MULTIPLIER,
  exportKeyboardWritingVideo,
} from "@/components/admin/KeyboardWritingVideo";
import {
  HookVideoPreview,
  clampHookDuration,
  DEFAULT_HOOK_DURATION_SECONDS,
  MIN_HOOK_DURATION_SECONDS,
  MAX_HOOK_DURATION_SECONDS,
  exportHookVideo,
} from "@/components/admin/HookVideo";
import { exportFullMarketingVideo } from "@/components/admin/FullMarketingVideo";
import {
  ImagePlus,
  Loader2,
  Maximize2,
  Play,
  ShieldAlert,
  X,
} from "lucide-react";

type ImageType = "avant" | "apres";

type OutputSlot = {
  taskId: string | null;
  url: string | null;
  isGenerating: boolean;
  type: ImageType;
};

type SimulatedMarketingVideo = {
  sourceUrl: string | null;
  startedAt: number | null;
};

type WritingVideo = {
  startedAt: number | null;
};

type HookVideo = {
  startedAt: number | null;
};

type StudioFullscreenPreview = "loader" | "writing" | "hook" | null;

const EMPTY_SLOT: OutputSlot = {
  taskId: null,
  url: null,
  isGenerating: false,
  type: "apres",
};

type StudioVideo = {
  id: string;
  label: string;
  refUrl: string | null;
  promptA: string;
  promptB: string;
  b1: OutputSlot;
  c1: OutputSlot;
  simulatedVideo: SimulatedMarketingVideo;
  loaderDurationSeconds: number;
  loaderSpeedMultiplier: number;
  writingPrompt: string;
  writingSpeedMultiplier: number;
  writingVideo: WritingVideo;
  hookDurationSeconds: number;
  hookVideo: HookVideo;
  lastCompletedAt: number | null;
  lastSeenAt: number;
  updatedAt: number;
};

type StudioState = {
  activeVideoId: string;
  videos: StudioVideo[];
};

const MAX_STUDIO_VIDEOS = 5;
const STUDIO_CACHE_KEY = "larpking:admin-studio:v1";
const DEFAULT_LOADER_DURATION_SECONDS = 8;
const MIN_LOADER_DURATION_SECONDS = 1;
const MAX_LOADER_DURATION_SECONDS = 120;
const DEFAULT_LOADER_SPEED_MULTIPLIER = 3;
const MIN_LOADER_SPEED_MULTIPLIER = 0.25;
const MAX_LOADER_SPEED_MULTIPLIER = 10;

function clampLoaderDuration(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : DEFAULT_LOADER_DURATION_SECONDS;

  if (!Number.isFinite(parsed)) return DEFAULT_LOADER_DURATION_SECONDS;
  return Math.min(
    MAX_LOADER_DURATION_SECONDS,
    Math.max(MIN_LOADER_DURATION_SECONDS, Math.round(parsed)),
  );
}

function clampLoaderSpeed(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : DEFAULT_LOADER_SPEED_MULTIPLIER;

  if (!Number.isFinite(parsed)) return DEFAULT_LOADER_SPEED_MULTIPLIER;
  return Math.min(
    MAX_LOADER_SPEED_MULTIPLIER,
    Math.max(MIN_LOADER_SPEED_MULTIPLIER, Math.round(parsed * 100) / 100),
  );
}

function oppositeImageType(type: ImageType): ImageType {
  return type === "avant" ? "apres" : "avant";
}

function createStudioVideo(index: number): StudioVideo {
  const now = Date.now();
  return {
    id: `video-${index}`,
    label: `Vidéo ${index}`,
    refUrl: null,
    promptA: "",
    promptB: "",
    b1: { ...EMPTY_SLOT, type: "apres" },
    c1: { ...EMPTY_SLOT, type: "avant" },
    simulatedVideo: {
      sourceUrl: null,
      startedAt: null,
    },
    loaderDurationSeconds: DEFAULT_LOADER_DURATION_SECONDS,
    loaderSpeedMultiplier: DEFAULT_LOADER_SPEED_MULTIPLIER,
    writingPrompt: "",
    writingSpeedMultiplier: DEFAULT_WRITING_SPEED_MULTIPLIER,
    writingVideo: { startedAt: null },
    hookDurationSeconds: DEFAULT_HOOK_DURATION_SECONDS,
    hookVideo: { startedAt: null },
    lastCompletedAt: null,
    lastSeenAt: now,
    updatedAt: now,
  };
}

function sanitizeSlot(slot: unknown, fallbackType: ImageType): OutputSlot {
  const source = slot && typeof slot === "object" ? slot as Partial<OutputSlot> : {};
  const type = source.type === "avant" || source.type === "apres"
    ? source.type
    : fallbackType;

  return {
    taskId: typeof source.taskId === "string" ? source.taskId : null,
    url: typeof source.url === "string" ? source.url : null,
    isGenerating: Boolean(source.isGenerating && source.taskId),
    type,
  };
}

function sanitizeVideo(input: unknown, index: number): StudioVideo | null {
  if (!input || typeof input !== "object") return null;
  const source = input as Partial<StudioVideo>;
  const b1 = sanitizeSlot(source.b1, "apres");
  const c1 = sanitizeSlot(source.c1, oppositeImageType(b1.type));
  const simulatedVideo =
    source.simulatedVideo && typeof source.simulatedVideo === "object"
      ? source.simulatedVideo as Partial<SimulatedMarketingVideo>
      : {};

  return {
    id: typeof source.id === "string" ? source.id : `${Date.now()}-${index}`,
    label: typeof source.label === "string" ? source.label : `Vidéo ${index + 1}`,
    refUrl: typeof source.refUrl === "string" ? source.refUrl : null,
    promptA: typeof source.promptA === "string" ? source.promptA : "",
    promptB: typeof source.promptB === "string" ? source.promptB : "",
    b1,
    c1: { ...c1, type: oppositeImageType(b1.type) },
    simulatedVideo: {
      sourceUrl:
        typeof simulatedVideo.sourceUrl === "string"
          ? simulatedVideo.sourceUrl
          : null,
      startedAt:
        typeof simulatedVideo.startedAt === "number"
          ? simulatedVideo.startedAt
          : null,
    },
    loaderDurationSeconds: clampLoaderDuration(source.loaderDurationSeconds),
    loaderSpeedMultiplier: clampLoaderSpeed(source.loaderSpeedMultiplier),
    writingPrompt:
      typeof source.writingPrompt === "string" ? source.writingPrompt : "",
    writingSpeedMultiplier: clampWritingSpeed(source.writingSpeedMultiplier),
    writingVideo: {
      startedAt:
        source.writingVideo && typeof source.writingVideo === "object" &&
        typeof (source.writingVideo as Partial<WritingVideo>).startedAt === "number"
          ? (source.writingVideo as Partial<WritingVideo>).startedAt ?? null
          : null,
    },
    hookDurationSeconds: clampHookDuration(source.hookDurationSeconds),
    hookVideo: {
      startedAt:
        source.hookVideo && typeof source.hookVideo === "object" &&
        typeof (source.hookVideo as Partial<HookVideo>).startedAt === "number"
          ? (source.hookVideo as Partial<HookVideo>).startedAt ?? null
          : null,
    },
    lastCompletedAt:
      typeof source.lastCompletedAt === "number" ? source.lastCompletedAt : null,
    lastSeenAt: typeof source.lastSeenAt === "number" ? source.lastSeenAt : Date.now(),
    updatedAt: typeof source.updatedAt === "number" ? source.updatedAt : Date.now(),
  };
}

function loadStudioState(): StudioState {
  const fallbackVideos = Array.from(
    { length: MAX_STUDIO_VIDEOS },
    (_, index) => createStudioVideo(index + 1),
  );
  const fallback = {
    activeVideoId: fallbackVideos[0].id,
    videos: fallbackVideos,
  };

  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(STUDIO_CACHE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw) as Partial<StudioState>;
    const storedVideos = Array.isArray(parsed.videos)
      ? parsed.videos
        .slice(0, MAX_STUDIO_VIDEOS)
        .map((video, index) => sanitizeVideo(video, index))
        .filter((video): video is StudioVideo => Boolean(video))
      : [];

    const videos = Array.from({ length: MAX_STUDIO_VIDEOS }, (_, index) => {
      const existing = storedVideos[index];
      return existing
        ? { ...existing, label: `Vidéo ${index + 1}` }
        : createStudioVideo(index + 1);
    });

    const activeVideoId =
      typeof parsed.activeVideoId === "string" &&
      videos.some((video) => video.id === parsed.activeVideoId)
        ? parsed.activeVideoId
        : videos[0].id;

    return { activeVideoId, videos };
  } catch {
    return fallback;
  }
}

function getVideoTabState(video: StudioVideo) {
  const isLoading = video.b1.isGenerating || video.c1.isGenerating;
  const hasUnseenResult =
    typeof video.lastCompletedAt === "number" &&
    video.lastCompletedAt > video.lastSeenAt;
  const hasMedia = Boolean(video.refUrl || video.b1.url || video.c1.url);
  const isDirty = Boolean(
    hasMedia ||
      video.promptA.trim() ||
      video.promptB.trim() ||
      video.b1.taskId ||
      video.c1.taskId ||
      video.simulatedVideo.sourceUrl ||
      video.writingPrompt.trim() ||
      video.hookDurationSeconds !== DEFAULT_HOOK_DURATION_SECONDS,
  );

  if (isLoading) return "loading";
  if (hasUnseenResult) return "unseen";
  if (isDirty) return "dirty";
  return "empty";
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function imageExtensionFromMimeType(mimeType: string) {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("gif")) return "gif";
  return "jpg";
}

function slugifyFilename(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function getDownloadableImageFile({
  imageUrl,
  filenameBase,
}: {
  imageUrl: string;
  filenameBase: string;
}) {
  const objectUrlsToRevoke: string[] = [];
  const safeUrl = await createCanvasSafeImageUrl(imageUrl);
  if (safeUrl.startsWith("blob:")) objectUrlsToRevoke.push(safeUrl);

  try {
    const response = await fetch(safeUrl);
    if (!response.ok) {
      throw new Error("Image inaccessible");
    }
    const blob = await response.blob();
    const type = blob.type || "image/jpeg";
    const extension = imageExtensionFromMimeType(type);
    const filename = `${filenameBase}.${extension}`;
    return {
      file: new File([blob], filename, { type }),
      objectUrlsToRevoke,
    };
  } catch (error) {
    objectUrlsToRevoke.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    throw error;
  }
}

function AspectImageSlot({
  label,
  imageUrl,
  isLoading,
  emptyLabel,
  className,
}: {
  label: string;
  imageUrl: string | null;
  isLoading: boolean;
  emptyLabel: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative aspect-[9/16] w-full overflow-hidden rounded-lg border border-border bg-muted/30",
        className,
      )}
    >
      {isLoading ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/50">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Génération en cours…</p>
        </div>
      ) : imageUrl ? (
        <img
          src={imageUrl}
          alt={label}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      )}
    </div>
  );
}

function PromptPanel({
  prompt,
  onPromptChange,
  onGenerate,
  isGenerating,
  disabled,
  placeholder,
}: {
  prompt: string;
  onPromptChange: (value: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  disabled: boolean;
  placeholder: string;
}) {
  return (
    <div className="relative rounded-lg border border-border bg-card p-3 min-h-[120px]">
      <Textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[88px] resize-none border-0 bg-transparent p-0 pr-24 shadow-none focus-visible:ring-0"
      />
      <Button
        type="button"
        size="sm"
        className="absolute bottom-3 right-3"
        onClick={onGenerate}
        disabled={disabled || isGenerating}
      >
        {isGenerating ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        Générer
      </Button>
    </div>
  );
}

function TypeToggleButton({
  type,
  onToggle,
}: {
  type: ImageType;
  onToggle: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onToggle}
      className={cn(
        "h-auto min-h-[72px] w-[72px] shrink-0 flex-col gap-1 rounded-lg border-2 px-2 py-3 text-xs font-semibold",
        type === "apres"
          ? "border-sky-400 bg-sky-50 text-sky-700 hover:bg-sky-100"
          : "border-red-400 bg-red-50 text-red-700 hover:bg-red-100",
      )}
    >
      <span className="text-[10px] uppercase tracking-wide opacity-70">
        Type
      </span>
      <span className="capitalize">{type}</span>
    </Button>
  );
}

function SimulatedMarketingVideoPreview({
  sourceUrl,
  startedAt,
  maxSeconds,
  speedMultiplier,
  onEnded = () => {},
  onPlay = () => {},
  className,
}: {
  sourceUrl: string | null;
  startedAt: number | null;
  maxSeconds: number;
  speedMultiplier: number;
  onEnded?: () => void;
  onPlay?: () => void;
  className?: string;
}) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const hasEndedRef = useRef(false);

  useEffect(() => {
    if (!sourceUrl || !startedAt) {
      setElapsedMs(0);
      hasEndedRef.current = false;
      return;
    }

    const updateElapsed = () => {
      const rawMs = Math.max(0, Date.now() - startedAt) * speedMultiplier;
      const timelineTotalMs = marketingLoaderTimelineMs(maxSeconds);
      setElapsedMs(Math.min(timelineTotalMs, rawMs));

      if (rawMs >= timelineTotalMs && !hasEndedRef.current) {
        hasEndedRef.current = true;
        onEnded();
      }
    };

    updateElapsed();
    const interval = window.setInterval(updateElapsed, 200);
    return () => window.clearInterval(interval);
  }, [sourceUrl, startedAt, maxSeconds, speedMultiplier, onEnded]);

  const isPlaying = Boolean(sourceUrl && startedAt);
  const imageVisible = !isPlaying || elapsedMs >= MARKETING_LOADER_IMAGE_APPEAR_MS;
  const isBlurring = isPlaying && elapsedMs >= MARKETING_LOADER_BLUR_START_MS;
  const showLoader = isPlaying;
  const showTimer = elapsedMs >= MARKETING_LOADER_PREPARING_MS;
  const displayedElapsed = showTimer
    ? Math.min(
      maxSeconds,
      Math.max(
        0,
        Math.floor((elapsedMs - MARKETING_LOADER_PREPARING_MS) / 1000),
      ),
    )
    : 0;

  return (
    <div
      className={cn(
        "relative aspect-[9/16] w-full overflow-hidden rounded-lg border border-border bg-background bg-grid",
        className,
      )}
    >
      {sourceUrl ? (
        <>
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={cn(
                "relative aspect-[9/16] h-[78%] w-auto max-w-[92%] overflow-hidden rounded-lg shadow-xl transition-opacity duration-600",
                imageVisible ? "opacity-100" : "opacity-0",
              )}
            >
              <img
                src={sourceUrl}
                alt="Simulation vidéo marketing"
                className={cn(
                  "absolute inset-0 h-full w-full object-cover transition-[filter,transform] duration-[1800ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
                  isBlurring
                    ? "scale-[1.08] blur-[24px] brightness-[0.7]"
                    : "scale-100 blur-0 brightness-100",
                )}
              />
            </div>
          </div>
          {showLoader ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center animate-in fade-in zoom-in-95 duration-700">
              <img
                src="/assets/larpking.png"
                alt="LarpKing"
                className="h-24 w-auto object-contain drop-shadow-[0_0_40px_hsl(var(--primary)/0.5)] loader-logo-pulse"
              />
              <Loader2 className="h-6 w-6 animate-spin text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]" />
              {showTimer ? (
                <span className="text-lg font-semibold tabular-nums text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]">
                  {displayedElapsed}s
                </span>
              ) : null}
            </div>
          ) : null}
          {!isPlaying ? (
            <button
              type="button"
              onClick={onPlay}
              className="absolute inset-0 flex items-center justify-center bg-black/10 text-white transition-colors hover:bg-black/20"
              aria-label="Relancer le loader"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/45 shadow-xl backdrop-blur-sm">
                <Play className="ml-0.5 h-6 w-6 fill-current" />
              </span>
            </button>
          ) : null}
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-muted-foreground">
          La simulation vidéo apparaîtra ici
        </div>
      )}
    </div>
  );
}

function FullscreenPreviewButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="secondary"
      onClick={onClick}
      disabled={disabled}
      className="absolute right-2 top-2 z-10 h-9 w-9 rounded-full border border-white/15 bg-black/65 text-white shadow-lg backdrop-blur-md hover:bg-black/80 disabled:pointer-events-none disabled:opacity-0"
      aria-label="Afficher en grand écran"
      title="Grand écran"
    >
      <Maximize2 className="h-4 w-4" />
    </Button>
  );
}

function StudioVideoStatusPoller({
  video,
  isActive,
  onComplete,
  onFail,
}: {
  video: StudioVideo;
  isActive: boolean;
  onComplete: (params: {
    videoId: string;
    stage: "b1" | "c1";
    resultUrl: string;
    isActive: boolean;
  }) => void;
  onFail: (params: {
    videoId: string;
    stage: "b1" | "c1";
    failMessage: string | null;
  }) => void;
}) {
  const b1Status = useMarketingStatus(video.b1.isGenerating ? video.b1.taskId : null);
  const c1Status = useMarketingStatus(video.c1.isGenerating ? video.c1.taskId : null);
  const handledB1Ref = useRef<string | null>(null);
  const handledC1Ref = useRef<string | null>(null);

  useEffect(() => {
    if (!video.b1.taskId || !b1Status.data) return;
    const key = `${video.b1.taskId}:${b1Status.data.status}`;
    if (handledB1Ref.current === key) return;

    if (b1Status.data.status === "success" && b1Status.data.resultUrl) {
      handledB1Ref.current = key;
      onComplete({
        videoId: video.id,
        stage: "b1",
        resultUrl: b1Status.data.resultUrl,
        isActive,
      });
    }

    if (b1Status.data.status === "fail") {
      handledB1Ref.current = key;
      onFail({
        videoId: video.id,
        stage: "b1",
        failMessage: b1Status.data.failMessage,
      });
    }
  }, [b1Status.data, isActive, onComplete, onFail, video.b1.taskId, video.id]);

  useEffect(() => {
    if (!video.c1.taskId || !c1Status.data) return;
    const key = `${video.c1.taskId}:${c1Status.data.status}`;
    if (handledC1Ref.current === key) return;

    if (c1Status.data.status === "success" && c1Status.data.resultUrl) {
      handledC1Ref.current = key;
      onComplete({
        videoId: video.id,
        stage: "c1",
        resultUrl: c1Status.data.resultUrl,
        isActive,
      });
    }

    if (c1Status.data.status === "fail") {
      handledC1Ref.current = key;
      onFail({
        videoId: video.id,
        stage: "c1",
        failMessage: c1Status.data.failMessage,
      });
    }
  }, [c1Status.data, isActive, onComplete, onFail, video.c1.taskId, video.id]);

  return null;
}

const STUDIO_TOAST_DURATION_MS = 1500;

export default function AdminStudio() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const notify = useCallback(
    (props: Parameters<typeof toast>[0]) =>
      toast({ ...props, duration: STUDIO_TOAST_DURATION_MS }),
    [toast],
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadingVideoId, setUploadingVideoId] = useState<string | null>(null);
  const [isExportingLoaderVideo, setIsExportingLoaderVideo] = useState(false);
  const [isExportingWritingVideo, setIsExportingWritingVideo] = useState(false);
  const [isExportingHookVideo, setIsExportingHookVideo] = useState(false);
  const [isExportingFullVideo, setIsExportingFullVideo] = useState(false);
  const [downloadingImageSlot, setDownloadingImageSlot] = useState<"b1" | "c1" | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fullscreenPreview, setFullscreenPreview] =
    useState<StudioFullscreenPreview>(null);
  const [studioState, setStudioState] = useState<StudioState>(loadStudioState);

  const uploadImage = useUploadMarketingImage();
  const generateMarketing = useGenerateMarketing();
  const activeVideo =
    studioState.videos.find((video) => video.id === studioState.activeVideoId) ??
    studioState.videos[0];
  const { refUrl, promptA, promptB, b1, c1 } = activeVideo;
  const isUploadingActiveRef = uploadingVideoId === activeVideo.id;
  const beforeImageUrl =
    b1.type === "avant" ? b1.url : c1.type === "avant" ? c1.url : null;
  const afterImageUrl =
    b1.type === "apres" ? b1.url : c1.type === "apres" ? c1.url : null;

  const closeFullscreenPreview = useCallback(() => {
    setFullscreenPreview(null);
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }
  }, []);

  const openFullscreenPreview = useCallback((preview: NonNullable<StudioFullscreenPreview>) => {
    setFullscreenPreview(preview);
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      void document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!fullscreenPreview) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeFullscreenPreview();
    };
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) setFullscreenPreview(null);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [closeFullscreenPreview, fullscreenPreview]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STUDIO_CACHE_KEY, JSON.stringify(studioState));
    } catch (error) {
      console.warn("Failed to persist studio cache", error);
    }
  }, [studioState]);

  const updateVideoById = useCallback(
    (videoId: string, updater: (video: StudioVideo) => StudioVideo) => {
      setStudioState((prev) => ({
        ...prev,
        videos: prev.videos.map((video) =>
          video.id === videoId
            ? { ...updater(video), updatedAt: Date.now() }
            : video,
        ),
      }));
    },
    [],
  );

  const updateActiveVideo = useCallback(
    (updater: (video: StudioVideo) => StudioVideo) => {
      updateVideoById(activeVideo.id, updater);
    },
    [activeVideo.id, updateVideoById],
  );

  const handleReferenceFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        notify({
          title: "Format non supporté",
          description: "Veuillez sélectionner une image.",
          variant: "destructive",
        });
        return;
      }

      const targetVideoId = activeVideo.id;
      setUploadingVideoId(targetVideoId);
      try {
        const dataUrl = await fileToDataUrl(file);
        const { url } = await uploadImage.mutateAsync(dataUrl);
        updateVideoById(targetVideoId, (video) => ({ ...video, refUrl: url }));
      } catch (error: any) {
        updateVideoById(targetVideoId, (video) => ({ ...video, refUrl: null }));
        notify({
          title: "Erreur d'upload",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setUploadingVideoId((current) =>
          current === targetVideoId ? null : current,
        );
      }
    },
    [activeVideo.id, toast, updateVideoById, uploadImage],
  );

  const handleGenerateA = async () => {
    if (!refUrl || !promptA.trim()) return;
    const targetVideoId = activeVideo.id;

    updateVideoById(targetVideoId, (video) => ({
      ...video,
      b1: {
        ...video.b1,
        taskId: null,
        url: null,
        isGenerating: true,
      },
    }));

    try {
      const { taskId } = await generateMarketing.mutateAsync({
        prompt: promptA.trim(),
        referenceImageUrl: refUrl,
      });
      updateVideoById(targetVideoId, (video) => ({
        ...video,
        b1: { ...video.b1, taskId },
      }));
    } catch (error: any) {
      updateVideoById(targetVideoId, (video) => ({
        ...video,
        b1: { ...video.b1, isGenerating: false },
      }));
      notify({
        title: "Erreur de génération",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleGenerateB = async () => {
    if (!b1.url || !promptB.trim()) return;
    const targetVideoId = activeVideo.id;

    updateVideoById(targetVideoId, (video) => ({
      ...video,
      c1: {
        ...video.c1,
        taskId: null,
        url: null,
        isGenerating: true,
      },
    }));

    try {
      const { taskId } = await generateMarketing.mutateAsync({
        prompt: promptB.trim(),
        referenceImageUrl: b1.url,
      });
      updateVideoById(targetVideoId, (video) => ({
        ...video,
        c1: { ...video.c1, taskId },
      }));
    } catch (error: any) {
      updateVideoById(targetVideoId, (video) => ({
        ...video,
        c1: { ...video.c1, isGenerating: false },
      }));
      notify({
        title: "Erreur de génération",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleB1Type = () => {
    updateActiveVideo((video) => {
      const newType = oppositeImageType(video.b1.type);
      return {
        ...video,
        b1: { ...video.b1, type: newType },
        c1: { ...video.c1, type: oppositeImageType(newType) },
      };
    });
  };

  const toggleC1Type = () => {
    updateActiveVideo((video) => {
      const newType = oppositeImageType(video.c1.type);
      return {
        ...video,
        b1: { ...video.b1, type: oppositeImageType(newType) },
        c1: { ...video.c1, type: newType },
      };
    });
  };

  const handleDownloadImage = async (slotKey: "b1" | "c1") => {
    const slot = slotKey === "b1" ? b1 : c1;
    if (!slot.url) return;

    const filenameBase = slugifyFilename(
      `larpking-${slot.type}-${activeVideo.label}`,
    );
    setDownloadingImageSlot(slotKey);

    try {
      const { file, objectUrlsToRevoke } = await getDownloadableImageFile({
        imageUrl: slot.url,
        filenameBase,
      });

      try {
        const url = URL.createObjectURL(file);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        notify({
          title: "Image téléchargée",
          description: file.name,
        });
      } finally {
        objectUrlsToRevoke.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
      }
    } catch (error: any) {
      notify({
        title: "Téléchargement impossible",
        description: error?.message || "L’image n’a pas pu être téléchargée.",
        variant: "destructive",
      });
    } finally {
      setDownloadingImageSlot(null);
    }
  };

  const resetActiveVideo = () => {
    const index = studioState.videos.findIndex(
      (video) => video.id === activeVideo.id,
    );
    const resetVideo = createStudioVideo(index + 1);
    updateVideoById(activeVideo.id, () => ({
      ...resetVideo,
      id: activeVideo.id,
    }));
    if (uploadingVideoId === activeVideo.id) {
      setUploadingVideoId(null);
    }
  };

  const handleCreateSimulatedVideo = () => {
    if (!beforeImageUrl) {
      notify({
        title: "Image avant manquante",
        description: "Définissez une image comme avant avant de créer la vidéo.",
        variant: "destructive",
      });
      return;
    }

    updateActiveVideo((video) => ({
      ...video,
      simulatedVideo: {
        sourceUrl: beforeImageUrl,
        startedAt: Date.now(),
      },
    }));
  };

  const handleSimulatedVideoEnded = useCallback(() => {
    updateActiveVideo((video) => ({
      ...video,
      simulatedVideo: {
        ...video.simulatedVideo,
        startedAt: null,
      },
    }));
  }, [updateActiveVideo]);

  const handleReplaySimulatedVideo = useCallback(() => {
    updateActiveVideo((video) => {
      if (!video.simulatedVideo.sourceUrl) return video;

      return {
        ...video,
        simulatedVideo: {
          ...video.simulatedVideo,
          startedAt: Date.now(),
        },
      };
    });
  }, [updateActiveVideo]);

  const handleDownloadLoaderVideo = async () => {
    const sourceUrl = activeVideo.simulatedVideo.sourceUrl;
    if (!sourceUrl) return;

    setIsExportingLoaderVideo(true);
    try {
      await exportMarketingLoaderVideo({
        sourceUrl,
        durationSeconds: activeVideo.loaderDurationSeconds,
        speedMultiplier: activeVideo.loaderSpeedMultiplier,
        filename: `larpking-loader-${activeVideo.label.toLowerCase().replace(/\s+/g, "-")}.mp4`,
      });
      notify({
        title: "Vidéo téléchargée",
        description: "Le loader a été généré côté navigateur.",
      });
    } catch (error: any) {
      notify({
        title: "Export impossible",
        description:
          error?.message ||
          "Le navigateur n'a pas pu générer la vidéo. Vérifiez que l'image autorise l'export canvas.",
        variant: "destructive",
      });
    } finally {
      setIsExportingLoaderVideo(false);
    }
  };

  const handleCreateWriting = () => {
    if (!activeVideo.writingPrompt.trim()) {
      notify({
        title: "Prompt manquant",
        description: "Saisissez le texte qui sera écrit dans la vidéo.",
        variant: "destructive",
      });
      return;
    }

    updateActiveVideo((video) => ({
      ...video,
      writingVideo: { startedAt: Date.now() },
    }));
  };

  const handleWritingEnded = useCallback(() => {
    updateActiveVideo((video) => ({
      ...video,
      writingVideo: { startedAt: null },
    }));
  }, [updateActiveVideo]);

  const handleReplayWriting = useCallback(() => {
    updateActiveVideo((video) => {
      if (!video.writingPrompt.trim()) return video;
      return { ...video, writingVideo: { startedAt: Date.now() } };
    });
  }, [updateActiveVideo]);

  const handleDownloadWritingVideo = async () => {
    if (!activeVideo.writingPrompt.trim()) return;

    setIsExportingWritingVideo(true);
    try {
      await exportKeyboardWritingVideo({
        prompt: activeVideo.writingPrompt,
        beforeImageUrl,
        speedMultiplier: activeVideo.writingSpeedMultiplier,
        filename: `larpking-ecriture-${activeVideo.label.toLowerCase().replace(/\s+/g, "-")}.mp4`,
      });
      notify({
        title: "Vidéo téléchargée",
        description: "L'écriture a été générée côté navigateur.",
      });
    } catch (error: any) {
      notify({
        title: "Export impossible",
        description:
          error?.message ||
          "Le navigateur n'a pas pu générer la vidéo d'écriture.",
        variant: "destructive",
      });
    } finally {
      setIsExportingWritingVideo(false);
    }
  };

  const handleCreateHook = () => {
    if (!beforeImageUrl || !afterImageUrl) {
      notify({
        title: "Images manquantes",
        description: "Définissez une image avant et une image après avant de créer le hook.",
        variant: "destructive",
      });
      return;
    }

    updateActiveVideo((video) => ({
      ...video,
      hookVideo: { startedAt: Date.now() },
    }));
  };

  const handleHookEnded = useCallback(() => {
    updateActiveVideo((video) => ({
      ...video,
      hookVideo: { startedAt: null },
    }));
  }, [updateActiveVideo]);

  const handleReplayHook = useCallback(() => {
    updateActiveVideo((video) => ({
      ...video,
      hookVideo: { startedAt: Date.now() },
    }));
  }, [updateActiveVideo]);

  const handleDownloadHookVideo = async () => {
    if (!beforeImageUrl || !afterImageUrl) return;

    setIsExportingHookVideo(true);
    try {
      await exportHookVideo({
        beforeImageUrl,
        afterImageUrl,
        durationSeconds: activeVideo.hookDurationSeconds,
        filename: `larpking-hook-${activeVideo.label.toLowerCase().replace(/\s+/g, "-")}.mp4`,
      });
      notify({
        title: "Vidéo téléchargée",
        description: "Le hook a été généré côté navigateur.",
      });
    } catch (error: any) {
      notify({
        title: "Export impossible",
        description:
          error?.message ||
          "Le navigateur n'a pas pu générer la vidéo hook.",
        variant: "destructive",
      });
    } finally {
      setIsExportingHookVideo(false);
    }
  };

  const handleDownloadFullVideo = async () => {
    if (!beforeImageUrl || !afterImageUrl || !activeVideo.writingPrompt.trim()) {
      notify({
        title: "Éléments manquants",
        description:
          "La vidéo complète nécessite une image avant, une image après et le prompt d'écriture.",
        variant: "destructive",
      });
      return;
    }

    setIsExportingFullVideo(true);
    try {
      await exportFullMarketingVideo({
        beforeImageUrl,
        afterImageUrl,
        writingPrompt: activeVideo.writingPrompt,
        writingSpeedMultiplier: activeVideo.writingSpeedMultiplier,
        hookDurationSeconds: activeVideo.hookDurationSeconds,
        loaderDurationSeconds: activeVideo.loaderDurationSeconds,
        loaderSpeedMultiplier: activeVideo.loaderSpeedMultiplier,
        filename: `larpking-video-complete-${activeVideo.label.toLowerCase().replace(/\s+/g, "-")}.mp4`,
      });
      notify({
        title: "Vidéo complète téléchargée",
        description: "Les scènes hook, écriture et chargement ont été assemblées.",
      });
    } catch (error: any) {
      notify({
        title: "Export impossible",
        description:
          error?.message ||
          "Le navigateur n'a pas pu générer la vidéo complète.",
        variant: "destructive",
      });
    } finally {
      setIsExportingFullVideo(false);
    }
  };

  const handleVideoGenerationComplete = useCallback(
    ({
      videoId,
      stage,
      resultUrl,
      isActive,
    }: {
      videoId: string;
      stage: "b1" | "c1";
      resultUrl: string;
      isActive: boolean;
    }) => {
      const completedAt = Date.now();
      updateVideoById(videoId, (video) => ({
        ...video,
        [stage]: {
          ...video[stage],
          url: resultUrl,
          isGenerating: false,
        },
        lastCompletedAt: completedAt,
        lastSeenAt: isActive ? completedAt : video.lastSeenAt,
      }));
    },
    [updateVideoById],
  );

  const handleVideoGenerationFail = useCallback(
    ({
      videoId,
      stage,
      failMessage,
    }: {
      videoId: string;
      stage: "b1" | "c1";
      failMessage: string | null;
    }) => {
      updateVideoById(videoId, (video) => ({
        ...video,
        [stage]: {
          ...video[stage],
          isGenerating: false,
        },
      }));

      notify({
        title: stage === "b1"
          ? "Génération échouée (étape A)"
          : "Génération échouée (étape B)",
        description: failMessage || "Erreur inconnue",
        variant: "destructive",
      });
    },
    [toast, updateVideoById],
  );

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h2 className="text-2xl font-bold">Accès refusé</h2>
        <p className="text-muted-foreground">
          Cette page est réservée aux administrateurs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pt-2 pb-8">
      {studioState.videos.map((video) => (
        <StudioVideoStatusPoller
          key={video.id}
          video={video}
          isActive={video.id === activeVideo.id}
          onComplete={handleVideoGenerationComplete}
          onFail={handleVideoGenerationFail}
        />
      ))}

      {fullscreenPreview ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black"
          role="dialog"
          aria-modal="true"
          aria-label="Simulation en grand écran"
        >
          <Button
            type="button"
            size="icon"
            variant="secondary"
            onClick={closeFullscreenPreview}
            className="absolute right-3 top-3 z-20 h-10 w-10 rounded-full border border-white/15 bg-white/10 text-white shadow-xl backdrop-blur-md hover:bg-white/20"
            aria-label="Fermer le grand écran"
            title="Fermer"
          >
            <X className="h-5 w-5" />
          </Button>

          <div className="flex h-[100svh] w-full items-center justify-center overflow-hidden p-0 sm:p-4">
            <div className="aspect-[9/16] h-[100svh] max-h-[100svh] w-auto max-w-full overflow-hidden bg-black sm:rounded-[10px]">
              {fullscreenPreview === "loader" ? (
                <SimulatedMarketingVideoPreview
                  sourceUrl={activeVideo.simulatedVideo.sourceUrl}
                  startedAt={activeVideo.simulatedVideo.startedAt}
                  maxSeconds={activeVideo.loaderDurationSeconds}
                  speedMultiplier={activeVideo.loaderSpeedMultiplier}
                  onEnded={handleSimulatedVideoEnded}
                  onPlay={handleReplaySimulatedVideo}
                  className="h-full w-full rounded-none border-0"
                />
              ) : null}

              {fullscreenPreview === "writing" ? (
                <KeyboardWritingPreview
                  prompt={activeVideo.writingPrompt}
                  beforeImageUrl={beforeImageUrl}
                  startedAt={activeVideo.writingVideo.startedAt}
                  speedMultiplier={activeVideo.writingSpeedMultiplier}
                  onEnded={handleWritingEnded}
                  onReplay={handleReplayWriting}
                  className="h-full w-full rounded-none border-0"
                />
              ) : null}

              {fullscreenPreview === "hook" ? (
                <HookVideoPreview
                  beforeImageUrl={beforeImageUrl}
                  afterImageUrl={afterImageUrl}
                  durationSeconds={activeVideo.hookDurationSeconds}
                  startedAt={activeVideo.hookVideo.startedAt}
                  onEnded={handleHookEnded}
                  onReplay={handleReplayHook}
                  className="h-full w-full rounded-none border-0"
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="fixed top-4 left-0 right-0 z-20 pointer-events-none px-4 md:px-8">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-2 pointer-events-auto">
          <div className="grid grid-cols-5 gap-2">
            {studioState.videos.map((video, index) => {
              const isActive = video.id === activeVideo.id;
              const state =
                uploadingVideoId === video.id ? "loading" : getVideoTabState(video);
              return (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => {
                    setStudioState((prev) => ({
                      ...prev,
                      activeVideoId: video.id,
                      videos: prev.videos.map((item) =>
                        item.id === video.id
                          ? { ...item, lastSeenAt: Date.now() }
                          : item,
                      ),
                    }));
                  }}
                  className={cn(
                    "flex h-9 items-center justify-center gap-1 rounded-full border px-2 text-xs font-semibold transition-all",
                    state === "empty" &&
                      "border-border/50 bg-transparent text-muted-foreground hover:bg-muted/40",
                    state === "dirty" &&
                      "border-black bg-black text-white hover:bg-black/90",
                    state === "loading" &&
                      "border-sky-600 bg-sky-600 text-white hover:bg-sky-700",
                    state === "unseen" &&
                      "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700",
                    isActive && "ring-2 ring-primary ring-offset-2",
                  )}
                >
                  {state === "loading" && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  <span>{index + 1}</span>
                </button>
              );
            })}
          </div>
          <div className="flex justify-center">
            <Button
              type="button"
              size="sm"
              onClick={resetActiveVideo}
              className="bg-red-600 text-white hover:bg-red-700 border-red-600"
            >
              Reset
            </Button>
          </div>
        </div>
      </div>

      <div className="h-[4.75rem]" aria-hidden="true" />

      <div className="mx-auto w-full max-w-sm space-y-4">
        {/* A1 — image de référence */}
        <div
          className={cn(
            "relative aspect-[9/16] w-full overflow-hidden rounded-lg border-2 border-dashed transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-foreground/25 bg-white/80",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void handleReferenceFile(file);
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleReferenceFile(file);
            }}
          />

          {isUploadingActiveRef ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Upload en cours…</p>
            </div>
          ) : refUrl ? (
            <img
              src={refUrl}
              alt="Image de référence"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <ImagePlus className="h-7 w-7 text-primary" />
              </div>
              <p className="text-base font-medium text-muted-foreground">
                Glissez une image ou cliquez pour uploader
              </p>
            </button>
          )}
        </div>

        {/* A2 — prompt étape A */}
        <PromptPanel
          prompt={promptA}
          onPromptChange={(value) =>
            updateActiveVideo((video) => ({ ...video, promptA: value }))
          }
          onGenerate={() => void handleGenerateA()}
          isGenerating={b1.isGenerating}
          disabled={!refUrl || !promptA.trim() || isUploadingActiveRef}
          placeholder="Prompt pour préparer l'image de base (retirer texte, UI, etc.)"
        />

        {/* B1 + bouton X */}
        <div className="flex items-center gap-3">
          <div className="flex-1 space-y-2">
            <AspectImageSlot
              label="Résultat étape A"
              imageUrl={b1.url}
              isLoading={b1.isGenerating}
              emptyLabel="Le résultat de l'étape A apparaîtra ici"
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => void handleDownloadImage("b1")}
              disabled={!b1.url || b1.isGenerating || downloadingImageSlot === "b1"}
            >
              {downloadingImageSlot === "b1" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Télécharger
            </Button>
          </div>
          <TypeToggleButton type={b1.type} onToggle={toggleB1Type} />
        </div>

        {/* B2 — prompt étape B */}
        <PromptPanel
          prompt={promptB}
          onPromptChange={(value) =>
            updateActiveVideo((video) => ({ ...video, promptB: value }))
          }
          onGenerate={() => void handleGenerateB()}
          isGenerating={c1.isGenerating}
          disabled={!b1.url || !promptB.trim()}
          placeholder="Prompt pour générer l'image opposée (avant ou après)"
        />

        {/* C1 + bouton Y */}
        <div className="flex items-center gap-3">
          <div className="flex-1 space-y-2">
            <AspectImageSlot
              label="Résultat étape B"
              imageUrl={c1.url}
              isLoading={c1.isGenerating}
              emptyLabel="Le résultat de l'étape B apparaîtra ici"
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => void handleDownloadImage("c1")}
              disabled={!c1.url || c1.isGenerating || downloadingImageSlot === "c1"}
            >
              {downloadingImageSlot === "c1" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Télécharger
            </Button>
          </div>
          <TypeToggleButton type={c1.type} onToggle={toggleC1Type} />
        </div>

        {/* D1 + D2 — simulation vidéo in-app */}
        <div className="space-y-4">
          <Button
            type="button"
            className="w-full"
            onClick={handleCreateSimulatedVideo}
            disabled={!beforeImageUrl}
          >
            Créer le loader
          </Button>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <label className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Durée</span>
              <Input
                type="number"
                min={MIN_LOADER_DURATION_SECONDS}
                max={MAX_LOADER_DURATION_SECONDS}
                value={activeVideo.loaderDurationSeconds}
                onChange={(event) => {
                  const next = clampLoaderDuration(event.target.value);
                  updateActiveVideo((video) => ({
                    ...video,
                    loaderDurationSeconds: next,
                  }));
                }}
                className="h-9 w-14 text-center tabular-nums"
              />
              <span className="text-sm text-muted-foreground">s</span>
            </label>

            <label className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Vitesse</span>
              <span className="text-sm font-medium text-muted-foreground">x</span>
              <Input
                type="number"
                min={MIN_LOADER_SPEED_MULTIPLIER}
                max={MAX_LOADER_SPEED_MULTIPLIER}
                step={0.25}
                value={activeVideo.loaderSpeedMultiplier}
                onChange={(event) => {
                  const next = clampLoaderSpeed(event.target.value);
                  updateActiveVideo((video) => ({
                    ...video,
                    loaderSpeedMultiplier: next,
                  }));
                }}
                className="h-9 w-14 text-center tabular-nums"
              />
            </label>
          </div>

          <div className="relative">
            <SimulatedMarketingVideoPreview
              sourceUrl={activeVideo.simulatedVideo.sourceUrl}
              startedAt={activeVideo.simulatedVideo.startedAt}
              maxSeconds={activeVideo.loaderDurationSeconds}
              speedMultiplier={activeVideo.loaderSpeedMultiplier}
              onEnded={handleSimulatedVideoEnded}
              onPlay={handleReplaySimulatedVideo}
            />
            <FullscreenPreviewButton
              onClick={() => openFullscreenPreview("loader")}
              disabled={!activeVideo.simulatedVideo.sourceUrl}
            />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => void handleDownloadLoaderVideo()}
            disabled={!activeVideo.simulatedVideo.sourceUrl || isExportingLoaderVideo}
          >
            {isExportingLoaderVideo ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Télécharger la vidéo
          </Button>
        </div>

        {/* E1 + E2 + E3 — simulation écriture clavier */}
        <div className="space-y-4">
          <div className="relative rounded-lg border border-border bg-card p-3 min-h-[120px]">
            <Textarea
              value={activeVideo.writingPrompt}
              onChange={(event) =>
                updateActiveVideo((video) => ({
                  ...video,
                  writingPrompt: event.target.value,
                }))
              }
              placeholder="Texte qui sera tapé lettre par lettre dans la vidéo (ex. Rajoute une Ferrari 488 Pista)"
              className="min-h-[88px] resize-none border-0 bg-transparent p-0 pr-32 shadow-none focus-visible:ring-0"
            />
            <Button
              type="button"
              size="sm"
              className="absolute bottom-3 right-3"
              onClick={handleCreateWriting}
              disabled={!activeVideo.writingPrompt.trim()}
            >
              Créer l'écriture
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <label className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Vitesse</span>
              <span className="text-sm font-medium text-muted-foreground">x</span>
              <Input
                type="number"
                min={MIN_WRITING_SPEED_MULTIPLIER}
                max={MAX_WRITING_SPEED_MULTIPLIER}
                step={0.5}
                value={activeVideo.writingSpeedMultiplier}
                onChange={(event) => {
                  const next = clampWritingSpeed(event.target.value);
                  updateActiveVideo((video) => ({
                    ...video,
                    writingSpeedMultiplier: next,
                  }));
                }}
                className="h-9 w-14 text-center tabular-nums"
              />
            </label>
          </div>

          <div className="relative">
            <KeyboardWritingPreview
              prompt={activeVideo.writingPrompt}
              beforeImageUrl={beforeImageUrl}
              startedAt={activeVideo.writingVideo.startedAt}
              speedMultiplier={activeVideo.writingSpeedMultiplier}
              onEnded={handleWritingEnded}
              onReplay={handleReplayWriting}
            />
            <FullscreenPreviewButton
              onClick={() => openFullscreenPreview("writing")}
              disabled={!activeVideo.writingPrompt.trim()}
            />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => void handleDownloadWritingVideo()}
            disabled={!activeVideo.writingPrompt.trim() || isExportingWritingVideo}
          >
            {isExportingWritingVideo ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Télécharger la vidéo
          </Button>
        </div>

        {/* F — hook avant/après */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-center gap-3 rounded-lg border border-border bg-card p-3">
            <label className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Durée hook</span>
              <Input
                type="number"
                min={MIN_HOOK_DURATION_SECONDS}
                max={MAX_HOOK_DURATION_SECONDS}
                step={0.5}
                value={activeVideo.hookDurationSeconds}
                onChange={(event) => {
                  const next = clampHookDuration(event.target.value);
                  updateActiveVideo((video) => ({
                    ...video,
                    hookDurationSeconds: next,
                  }));
                }}
                className="h-9 w-16 text-center tabular-nums"
              />
              <span className="text-sm text-muted-foreground">s</span>
            </label>

            <Button
              type="button"
              size="sm"
              onClick={handleCreateHook}
              disabled={!beforeImageUrl || !afterImageUrl}
            >
              Créer le hook
            </Button>
          </div>

          <div className="relative">
            <HookVideoPreview
              beforeImageUrl={beforeImageUrl}
              afterImageUrl={afterImageUrl}
              durationSeconds={activeVideo.hookDurationSeconds}
              startedAt={activeVideo.hookVideo.startedAt}
              onEnded={handleHookEnded}
              onReplay={handleReplayHook}
            />
            <FullscreenPreviewButton
              onClick={() => openFullscreenPreview("hook")}
              disabled={!beforeImageUrl || !afterImageUrl}
            />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => void handleDownloadHookVideo()}
            disabled={!beforeImageUrl || !afterImageUrl || isExportingHookVideo}
          >
            {isExportingHookVideo ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Télécharger la vidéo
          </Button>
        </div>

        {/* G — vidéo complète */}
        <div className="space-y-3 rounded-lg border border-border bg-card p-3">
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">
              Vidéo complète
            </p>
            <p className="text-xs text-muted-foreground">
              Hook → écriture → chargement
            </p>
          </div>

          <Button
            type="button"
            className="w-full"
            onClick={() => void handleDownloadFullVideo()}
            disabled={
              !beforeImageUrl ||
              !afterImageUrl ||
              !activeVideo.writingPrompt.trim() ||
              isExportingFullVideo
            }
          >
            {isExportingFullVideo ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Télécharger la vidéo complète
          </Button>
        </div>
      </div>
    </div>
  );
}
