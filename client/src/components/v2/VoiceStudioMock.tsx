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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { currentPlanQueryRoot, useCurrentPlan } from "@/hooks/use-billing";
import {
  MOCK_VOICE_CATALOG,
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
  updateClonedVoiceServerIds,
  voiceClipToDataUrl,
  type StoredClonedVoice,
} from "@/lib/cloned-voices-storage";
import { queryClient } from "@/lib/queryClient";
import { cloneVoice, generateVoice, type VoiceDeliveryStyle } from "@/lib/voice-api";
import {
  fetchVoiceBlob,
  shareVoiceAudio,
  type VoiceSharePlatform,
} from "@/lib/share-voice";
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

const FAKE_GEN_MS = 3200;
const GEN_MESSAGES = [
  "Analyse de la voix…",
  "Clonage vocal…",
  "Respirations & pauses…",
  "Rendu Fish Audio…",
  "Finalisation MP3…",
];

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
  if (!id) return null;
  const profile = MOCK_VOICE_CATALOG.find((v) => v.id === id);
  if (!profile) return null;
  return {
    id: profile.id,
    name: profile.name,
    kind: "catalog",
    profile,
  };
}

export function VoiceStudioMock() {
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

  const { user, isAdmin } = useAuth();
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

  const [text, setText] = useState(
    "Ce soir, direction Dubai Marina. La suite est réservée, la soirée aussi.",
  );
  const [playing, setPlaying] = useState(false);
  const [readyToPlay, setReadyToPlay] = useState(false);
  const [playbackCurrentSec, setPlaybackCurrentSec] = useState(0);
  const [playbackDurationSec, setPlaybackDurationSec] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genMessageIndex, setGenMessageIndex] = useState(0);
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
    if (!text.trim()) return "Écris un texte à faire dire.";
    if (activeVoice && !creatingOwnVoice) return null;
    if (hasPendingCapture) return null;
    if (voiceName.trim().length < 2) {
      return "Donne un nom à ta voix (2 lettres minimum).";
    }
    if (isDecoding) return "Préparation de l'extrait audio…";
    if (importLabel && !voiceClip) {
      return "Fichier en cours de lecture — patiente quelques secondes.";
    }
    if (voiceClip && voiceClip.durationSec < MIN_CLIP_SEC) {
      return `Extrait trop court : minimum ${MIN_CLIP_SEC} secondes. Élargis la sélection.`;
    }
    if (voiceClip && voiceClip.durationSec > MAX_CLIP_SEC + 0.25) {
      return `Extrait trop long : maximum ${MAX_CLIP_SEC} secondes. Resserre les bandes blanches.`;
    }
    if (!importLabel && recordState !== "ready") {
      return "Enregistre ou importe un extrait vocal (~20 s idéal, max 25 s).";
    }
    return "Importe ~20 s de voix seule (max 25 s, sans musique) pour un clone réaliste.";
  })();

  const canGenerate = Boolean(
    text.trim() && !isGenerating && (hasPendingCapture || (activeVoice && !creatingOwnVoice)),
  );

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
    if (!isGenerating) return;
    setGenMessageIndex(0);
    const id = window.setInterval(() => {
      setGenMessageIndex((i) => (i + 1) % GEN_MESSAGES.length);
    }, 800);
    return () => window.clearInterval(id);
  }, [isGenerating]);

  useEffect(() => {
    if (isGenerating) {
      document.body.setAttribute("data-fullscreen-overlay", "true");
    } else {
      document.body.removeAttribute("data-fullscreen-overlay");
    }
    return () => document.body.removeAttribute("data-fullscreen-overlay");
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
    importFileRef.current = file;
    setImportLabel(file.name);
    setIsDecoding(true);

    const previewUrl = URL.createObjectURL(file);
    importPreviewUrlRef.current = previewUrl;
    setImportPreviewUrl(previewUrl);
    setImportIsVideo(isVideoMediaFile(file));

    if (!voiceName.trim()) {
      const base = file.name.replace(/\.[^.]+$/, "").trim();
      if (base) setVoiceName(base.slice(0, 40));
    }

    let totalSec = 0;
    try {
      totalSec = await getMediaDurationQuick(file);
    } catch {
      totalSec = 0;
    }

    const applyDefaultTrim = (total: number) => {
      applyImportDuration(total);
    };

    if (totalSec > 0) applyDefaultTrim(totalSec);

    try {
      if (!isVideoMediaFile(file)) {
        const buffer = await decodeMediaFile(file);
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
        if (!ok && isVideoMediaFile(file)) {
          await buildFallbackVideoClip();
        }
      } else if (knownTotal > 0) {
        setNeedsTrim(false);
        const clip = await buildVoiceClipFromFile(
          file,
          0,
          Math.min(MAX_CLIP_SEC, knownTotal),
          "import",
          file.name,
          importBufferRef.current,
        );
        setClip(clip);
      } else if (isVideoMediaFile(file)) {
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
        if (!ok && isVideoMediaFile(file)) {
          await buildFallbackVideoClip();
        }
      } else if (isVideoMediaFile(file)) {
        const ok = await buildFallbackVideoClip();
        if (!ok) {
          setCaptureError(
            "Impossible de lire ce fichier. Essaie MP3, WAV, M4A ou MP4.",
          );
          resetCapture();
        }
      } else {
        setCaptureError(
          "Impossible de lire ce fichier. Essaie MP3, WAV, M4A ou MP4.",
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
    setReadyToPlay(false);
    setResultAudioUrl(null);
    setResultGenerationId(null);
    setActiveVoice(null);
    clearSelectedVoice();
  }, [playResultAudio]);

  const handleGenerate = () => {
    if (!canGenerate) return;
    stopPreview();
    setCaptureError(null);

    if (!hasPaidAccess) {
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
          const audioDataUrl = await voiceClipToDataUrl(voiceClip);
          const clonedRemote = await cloneVoice({
            name,
            audioDataUrl,
            sourceType: voiceClip.source,
            sourceLabel:
              voiceClip.source === "record"
                ? `Enregistrement ${formatClipTime(voiceClip.durationSec)}`
                : voiceClip.fileName ?? "Import audio",
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
              voiceClip.source === "record"
                ? `Enregistrement ${formatClipTime(voiceClip.durationSec)}`
                : voiceClip.fileName ?? "Import audio",
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
          deliveryStyle = resolveDeliveryStyle(activeVoice);
          setCaptureError(
            "Importe un extrait audio (micro ou fichier) pour cloner cette voix, puis génère.",
          );
          return;
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
        <p className="voice-studio-page__eyebrow">Studio</p>
        <h2 className="voice-studio-page__title">Voix IA</h2>

        {activeVoice ? (
          <VoiceSelectedHero
            name={activeVoice.name}
            category={activeVoice.profile?.category}
            profile={activeVoice.profile}
            kind={activeVoice.kind}
            onRemove={clearActiveVoice}
          />
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
                {showLockedVoiceName ? "Générer la voix" : "Créer ma voix"}
              </h3>
              <p className="vs-card__sub">
                {showLockedVoiceName
                  ? "Écris ton texte puis génère."
                  : "Enregistre ou importe un extrait, écris ton texte, puis génère."}
              </p>
            </div>
          </div>

          {showLockedVoiceName ? (
            <ol className="vs-steps" aria-hidden>
              <li className="is-done">Voix</li>
              <li className={text.trim() ? "is-done" : undefined}>Générer</li>
            </ol>
          ) : (
            <ol className="vs-steps" aria-hidden>
              <li className={voiceName.trim() ? "is-done" : undefined}>
                Nommer
              </li>
              <li className={clipReady ? "is-done" : undefined}>Capturer</li>
              <li className={text.trim() ? "is-done" : undefined}>Générer</li>
            </ol>
          )}

          {showLockedVoiceName && activeVoice ? (
            <>
              <span className="vs-label">Voix sélectionnée</span>
              <div className="vs-input vs-input--locked" aria-readonly="true">
                {activeVoice.name}
              </div>
            </>
          ) : (
            <>
              <label className="vs-label" htmlFor="vs-voice-name">
                Nom de ta voix
              </label>
              <input
                id="vs-voice-name"
                className="vs-input"
                type="text"
                maxLength={40}
                placeholder="Ex. Voix soirée, Voix stories…"
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
              />
            </>
          )}

          {!showLockedVoiceName ? (
            <>
              <div className="vs-mode-toggle" role="tablist" aria-label="Source audio">
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
              Micro
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
              Fichier
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
                  Lancer l’enregistrement
                </button>
              )}
              {recordState === "recording" && (
                <button
                  type="button"
                  className="vs-capture__action is-recording"
                  onClick={stopRecording}
                >
                  <Square className="h-4 w-4" aria-hidden />
                  Stop · {formatTimer(recordMs)} / 0:25
                </button>
              )}
              {recordState === "ready" && voiceClip && (
                <div className="vs-capture__ready">
                  <div className="vs-capture__ready-main">
                    <Check className="h-4 w-4" aria-hidden />
                    <div>
                      <strong>Enregistrement prêt</strong>
                      <span>{formatClipTime(voiceClip.durationSec)} max</span>
                    </div>
                  </div>
                  <button type="button" className="vs-link" onClick={resetCapture}>
                    Refaire
                  </button>
                </div>
              )}
              {recordState === "ready" && voiceClip ? (
                <VoiceClipPreview clip={voiceClip} />
              ) : null}
              <p className="vs-help">
                Interview idéale : <strong>15–20 s</strong> où il parle seul, sans musique.
                Évite le débruitage agressif — garde le grain naturel de la voix.
              </p>
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
                      <span>Analyse du fichier…</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="vs-capture__action"
                      onClick={() => fileRef.current?.click()}
                    >
                      <CloudUpload className="h-5 w-5" aria-hidden />
                      Choisir audio ou vidéo
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div className="vs-capture__ready">
                    <div className="vs-capture__ready-main">
                      <Check className="h-4 w-4" aria-hidden />
                      <div>
                        <strong>{voiceName.trim() || "Fichier prêt"}</strong>
                        <span className="vs-capture__filename">{importLabel}</span>
                      </div>
                    </div>
                    <button type="button" className="vs-link" onClick={resetCapture}>
                      Changer
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
                      <span>Analyse de la vidéo…</span>
                    </div>
                  ) : null}
                </>
              )}
              <p className="vs-help">
                MP3, WAV, M4A ou MP4 · max {MAX_CLIP_SEC} s · glisse les bandes
                blanches si c’est plus long.
              </p>
            </div>
          )}

            </>
          ) : null}

          <label className="vs-label" htmlFor="vs-script">
            Ton texte
          </label>
          <textarea
            id="vs-script"
            className="studio-field"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Écris ce que tu veux faire dire à la voix…"
          />

          <p className="vs-help vs-help--tight">
            Prénoms et noms de rappeurs : écris « Kaaris », « Damso », etc. — la
            prononciation est corrigée automatiquement.
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
              aria-label={playing ? "Pause" : "Lecture"}
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
              aria-label="Partager le vocal"
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
                  ? "Aperçu après génération"
                  : playbackDurationSec > 0
                    ? `${formatPlaybackClock(playbackCurrentSec)} / ${formatPlaybackClock(playbackDurationSec)}`
                    : playing
                      ? "Lecture…"
                      : "Prêt — appuie lecture"}
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
              Partager (WhatsApp, Telegram…)
            </button>
          ) : null}

          <button
            type="button"
            className="lx-btn-gold studio-primary-btn"
            disabled={!canGenerate}
            onClick={handleGenerate}
          >
            Générer la voix
          </button>
          {generateBlockReason ? (
            <p className="vs-help vs-help--block" role="status">
              {generateBlockReason}
            </p>
          ) : null}
        </section>

        {cloned.length > 0 ? (
          <section className="vs-card vs-card--list" aria-labelledby="vs-cloned-title">
            <h3 id="vs-cloned-title" className="vs-card__title">
              Mes voix
            </h3>
            <p className="vs-card__sub vs-card__sub--tight">
              Tes clones restent ici — réécoute l’extrait quand tu veux.
            </p>
            <ul className="vs-cloned-list">
              {cloned.map((v) => {
                const isActive =
                  activeVoice?.kind === "cloned" && activeVoice.id === v.id;
                const isReplaying = replayCloneId === v.id;
                return (
                  <li key={v.id} className="vs-cloned-item">
                    <button
                      type="button"
                      className={`vs-cloned-row${isActive ? " is-active" : ""}`}
                      onClick={() => {
                        stopPreview();
                        setActiveVoice({
                          id: v.id,
                          name: v.name,
                          kind: "cloned",
                        });
                        writeSelectedClonedVoiceId(v.id);
                        writeSelectedCatalogVoiceId(null);
                        setReadyToPlay(false);
                      }}
                    >
                      <span className="vs-cloned-row__avatar" aria-hidden>
                        {v.name.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="vs-cloned-row__copy">
                        <strong>{v.name}</strong>
                        <span>
                          {v.sourceLabel} · {formatClipTime(v.durationSec)}
                        </span>
                      </span>
                      {isActive ? (
                        <span className="vs-cloned-row__badge">Active</span>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      className={`vs-cloned-row__replay${isReplaying ? " is-playing" : ""}`}
                      aria-label={
                        isReplaying
                          ? `Pause ${v.name}`
                          : `Réécouter l’extrait de ${v.name}`
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
          </section>
        ) : null}

        <VoiceHistorySection
          enabled={Boolean(user)}
          onPlay={() => stopPreview()}
          onStop={() => stopPreview()}
        />
      </div>

      {isGenerating ? (
        <div className="vs-gen-overlay" role="status" aria-live="polite">
          <div className="vs-gen-overlay__card">
            <div className="vs-gen-overlay__spinner" aria-hidden />
            <p className="vs-gen-overlay__msg">
              {GEN_MESSAGES[genMessageIndex]}
            </p>
          </div>
        </div>
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
