import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  Check,
  CloudUpload,
  Mic,
  Pause,
  Play,
  Share2,
  Square,
} from "lucide-react";
import { LuxePaywallModal } from "@/components/generate/LuxePaywallModal";
import { VoiceCapCutTrim, VoiceClipPreview } from "@/components/v2/VoiceCapCutTrim";
import { VoiceHistorySection } from "@/components/v2/VoiceHistorySection";
import { VoiceShareSheet } from "@/components/v2/VoiceShareSheet";
import { voiceHistoryQueryKey } from "@/hooks/use-voice-history";
import { VoiceSelectedHero } from "@/components/v2/VoiceSelectedHero";
import { VoiceCatalogPicker } from "@/components/v2/VoiceCatalogPicker";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { currentPlanQueryRoot, useCurrentPlan } from "@/hooks/use-billing";
import {
  MOCK_VOICE_CATALOG,
  findCatalogProfileByName,
  type ClonedVoice,
  type MockVoiceProfile,
} from "@/lib/v2-mock-voice";
import {
  readSelectedCatalogVoiceId,
  readSelectedClonedVoiceId,
  clearSelectedVoice,
  writeSelectedCatalogVoiceId,
  writeSelectedClonedVoiceId,
} from "@/lib/v2-experience";
import {
  getStoredClonedVoice,
  persistClonedVoice,
  readClonedVoices,
  removeClonedVoice,
  updateClonedVoiceServerIds,
  voiceClipToDataUrl,
  type StoredClonedVoice,
} from "@/lib/cloned-voices-storage";
import { queryClient } from "@/lib/queryClient";
import { cloneVoice, generateVoice, type VoiceDeliveryStyle } from "@/lib/voice-api";
import { FakeOnboardingLoader } from "@/components/larp/FakeOnboardingLoader";
import { VoiceGenerationLoader } from "@/components/v2/VoiceGenerationLoader";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { buildCatalogSampleLine } from "@shared/voice-locale-scripts";
import { adminPreviewVoiceGenerateCreditCost } from "@shared/pricing-admin-reference";
import { startLandingGuestFunnel } from "@/lib/landing-funnel";
import { useOnboardingFakeLoader } from "@/hooks/use-onboarding-fake-loader";
import { markFakePaywallReached } from "@/lib/fake-paywall-state";
import { resetPaywallExpiry } from "@/lib/paywall-expiry";
import { releaseGenerationLoaderTheme } from "@/lib/generation-loader-theme";
import {
  VOICE_FAKE_GEN_MS,
  VOICE_GEN_ESTIMATE_SEC,
  voiceFakeEstimateSeconds,
} from "@/lib/voice-generation-timing";
import "@/components/v2/voice-generation-loader.css";
import {
  fetchVoiceBlob,
  shareVoiceAudio,
  type VoiceSharePlatform,
} from "@/lib/share-voice";
import {
  fileToVideoDataUrl,
  withNormalizedVideoFile,
} from "@/lib/media-file-detect";
import {
  MAX_CLIP_SEC,
  MIN_CLIP_SEC,
  IDEAL_CLIP_SEC,
  buildDefaultVideoImportClip,
  buildVoiceClipFromBlob,
  buildVoiceClipFromFile,
  defaultTrimRange,
  decodeMediaFile,
  getMediaDurationQuick,
  getMediaDurationFromUrl,
  isVideoMediaFile,
  formatClipTime,
  needsTrimWindow,
  revokeVoiceClipUrl,
  type VoiceClip,
} from "@/lib/voice-capture";

type CaptureMode = "record" | "import";
type RecordState = "idle" | "recording" | "ready";

const FAKE_GEN_MS = VOICE_FAKE_GEN_MS;

function formatTimer(ms: number) {
  const s = Math.min(MAX_CLIP_SEC, Math.floor(ms / 1000));
  return `0:${String(s).padStart(2, "0")}`;
}

function formatPlaybackClock(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const total = Math.floor(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function resolveActiveFromStorage(): {
  id: string;
  name: string;
  kind: "catalog" | "cloned";
  profile?: MockVoiceProfile;
} | null {
  const clonedId = readSelectedClonedVoiceId();
  if (clonedId) {
    const stored = getStoredClonedVoice(clonedId);
    if (stored) {
      return { id: stored.id, name: stored.name, kind: "cloned" };
    }
  }

  const id = readSelectedCatalogVoiceId();
  if (id) {
    const profile = MOCK_VOICE_CATALOG.find((v) => v.id === id);
    if (profile) {
      return {
        id: profile.id,
        name: profile.name,
        kind: "catalog",
        profile,
      };
    }
  }

  return null;
}

function clonedVoiceSubtitle(voice: StoredClonedVoice): string {
  const label =
    voice.source === "record"
      ? "Enregistrement"
      : "Fichier importé";
  return `${label} · ${formatClipTime(voice.durationSec)}`;
}

type VoiceStudioMockProps = {
  guestFunnel?: boolean;
};

export function VoiceStudioMock({ guestFunnel = false }: VoiceStudioMockProps) {
  const { t, i18n } = useTranslation();
  const vsg = useCallback(
    (key: string, fallback: string, options?: Record<string, unknown>) =>
      guestFunnel ? t(`landing:voiceStudioGuest.${key}`, options) : fallback,
    [guestFunnel, t],
  );
  const fileInputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const recordTimerRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const stopSpeakRef = useRef<(() => void) | null>(null);
  const cloneReplayRef = useRef<HTMLAudioElement | null>(null);
  const resultAudioRef = useRef<HTMLAudioElement | null>(null);
  const shareBlobRef = useRef<Blob | null>(null);
  const genTimerRef = useRef<number | null>(null);
  const importBufferRef = useRef<AudioBuffer | null>(null);
  const importFileRef = useRef<File | null>(null);
  const importPreviewUrlRef = useRef<string | null>(null);
  const rebuildDebounceRef = useRef<number | null>(null);

  const [, navigate] = useLocation();
  const { user, isAdmin, profile } = useAuth();
  const { toast } = useToast();
  const { data: plan } = useCurrentPlan();
  const hasPaidAccess = Boolean(
    isAdmin ||
      plan?.planType === "admin" ||
      plan?.isSubscriber ||
      (typeof plan?.credits === "number" && plan.credits > 0),
  );

  const [captureMode, setCaptureMode] = useState<CaptureMode>("record");
  const [voiceName, setVoiceName] = useState("");
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [recordMs, setRecordMs] = useState(0);
  const [importLabel, setImportLabel] = useState<string | null>(null);
  const [importTotalSec, setImportTotalSec] = useState(0);
  const [trimStartSec, setTrimStartSec] = useState(0);
  const [trimEndSec, setTrimEndSec] = useState(MAX_CLIP_SEC);
  const [importPreviewUrl, setImportPreviewUrl] = useState<string | null>(null);
  const [importIsVideo, setImportIsVideo] = useState(false);
  const [needsTrim, setNeedsTrim] = useState(false);
  const [isDecoding, setIsDecoding] = useState(false);
  const [voiceClip, setVoiceClip] = useState<VoiceClip | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [cloned, setCloned] = useState<StoredClonedVoice[]>(() => readClonedVoices());
  const [replayCloneId, setReplayCloneId] = useState<string | null>(null);
  const [activeVoice, setActiveVoice] = useState<{
    id: string;
    name: string;
    kind: "catalog" | "cloned";
    profile?: MockVoiceProfile;
  } | null>(() => resolveActiveFromStorage());

  const [text, setText] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(false);

  useEffect(() => {
    if (!guestFunnel) return;
    if (activeVoice?.kind === "catalog" && activeVoice.name) {
      setText(buildCatalogSampleLine(activeVoice.name, i18n.resolvedLanguage));
      return;
    }
    setText(t("landing:voiceStudioGuest.defaultText"));
  }, [guestFunnel, i18n.resolvedLanguage, activeVoice?.kind, activeVoice?.name, t]);

  const { showFakeLoader: showOnboardingFakeLoader, finishFakeLoader } =
    useOnboardingFakeLoader({
      mode: "voice",
      enabled: !guestFunnel && Boolean(user),
      isSubscriber: Boolean(
        profile?.is_subscriber || profile?.role === "admin" || isAdmin,
      ),
      userId: profile?.id,
      onRestorePrompt: (value) => setText(value),
    });

  const [playing, setPlaying] = useState(false);
  const [readyToPlay, setReadyToPlay] = useState(false);
  const [playbackCurrentSec, setPlaybackCurrentSec] = useState(0);
  const [playbackDurationSec, setPlaybackDurationSec] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const voiceGenStartedAtRef = useRef<number>(Date.now());
  const [resultAudioUrl, setResultAudioUrl] = useState<string | null>(null);
  const [resultGenerationId, setResultGenerationId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const clipAcceptable = Boolean(
    voiceClip &&
      voiceClip.durationSec >= MIN_CLIP_SEC - 0.05 &&
      voiceClip.durationSec <= MAX_CLIP_SEC + 0.25,
  );

  const clipReady = clipAcceptable;

  const creatingOwnVoice =
    clipAcceptable ||
    recordState === "recording" ||
    isDecoding ||
    (Boolean(importLabel) && !voiceClip);

  const showLockedVoiceName = Boolean(
    activeVoice &&
      (activeVoice.kind === "catalog" || activeVoice.kind === "cloned") &&
      !creatingOwnVoice,
  );

  const hasPendingCapture = clipAcceptable && voiceName.trim().length >= 2;

  const generateBlockReason = (() => {
    if (isGenerating) return null;
    if (!text.trim()) {
      return vsg("blockNoText", "Écris un texte à faire dire.");
    }
    if (activeVoice && !creatingOwnVoice) return null;
    if (hasPendingCapture) return null;
    if (voiceName.trim().length < 2) {
      return vsg("blockVoiceName", "Donne un nom à ta voix (2 lettres minimum).");
    }
    if (isDecoding) {
      return vsg("blockDecoding", "Préparation de l'extrait audio…");
    }
    if (importLabel && !voiceClip) {
      return vsg(
        "blockFilePlaying",
        "Fichier en cours de lecture — patiente quelques secondes.",
      );
    }
    if (voiceClip && voiceClip.durationSec < MIN_CLIP_SEC) {
      return vsg(
        "blockClipTooShort",
        `Extrait trop court : minimum ${MIN_CLIP_SEC} secondes. Élargis la sélection.`,
        { min: MIN_CLIP_SEC },
      );
    }
    if (voiceClip && voiceClip.durationSec > MAX_CLIP_SEC + 0.25) {
      return vsg(
        "blockClipTooLong",
        `Extrait trop long : maximum ${MAX_CLIP_SEC} secondes. Resserre les bandes blanches.`,
        { max: MAX_CLIP_SEC },
      );
    }
    if (!importLabel && recordState !== "ready") {
      return vsg(
        "blockNeedCapture",
        "Enregistre ou importe un extrait vocal (~20 s idéal, max 25 s).",
      );
    }
    return vsg(
      "blockNeedImport",
      "Importe ~20 s de voix seule (max 25 s, sans musique) pour un clone réaliste.",
    );
  })();

  const canGenerate = Boolean(
    text.trim() && !isGenerating && (hasPendingCapture || (activeVoice && !creatingOwnVoice)),
  );

  const voiceGenerateCreditCost = adminPreviewVoiceGenerateCreditCost(hasPendingCapture);

  const setClip = useCallback((next: VoiceClip | null) => {
    setVoiceClip((prev) => {
      if (prev?.url && prev.url !== next?.url) revokeVoiceClipUrl(prev);
      return next;
    });
  }, []);

  const cleanupMedia = useCallback(() => {
    if (recordTimerRef.current) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaRecorderRef.current?.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    mediaRecorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    recordChunksRef.current = [];
  }, []);

  const resetCapture = useCallback(() => {
    cleanupMedia();
    setRecordState("idle");
    setRecordMs(0);
    setImportLabel(null);
    setImportTotalSec(0);
    setTrimStartSec(0);
    setTrimEndSec(MAX_CLIP_SEC);
    setNeedsTrim(false);
    setCaptureError(null);
    if (importPreviewUrlRef.current) {
      URL.revokeObjectURL(importPreviewUrlRef.current);
      importPreviewUrlRef.current = null;
    }
    setImportPreviewUrl(null);
    setImportIsVideo(false);
    importBufferRef.current = null;
    importFileRef.current = null;
    if (rebuildDebounceRef.current) {
      window.clearTimeout(rebuildDebounceRef.current);
      rebuildDebounceRef.current = null;
    }
    setClip(null);
    if (fileRef.current) fileRef.current.value = "";
  }, [cleanupMedia, setClip]);

  useEffect(() => {
    const sync = () => setActiveVoice(resolveActiveFromStorage());
    sync();
    setCloned(readClonedVoices());
    window.addEventListener("luxeflexia:selected-voice", sync as EventListener);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener(
        "luxeflexia:selected-voice",
        sync as EventListener,
      );
      window.removeEventListener("focus", sync);
      cleanupMedia();
      if (genTimerRef.current) window.clearTimeout(genTimerRef.current);
      stopSpeakRef.current?.();
      cloneReplayRef.current?.pause();
      window.speechSynthesis?.cancel();
      setClip(null);
    };
  }, [cleanupMedia, setClip]);

  useEffect(() => {
    if (!isGenerating) {
      document.documentElement.removeAttribute("data-fullscreen-overlay");
      document.body.removeAttribute("data-fullscreen-overlay");
      return;
    }
    document.documentElement.setAttribute("data-fullscreen-overlay", "true");
    document.body.setAttribute("data-fullscreen-overlay", "true");
    return () => {
      document.documentElement.removeAttribute("data-fullscreen-overlay");
      document.body.removeAttribute("data-fullscreen-overlay");
    };
  }, [isGenerating]);

  useEffect(() => {
    if (showPaywall) {
      document.body.setAttribute("data-paywall-overlay", "true");
    } else {
      document.body.removeAttribute("data-paywall-overlay");
    }
    return () => document.body.removeAttribute("data-paywall-overlay");
  }, [showPaywall]);

  const stopPreview = () => {
    stopSpeakRef.current?.();
    stopSpeakRef.current = null;
    cloneReplayRef.current?.pause();
    const audio = resultAudioRef.current;
    if (audio) {
      audio.pause();
      audio.ontimeupdate = null;
      audio.onloadedmetadata = null;
    }
    setReplayCloneId(null);
    setPlaying(false);
  };

  const syncPlaybackClock = useCallback((audio: HTMLAudioElement) => {
    setPlaybackCurrentSec(audio.currentTime);
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      setPlaybackDurationSec(audio.duration);
    }
  }, []);

  const playResultAudio = useCallback(async (url: string) => {
    stopPreview();
    let audio = resultAudioRef.current;
    if (!audio) {
      audio = new Audio();
      resultAudioRef.current = audio;
    }
    audio.onended = () => {
      setPlaying(false);
      syncPlaybackClock(audio);
    };
    audio.onerror = () => setPlaying(false);
    audio.ontimeupdate = () => syncPlaybackClock(audio);
    audio.onloadedmetadata = () => syncPlaybackClock(audio);
    audio.src = url;
    audio.currentTime = 0;
    setPlaybackCurrentSec(0);
    setPlaybackDurationSec(0);
    setReadyToPlay(true);
    setPlaying(true);
    try {
      await audio.play();
      syncPlaybackClock(audio);
    } catch {
      setPlaying(false);
    }
  }, [syncPlaybackClock]);

  const prefetchShareBlob = useCallback(async (url: string, generationId?: string | null) => {
    try {
      shareBlobRef.current = await fetchVoiceBlob(url, generationId ?? undefined);
    } catch {
      shareBlobRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!shareOpen || !resultAudioUrl) return;
    void prefetchShareBlob(resultAudioUrl, resultGenerationId);
  }, [shareOpen, resultAudioUrl, resultGenerationId, prefetchShareBlob]);

  const handleVoiceShare = async (platform: VoiceSharePlatform) => {
    if (!resultAudioUrl || isSharing) return;
    setIsSharing(true);
    try {
      const outcome = await shareVoiceAudio({
        audioUrl: resultAudioUrl,
        generationId: resultGenerationId ?? undefined,
        blob: shareBlobRef.current,
        platform,
      });
      setShareOpen(false);
      if (outcome === "shared") {
        toast({ title: "Vocal partagé" });
      } else if (outcome === "opened-app") {
        toast({
          title: "WhatsApp ouvert",
          description: "Choisis ton contact et envoie le vocal.",
        });
      } else if (outcome === "saved") {
        toast({
          title: "Audio enregistré",
          description: "Ouvre WhatsApp ou Telegram et envoie le fichier audio.",
        });
      }
    } catch (error) {
      toast({
        title: "Partage impossible",
        description:
          error instanceof Error ? error.message : "Réessaie dans un instant.",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const toggleCloneReplay = (voice: StoredClonedVoice) => {
    stopPreview();

    if (replayCloneId === voice.id) {
      setReplayCloneId(null);
      return;
    }

    let audio = cloneReplayRef.current;
    if (!audio) {
      audio = new Audio();
      cloneReplayRef.current = audio;
    }

    audio.onended = () => setReplayCloneId(null);
    audio.onerror = () => setReplayCloneId(null);
    audio.src = voice.clipDataUrl;
    audio.currentTime = 0;
    void audio.play().then(() => setReplayCloneId(voice.id)).catch(() => {
      setReplayCloneId(null);
    });
  };

  const finalizeRecording = async (blob: Blob) => {
    const capped =
      blob.size > 0 ? blob : new Blob([], { type: "audio/webm" });
    const clip = await buildVoiceClipFromBlob(capped, "record");
    if (clip.durationSec > MAX_CLIP_SEC + 0.05) {
      setCaptureError(`Extrait limité à ${MAX_CLIP_SEC} secondes.`);
    }
    setClip(clip);
    setRecordState("ready");
  };

  const stopRecording = useCallback(() => {
    if (recordTimerRef.current) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    } else if (recordState === "recording") {
      setRecordState("idle");
    }
  }, [recordState]);

  const startRecording = async () => {
    resetCapture();
    setCaptureError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCaptureError("Micro non disponible sur cet appareil.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      recordChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
        const blob = new Blob(recordChunksRef.current, { type: mimeType });
        void finalizeRecording(blob);
      };

      recorder.start(200);
      setRecordState("recording");
      setRecordMs(0);
      const started = Date.now();
      recordTimerRef.current = window.setInterval(() => {
        const elapsed = Date.now() - started;
        const capped = Math.min(elapsed, MAX_CLIP_SEC * 1000);
        setRecordMs(capped);
        if (elapsed >= MAX_CLIP_SEC * 1000) stopRecording();
      }, 100);
    } catch {
      setCaptureError("Autorise l’accès au micro pour enregistrer.");
      cleanupMedia();
      setRecordState("idle");
    }
  };

  const rebuildImportClip = async (
    startSec: number,
    endSec: number,
  ): Promise<boolean> => {
    const file = importFileRef.current;
    if (!file) return false;
    try {
      const clip = await buildVoiceClipFromFile(
        file,
        startSec,
        endSec,
        "import",
        importLabel ?? undefined,
        importBufferRef.current,
      );
      setClip(clip);
      setCaptureError(null);
      return true;
    } catch {
      if (!importPreviewUrlRef.current) {
        setCaptureError(
          "Impossible de préparer cet extrait. Réessaie ou choisis un autre fichier.",
        );
      }
      return false;
    }
  };

  const buildFallbackVideoClip = useCallback(async (): Promise<boolean> => {
    const file = importFileRef.current;
    if (!file || !isVideoMediaFile(file)) return false;
    try {
      const clip = await buildDefaultVideoImportClip(
        file,
        importLabel ?? file.name,
      );
      setClip(clip);
      const dur =
        clip.durationSec > 0 ? clip.durationSec : MAX_CLIP_SEC;
      setImportTotalSec(dur);
      setTrimStartSec(0);
      setTrimEndSec(Math.min(MAX_CLIP_SEC, dur));
      setNeedsTrim(false);
      setCaptureError(null);
      return true;
    } catch {
      return false;
    }
  }, [importLabel, setClip]);

  const applyImportDuration = useCallback((total: number) => {
    if (total <= 0) return false;
    const range = defaultTrimRange(total);
    setImportTotalSec(total);
    setTrimStartSec(range.start);
    setTrimEndSec(range.end);
    const trim = needsTrimWindow(total);
    setNeedsTrim(trim);
    return trim;
  }, []);

  const handleMediaDuration = useCallback(
    (total: number) => {
      if (total <= 0 || importTotalSec > 0) return;
      const file = importFileRef.current;
      if (!file) return;
      const trim = applyImportDuration(total);
      const range = defaultTrimRange(total);
      void (async () => {
        setIsDecoding(true);
        if (trim) {
          const ok = await rebuildImportClip(range.start, range.end);
          if (!ok) await buildFallbackVideoClip();
        } else {
          try {
            const clip = await buildVoiceClipFromFile(
              file,
              0,
              Math.min(MAX_CLIP_SEC, total),
              "import",
              file.name,
              importBufferRef.current,
            );
            setClip(clip);
          } catch {
            await buildFallbackVideoClip();
          }
        }
        setIsDecoding(false);
      })();
    },
    [applyImportDuration, buildFallbackVideoClip, importTotalSec, setClip],
  );

  useEffect(() => {
    if (!importPreviewUrl || !importIsVideo || importTotalSec > 0) return;

    let cancelled = false;
    void (async () => {
      const total = await getMediaDurationFromUrl(importPreviewUrl, true);
      if (cancelled) return;
      const file = importFileRef.current;
      if (!file) {
        setIsDecoding(false);
        return;
      }

      if (total > 0) {
        const trim = applyImportDuration(total);
        const range = defaultTrimRange(total);
        if (trim) {
          const ok = await rebuildImportClip(range.start, range.end);
          if (!ok && !cancelled) {
            await buildFallbackVideoClip();
          }
        } else {
          const clip = await buildVoiceClipFromFile(
            file,
            0,
            Math.min(MAX_CLIP_SEC, total),
            "import",
            file.name,
            importBufferRef.current,
          );
          if (!cancelled) setClip(clip);
        }
      } else if (!cancelled) {
        const ok = await buildFallbackVideoClip();
        if (!ok && !cancelled) {
          setCaptureError(
            "Impossible de lire cette vidéo. Essaie un MP4 plus court ou un fichier audio.",
          );
        }
      }

      if (!cancelled) setIsDecoding(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    importPreviewUrl,
    importIsVideo,
    importTotalSec,
    applyImportDuration,
    buildFallbackVideoClip,
  ]);

  const onImportFile = async (file: File | undefined) => {
    if (!file) return;
    resetCapture();
    setCaptureError(null);
    const normalized = withNormalizedVideoFile(file);
    importFileRef.current = normalized;
    setImportLabel(normalized.name);
    setIsDecoding(true);

    const previewUrl = URL.createObjectURL(normalized);
    importPreviewUrlRef.current = previewUrl;
    setImportPreviewUrl(previewUrl);
    setImportIsVideo(isVideoMediaFile(normalized));

    if (!voiceName.trim()) {
      const base = file.name.replace(/\.[^.]+$/, "").trim();
      if (base) setVoiceName(base.slice(0, 40));
    }

    let totalSec = 0;
    try {
      totalSec = await getMediaDurationQuick(normalized);
    } catch {
      totalSec = 0;
    }

    const applyDefaultTrim = (total: number) => {
      applyImportDuration(total);
    };

    if (totalSec > 0) applyDefaultTrim(totalSec);

    try {
      if (!isVideoMediaFile(normalized)) {
        const buffer = await decodeMediaFile(normalized);
        importBufferRef.current = buffer;
        if (buffer.duration > totalSec) {
          totalSec = buffer.duration;
          applyDefaultTrim(totalSec);
        }
      } else if (totalSec <= 0) {
        const fromPreview = importPreviewUrlRef.current
          ? await getMediaDurationFromUrl(importPreviewUrlRef.current, true)
          : 0;
        if (fromPreview > 0) {
          totalSec = fromPreview;
          applyDefaultTrim(totalSec);
        }
      }

      const effectiveTotal =
        totalSec > 0
          ? totalSec
          : importBufferRef.current?.duration ?? 0;

      if (effectiveTotal > 0 && effectiveTotal !== totalSec) {
        totalSec = effectiveTotal;
        applyDefaultTrim(totalSec);
      }

      const range = defaultTrimRange(effectiveTotal > 0 ? effectiveTotal : totalSec);
      const knownTotal = effectiveTotal || totalSec;

      if (needsTrimWindow(knownTotal)) {
        const ok = await rebuildImportClip(range.start, range.end);
        if (!ok && isVideoMediaFile(normalized)) {
          await buildFallbackVideoClip();
        }
      } else if (knownTotal > 0) {
        setNeedsTrim(false);
        const clip = await buildVoiceClipFromFile(
          normalized,
          0,
          Math.min(MAX_CLIP_SEC, knownTotal),
          "import",
          normalized.name,
          importBufferRef.current,
        );
        setClip(clip);
      } else if (isVideoMediaFile(normalized)) {
        const ok = await buildFallbackVideoClip();
        if (!ok) {
          setCaptureError(null);
        }
      } else {
        throw new Error("Durée inconnue");
      }
    } catch {
      const total = totalSec;
      if (needsTrimWindow(total)) {
        const range = defaultTrimRange(total);
        setCaptureError(null);
        const ok = await rebuildImportClip(range.start, range.end);
        if (!ok && isVideoMediaFile(normalized)) {
          await buildFallbackVideoClip();
        }
      } else if (isVideoMediaFile(normalized)) {
        const ok = await buildFallbackVideoClip();
        if (!ok) {
          setCaptureError(
            "Impossible de lire ce fichier. Essaie MP3, WAV, M4A, MP4 ou MOV (TikTok téléchargé…).",
          );
          resetCapture();
        }
      } else {
        setCaptureError(
          "Impossible de lire ce fichier. Essaie MP3, WAV, M4A, MP4 ou MOV.",
        );
        resetCapture();
      }
    } finally {
      setIsDecoding(false);
    }
  };

  const handleTrimRangeChange = (start: number, end: number) => {
    setTrimStartSec(start);
    setTrimEndSec(end);
    if (!importFileRef.current) return;
    if (rebuildDebounceRef.current) {
      window.clearTimeout(rebuildDebounceRef.current);
    }
    rebuildDebounceRef.current = window.setTimeout(() => {
      void rebuildImportClip(start, end);
    }, 320);
  };

  const resolveDeliveryStyle = (
    voice?: { kind: "catalog" | "cloned"; profile?: MockVoiceProfile } | null,
  ): VoiceDeliveryStyle => {
    const category = voice?.profile?.category?.toLowerCase() ?? "";
    if (category.includes("rap")) return "rap";
    if (category.includes("humour") || category.includes("prank")) return "prank";
    return "casual";
  };

  const playUnlocked = (audioUrl?: string | null) => {
    const url = audioUrl ?? resultAudioUrl;
    if (!url) return;
    void playResultAudio(url);
  };

  const clearActiveVoice = useCallback(() => {
    stopPreview();
    setReplayCloneId(null);
    cloneReplayRef.current?.pause();
    setReadyToPlay(false);
    setResultAudioUrl(null);
    setResultGenerationId(null);
    setActiveVoice(null);
    clearSelectedVoice();
    resetCapture();
    setVoiceName("");
  }, [resetCapture]);

  const handleRemoveActiveVoice = useCallback(() => {
    if (activeVoice?.kind === "cloned") {
      removeClonedVoice(activeVoice.id);
      setCloned(readClonedVoices());
    }
    clearActiveVoice();
  }, [activeVoice, clearActiveVoice]);

  const selectClonedVoice = useCallback(
    (voice: StoredClonedVoice) => {
      stopPreview();
      setReplayCloneId(null);
      cloneReplayRef.current?.pause();
      setActiveVoice({
        id: voice.id,
        name: voice.name,
        kind: "cloned",
      });
      writeSelectedClonedVoiceId(voice.id);
      writeSelectedCatalogVoiceId(null);
      setReadyToPlay(false);
      resetCapture();
      setVoiceName("");
    },
    [resetCapture],
  );

  const bootstrappedCloneRef = useRef(false);

  useEffect(() => {
    if (activeVoice?.kind === "cloned") {
      writeSelectedClonedVoiceId(activeVoice.id);
    }
  }, [activeVoice?.id, activeVoice?.kind]);

  useEffect(() => {
    if (bootstrappedCloneRef.current || activeVoice) return;
    bootstrappedCloneRef.current = true;
    if (readSelectedClonedVoiceId() || readSelectedCatalogVoiceId()) return;
    const voices = readClonedVoices();
    if (voices.length === 0) return;
    selectClonedVoice(voices[0]);
  }, [activeVoice, selectClonedVoice]);

  const handleGenerate = () => {
    if (!canGenerate) return;
    stopPreview();
    setCaptureError(null);

    if (guestFunnel) {
      void (async () => {
        await startLandingGuestFunnel({
          mode: "voice",
          prompt: text.trim(),
          voiceLabel: activeVoice?.name ?? (voiceName.trim() || undefined),
        });
        if (!user) {
          navigate("/register");
          return;
        }
        releaseGenerationLoaderTheme();
        voiceGenStartedAtRef.current = Date.now();
        setIsGenerating(true);
        if (genTimerRef.current) window.clearTimeout(genTimerRef.current);
        genTimerRef.current = window.setTimeout(() => {
          setIsGenerating(false);
          genTimerRef.current = null;
          markFakePaywallReached(profile?.id, "voice");
          resetPaywallExpiry();
          navigate("/voix-prete?paywall=1");
        }, FAKE_GEN_MS);
      })();
      return;
    }

    if (!hasPaidAccess) {
      releaseGenerationLoaderTheme();
      voiceGenStartedAtRef.current = Date.now();
      setReadyToPlay(false);
      setIsGenerating(true);
      if (genTimerRef.current) window.clearTimeout(genTimerRef.current);
      genTimerRef.current = window.setTimeout(() => {
        setIsGenerating(false);
        genTimerRef.current = null;
        setShowPaywall(true);
      }, FAKE_GEN_MS);
      return;
    }

    if (!user) {
      setCaptureError("Connecte-toi pour générer une voix.");
      return;
    }

    void (async () => {
      releaseGenerationLoaderTheme();
      voiceGenStartedAtRef.current = Date.now();
      setIsGenerating(true);
      setReadyToPlay(false);
      setPlaybackCurrentSec(0);
      setPlaybackDurationSec(0);
      setResultAudioUrl(null);
    setResultGenerationId(null);

      try {
        let voiceCloneId: string | undefined;
        let fishReferenceId: string | undefined;
        let instantAudioDataUrl: string | undefined;
        let deliveryStyle: VoiceDeliveryStyle = "casual";
        let activeForStyle = activeVoice;

        if (hasPendingCapture && voiceClip) {
          const name = voiceName.trim();
          let audioDataUrl: string;
          try {
            audioDataUrl = await voiceClipToDataUrl(voiceClip);
          } catch {
            const raw = importFileRef.current;
            if (raw && isVideoMediaFile(raw) && raw.size <= 25 * 1024 * 1024) {
              audioDataUrl = await fileToVideoDataUrl(raw);
            } else {
              throw new Error(
                "Impossible de préparer l’extrait. Réessaie avec une vidéo ou un audio plus court.",
              );
            }
          }
          const clonedRemote = await cloneVoice({
            name,
            audioDataUrl,
            sourceType: voiceClip.source,
            sourceLabel:
              voiceClip.source === "record" ? "Enregistrement" : "Fichier importé",
            durationSec: voiceClip.durationSec,
          });

          voiceCloneId = clonedRemote.clone.id;
          fishReferenceId = clonedRemote.fishReferenceId;
          deliveryStyle = "rap";

          const entry: ClonedVoice = {
            id: `clone-${Date.now()}`,
            name,
            source: voiceClip.source,
            sourceLabel:
              voiceClip.source === "record" ? "Enregistrement" : "Fichier importé",
            createdAt: new Date().toISOString(),
          };
          await persistClonedVoice(entry, voiceClip);
          updateClonedVoiceServerIds(entry.id, {
            serverCloneId: voiceCloneId,
            fishReferenceId,
          });
          setCloned(readClonedVoices());

          const voice = { id: entry.id, name: entry.name, kind: "cloned" as const };
          setActiveVoice(voice);
          writeSelectedClonedVoiceId(entry.id);
          writeSelectedCatalogVoiceId(null);
          activeForStyle = voice;
          resetCapture();
          setVoiceName("");
        } else if (activeVoice?.kind === "cloned") {
          const stored = getStoredClonedVoice(activeVoice.id);
          if (stored?.serverCloneId) {
            voiceCloneId = stored.serverCloneId;
            fishReferenceId = stored.fishReferenceId;
          } else if (stored?.fishReferenceId) {
            fishReferenceId = stored.fishReferenceId;
          } else if (stored?.clipDataUrl) {
            instantAudioDataUrl = stored.clipDataUrl;
          } else {
            throw new Error("Voix locale introuvable. Réimporte un extrait.");
          }
          deliveryStyle = resolveDeliveryStyle(activeVoice);
        } else if (activeVoice?.kind === "catalog") {
          fishReferenceId = activeVoice.profile?.fishReferenceId;
          if (!fishReferenceId) {
            throw new Error(
              "Voix catalogue indisponible. Choisis une autre voix dans la bibliothèque.",
            );
          }
          deliveryStyle = resolveDeliveryStyle(activeVoice);
        } else {
          throw new Error("Choisis ou crée une voix avant de générer.");
        }

        const result = await generateVoice({
          text: text.trim(),
          voiceCloneId,
          fishReferenceId,
          instantAudioDataUrl,
          style: deliveryStyle,
          humanize: false,
        });

        setResultAudioUrl(result.audioUrl);
        setResultGenerationId(result.generation.id);
        void prefetchShareBlob(result.audioUrl, result.generation.id);
        void queryClient.invalidateQueries({ queryKey: currentPlanQueryRoot });
        void queryClient.invalidateQueries({ queryKey: voiceHistoryQueryKey });
        await playResultAudio(result.audioUrl);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Génération vocale impossible.";
        setCaptureError(message);
      } finally {
        setIsGenerating(false);
      }
    })();
  };

  return (
    <div className="voice-studio-page">
      <div className="voice-studio-page__inner voice-studio-page__inner--wide">
        <p className="voice-studio-page__eyebrow">
          {guestFunnel ? t("landing:voiceStudioGuest.eyebrow") : "Studio"}
        </p>
        <h2 className="voice-studio-page__title">
          {guestFunnel ? t("landing:voiceStudioGuest.title") : "Clonage IA"}
        </h2>

        {activeVoice ? (
          <VoiceSelectedHero
            voiceId={activeVoice.id}
            name={activeVoice.name}
            category={activeVoice.profile?.category}
            profile={activeVoice.profile}
            kind={activeVoice.kind}
            onRemove={handleRemoveActiveVoice}
          />
        ) : guestFunnel ? (
          <p className="voice-studio-page__hint">{t("landing:voiceStudioGuest.hint")}</p>
        ) : (
          <p className="voice-studio-page__hint">
            Choisis une voix dans Catalogue (menu du bas), ou enregistre la tienne
            ci-dessous puis génère.
          </p>
        )}

        <section className="vs-card" aria-labelledby="vs-clone-title">
          <div className="vs-card__head-row">
            <div>
              <h3 id="vs-clone-title" className="vs-card__title">
                {guestFunnel
                  ? showLockedVoiceName
                    ? t("landing:voiceStudioGuest.generateTitle")
                    : t("landing:voiceStudioGuest.createTitle")
                  : showLockedVoiceName
                    ? "Générer la voix"
                    : "Créer ma voix"}
              </h3>
              <p className="vs-card__sub">
                {guestFunnel
                  ? showLockedVoiceName
                    ? t("landing:voiceStudioGuest.generateSub")
                    : t("landing:voiceStudioGuest.createSub")
                  : showLockedVoiceName
                    ? "Écris ton texte puis génère."
                    : "Enregistre ou importe un extrait, écris ton texte, puis génère."}
              </p>
            </div>
            {guestFunnel ? (
              <button
                type="button"
                className={`vs-catalog-toggle${catalogOpen ? " is-open" : ""}`}
                aria-expanded={catalogOpen}
                onClick={() => setCatalogOpen((open) => !open)}
              >
                {catalogOpen
                  ? t("landing:voiceStudioGuest.catalogClose")
                  : t("landing:voiceStudioGuest.catalogOpen")}
              </button>
            ) : null}
          </div>

          {guestFunnel && catalogOpen ? (
            <div className="vs-card--catalog vs-card--catalog-popover" aria-labelledby="vs-landing-catalog">
              <h3 id="vs-landing-catalog" className="vs-card__title">
                {t("landing:voiceStudioGuest.catalogTitle")}
              </h3>
              <p className="vs-card__sub vs-card__sub--tight">
                {t("landing:voiceStudioGuest.catalogSub")}
              </p>
              <VoiceCatalogPicker
                selectedId={activeVoice?.kind === "catalog" ? activeVoice.id : null}
                defaultFilter="Rap"
                onSelect={(voice) => {
                  stopPreview();
                  setActiveVoice({
                    id: voice.id,
                    name: voice.name,
                    kind: "catalog",
                    profile: voice,
                  });
                  writeSelectedCatalogVoiceId(voice.id);
                  writeSelectedClonedVoiceId(null);
                  setReadyToPlay(false);
                  setText(buildCatalogSampleLine(voice.name, i18n.resolvedLanguage));
                  setCatalogOpen(false);
                }}
              />
            </div>
          ) : null}

          {cloned.length > 0 ? (
            <div className="vs-saved-voices">
              <p className="vs-label">{vsg("savedVoicesTitle", "Mes voix enregistrées")}</p>
              <p className="vs-help vs-help--tight">
                {vsg(
                  "savedVoicesSub",
                  "Réutilise une voix déjà capturée — pas besoin de réenregistrer à chaque fois.",
                )}
              </p>
              <ul className="vs-cloned-list">
                {cloned.map((v) => {
                  const isActive =
                    activeVoice?.kind === "cloned" && activeVoice.id === v.id;
                  const isReplaying = replayCloneId === v.id;
                  const catalogPhoto = findCatalogProfileByName(v.name)?.photoUrl;
                  return (
                    <li key={v.id} className="vs-cloned-item">
                      <button
                        type="button"
                        className={`vs-cloned-row${isActive ? " is-active" : ""}`}
                        onClick={() => selectClonedVoice(v)}
                      >
                        <span
                          className={`vs-cloned-row__avatar${catalogPhoto ? " vs-cloned-row__avatar--photo" : ""}`}
                          aria-hidden
                        >
                          {catalogPhoto ? (
                            <img src={catalogPhoto} alt="" loading="lazy" decoding="async" />
                          ) : (
                            v.name.slice(0, 2).toUpperCase()
                          )}
                        </span>
                        <span className="vs-cloned-row__copy">
                          <strong>{v.name}</strong>
                          <span>{clonedVoiceSubtitle(v)}</span>
                        </span>
                        {isActive ? (
                          <span className="vs-cloned-row__badge">
                            {vsg("activeVoiceBadge", "Active")}
                          </span>
                        ) : null}
                      </button>
                      <button
                        type="button"
                        className={`vs-cloned-row__replay${isReplaying ? " is-playing" : ""}`}
                        aria-label={
                          isReplaying
                            ? vsg("pauseVoiceAria", `Pause ${v.name}`, { name: v.name })
                            : vsg("replayVoiceAria", `Réécouter l'extrait de ${v.name}`, {
                                name: v.name,
                              })
                        }
                        onClick={() => toggleCloneReplay(v)}
                      >
                        {isReplaying ? (
                          <Pause className="h-3.5 w-3.5" aria-hidden />
                        ) : (
                          <Play className="h-3.5 w-3.5" aria-hidden />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {!showLockedVoiceName ? (
                <p className="vs-help vs-help--tight vs-saved-voices__or-new">
                  {vsg("orRecordNew", "— ou enregistre une nouvelle voix ci-dessous —")}
                </p>
              ) : null}
            </div>
          ) : null}

          {showLockedVoiceName ? (
            <ol className="vs-steps" aria-hidden>
              <li className="is-done">{vsg("stepVoice", "Voix")}</li>
              <li className={text.trim() ? "is-done" : undefined}>
                {vsg("stepGenerate", "Générer")}
              </li>
            </ol>
          ) : (
            <ol className="vs-steps" aria-hidden>
              <li className={voiceName.trim() ? "is-done" : undefined}>
                {vsg("stepName", "Nommer")}
              </li>
              <li className={clipReady ? "is-done" : undefined}>
                {vsg("stepCapture", "Capturer")}
              </li>
              <li className={text.trim() ? "is-done" : undefined}>
                {vsg("stepGenerate", "Générer")}
              </li>
            </ol>
          )}

          {showLockedVoiceName && activeVoice ? (
            <>
              <div className="vs-active-voice">
                <span className="vs-label">{vsg("selectedVoice", "Voix sélectionnée")}</span>
                <div className="vs-input vs-input--locked" aria-readonly="true">
                  {activeVoice.name}
                </div>
                <button
                  type="button"
                  className="vs-link vs-active-voice__change"
                  onClick={clearActiveVoice}
                >
                  {vsg("changeVoice", "Changer de voix")}
                </button>
              </div>
            </>
          ) : (
            <>
              <label className="vs-label" htmlFor="vs-voice-name">
                {vsg("voiceNameLabel", "Nom de ta voix")}
              </label>
              <input
                id="vs-voice-name"
                className="vs-input"
                type="text"
                maxLength={40}
                placeholder={vsg("voiceNamePlaceholder", "Ex. Voix soirée, Voix stories…")}
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
              />
            </>
          )}

          {!showLockedVoiceName ? (
            <>
              <div
                className="vs-mode-toggle"
                role="tablist"
                aria-label={vsg("audioSourceAria", "Source audio")}
              >
            <button
              type="button"
              role="tab"
              aria-selected={captureMode === "record"}
              className={`vs-mode-toggle__btn${captureMode === "record" ? " is-active" : ""}`}
              onClick={() => {
                setCaptureMode("record");
                resetCapture();
              }}
            >
              <Mic className="h-3.5 w-3.5" aria-hidden />
              {vsg("micro", "Micro")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={captureMode === "import"}
              className={`vs-mode-toggle__btn${captureMode === "import" ? " is-active" : ""}`}
              onClick={() => {
                setCaptureMode("import");
                if (recordState === "recording") stopRecording();
                resetCapture();
              }}
            >
              <CloudUpload className="h-3.5 w-3.5" aria-hidden />
              {vsg("file", "Fichier")}
            </button>
          </div>

          {captureMode === "record" ? (
            <div className="vs-capture">
              {recordState === "idle" && (
                <button
                  type="button"
                  className="vs-capture__action"
                  onClick={() => void startRecording()}
                >
                  <Mic className="h-5 w-5" aria-hidden />
                  {vsg("startRecording", "Lancer l'enregistrement")}
                </button>
              )}
              {recordState === "recording" && (
                <button
                  type="button"
                  className="vs-capture__action is-recording"
                  onClick={stopRecording}
                >
                  <Square className="h-4 w-4" aria-hidden />
                  {vsg("stopRecording", `Stop · ${formatTimer(recordMs)} / 0:25`, {
                    timer: formatTimer(recordMs),
                  })}
                </button>
              )}
              {recordState === "ready" && voiceClip && (
                <div className="vs-capture__ready">
                  <div className="vs-capture__ready-main">
                    <Check className="h-4 w-4" aria-hidden />
                    <div>
                      <strong>{vsg("recordingReady", "Enregistrement prêt")}</strong>
                      <span>{formatClipTime(voiceClip.durationSec)} max</span>
                    </div>
                  </div>
                  <button type="button" className="vs-link" onClick={resetCapture}>
                    {vsg("redo", "Refaire")}
                  </button>
                </div>
              )}
              {recordState === "ready" && voiceClip ? (
                <VoiceClipPreview clip={voiceClip} />
              ) : null}
              <p className="vs-help">{vsg("recordHelp", "Interview idéale : 15–20 s où il parle seul, sans musique. Évite le débruitage agressif — garde le grain naturel de la voix.")}</p>
            </div>
          ) : (
            <div className="vs-capture">
              <input
                ref={fileRef}
                id={fileInputId}
                type="file"
                accept="audio/*,video/mp4,video/quicktime,video/webm,video/*,.mp3,.wav,.m4a,.ogg,.webm,.mp4,.mov,.mkv"
                className="sr-only"
                onChange={(e) => void onImportFile(e.target.files?.[0])}
              />
              {!importLabel ? (
                <>
                  {isDecoding ? (
                    <div className="vs-capture__decoding" role="status">
                      <div className="vs-gen-overlay__spinner" aria-hidden />
                      <span>{vsg("analyzingFile", "Analyse du fichier…")}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="vs-capture__action"
                      onClick={() => fileRef.current?.click()}
                    >
                      <CloudUpload className="h-5 w-5" aria-hidden />
                      {vsg("chooseAudioVideo", "Choisir audio ou vidéo")}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div className="vs-capture__ready">
                    <div className="vs-capture__ready-main">
                      <Check className="h-4 w-4" aria-hidden />
                      <div>
                        <strong>{voiceName.trim() || vsg("fileReady", "Fichier prêt")}</strong>
                        <span className="vs-capture__filename">{importLabel}</span>
                      </div>
                    </div>
                    <button type="button" className="vs-link" onClick={resetCapture}>
                      {vsg("change", "Changer")}
                    </button>
                  </div>
                  {needsTrim && importTotalSec > 0 ? (
                    <VoiceCapCutTrim
                      totalSec={importTotalSec}
                      trimStart={trimStartSec}
                      trimEnd={trimEndSec}
                      clip={voiceClip}
                      previewUrl={importPreviewUrl}
                      previewIsVideo={importIsVideo}
                      isDecoding={isDecoding}
                      onRangeChange={handleTrimRangeChange}
                      onMediaDuration={handleMediaDuration}
                    />
                  ) : voiceClip ? (
                    <VoiceClipPreview clip={voiceClip} />
                  ) : isDecoding || (importIsVideo && importTotalSec <= 0) ? (
                    <div className="vs-capture__decoding" role="status">
                      <div className="vs-gen-overlay__spinner" aria-hidden />
                      <span>{vsg("analyzingVideo", "Analyse de la vidéo…")}</span>
                    </div>
                  ) : null}
                </>
              )}
              <p className="vs-help">
                {vsg(
                  "importHelp",
                  `MP3, WAV, M4A ou MP4 · max ${MAX_CLIP_SEC} s · glisse les bandes blanches si c'est plus long.`,
                  { max: MAX_CLIP_SEC },
                )}
              </p>
            </div>
          )}

            </>
          ) : null}

          <label className="vs-label" htmlFor="vs-script">
            {vsg("textLabel", "Ton texte")}
          </label>
          <textarea
            id="vs-script"
            className="studio-field"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={vsg(
              "textPlaceholder",
              "Écris ce que tu veux faire dire à la voix…",
            )}
          />

          <p className="vs-help vs-help--tight">
            {vsg(
              "rapperNamesHint",
              "Prénoms et noms de rappeurs : écris « Kaaris », « Damso », etc. — la prononciation est corrigée automatiquement.",
            )}
          </p>

          {captureError ? (
            <p className="vs-capture-error" role="alert">
              {captureError}
            </p>
          ) : null}

          <div className="voice-studio-mock__player">
            <button
              type="button"
              className="voice-studio-mock__play"
              onClick={() => {
                if (!readyToPlay) return;
                if (playing) {
                  stopPreview();
                  return;
                }
                playUnlocked();
              }}
              aria-label={playing ? vsg("pauseAria", "Pause") : vsg("playAria", "Lecture")}
              disabled={!readyToPlay}
            >
              {playing ? (
                <Pause className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <Play className="h-3.5 w-3.5" aria-hidden />
              )}
            </button>
            <button
              type="button"
              className="voice-studio-mock__share"
              onClick={() => setShareOpen(true)}
              aria-label={vsg("shareVocalAria", "Partager le vocal")}
              disabled={!readyToPlay || !resultAudioUrl || isSharing}
            >
              <Share2 className="h-3.5 w-3.5" aria-hidden />
            </button>
            <div className="voice-studio-mock__progress-wrap">
              <div
                className={`voice-studio-mock__progress-track${playing ? " is-playing" : ""}`}
                aria-hidden
              >
                <div
                  className="voice-studio-mock__progress-fill"
                  style={{
                    width:
                      playbackDurationSec > 0
                        ? `${Math.min(100, (playbackCurrentSec / playbackDurationSec) * 100)}%`
                        : "0%",
                  }}
                />
              </div>
              <span className="voice-studio-mock__time">
                {!readyToPlay
                  ? vsg("previewAfterGenerate", "Aperçu après génération")
                  : playbackDurationSec > 0
                    ? `${formatPlaybackClock(playbackCurrentSec)} / ${formatPlaybackClock(playbackDurationSec)}`
                    : playing
                      ? vsg("playbackPlaying", "Lecture…")
                      : vsg("readyToPlay", "Prêt — appuie lecture")}
              </span>
            </div>
          </div>

          {readyToPlay && resultAudioUrl ? (
            <button
              type="button"
              className="vs-share-cta"
              disabled={isSharing}
              onClick={() => setShareOpen(true)}
            >
              <Share2 className="h-4 w-4" aria-hidden />
              {vsg("shareCta", "Partager (WhatsApp, Telegram…)")}
            </button>
          ) : null}

          <button
            type="button"
            className="lx-btn-gold studio-primary-btn"
            disabled={!canGenerate}
            onClick={handleGenerate}
          >
            {guestFunnel
              ? `${t("landing:voiceStudioGuest.generateCta")} · ${voiceGenerateCreditCost} crédits`
              : `Générer la voix · ${voiceGenerateCreditCost} crédits`}
          </button>
          {generateBlockReason ? (
            <p className="vs-help vs-help--block" role="status">
              {generateBlockReason}
            </p>
          ) : null}
        </section>

        {guestFunnel ? null : (
          <VoiceHistorySection
            enabled={Boolean(user)}
            onPlay={() => stopPreview()}
            onStop={() => stopPreview()}
          />
        )}
      </div>

      {showOnboardingFakeLoader ? (
        <FakeOnboardingLoader
          variant="voice"
          durationMs={VOICE_FAKE_GEN_MS}
          onComplete={finishFakeLoader}
        />
      ) : null}

      {isGenerating && !showOnboardingFakeLoader ? (
        <VoiceGenerationLoader
          taskId="voice-generating"
          status="waiting"
          estimatedSeconds={
            hasPaidAccess
              ? VOICE_GEN_ESTIMATE_SEC
              : voiceFakeEstimateSeconds(FAKE_GEN_MS)
          }
          startedAtMs={voiceGenStartedAtRef.current}
        />
      ) : null}

      <LuxePaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
        prompt={text.trim() || null}
        defaultPlan="essential"
      />

      <VoiceShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        onSelect={(platform) => {
          void handleVoiceShare(platform);
        }}
      />
    </div>
  );
}
