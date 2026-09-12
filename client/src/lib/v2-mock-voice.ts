import catalog from "@shared/voice-catalog.json";

export type VoiceCategory =
  | "Rap"
  | "Homme"
  | "Femme"
  | "Actrice"
  | "Cinéma"
  | "Musique"
  | "Sport"
  | "Politique"
  | "Business"
  | "Médias"
  | "Influenceur";

export type VoiceGender = "homme" | "femme";

export type MockVoiceProfile = {
  id: string;
  name: string;
  description: string;
  durationLabel: string;
  isDefault?: boolean;
  catalog?: boolean;
  category?: VoiceCategory;
  gender?: VoiceGender;
  initials?: string;
  accent?: string;
  /** Photo catalogue (optionnel). */
  photoUrl?: string;
  /** Phrase FIXE d’aperçu — jamais le texte utilisateur. */
  sampleText?: string;
  pitch?: number;
  rate?: number;
  /** Extrait MP3 reel de la voix (Fish Audio). */
  sampleUrl?: string;
  /** Modele Fish Audio a reutiliser pour generer avec cette voix. */
  fishReferenceId?: string;
};

export type MockVoiceGeneration = {
  id: string;
  title: string;
  voiceName: string;
  textPreview: string;
  durationLabel: string;
  createdAt: string;
  waveformSeed: number;
};

export type ClonedVoice = {
  id: string;
  name: string;
  source: "record" | "import";
  sourceLabel: string;
  createdAt: string;
};

/** Phrase unique pour tous les aperçus catalogue (identique côté Fish TTS). */
export const CATALOG_SAMPLE_LINE =
  "Ce soir, direction Dubai Marina. La suite est réservée, la soirée aussi.";

export type CatalogPreviewCallbacks = {
  onLoading?: () => void;
  onPlaying?: () => void;
  onEnd?: () => void;
};

const ACCENTS = [
  "linear-gradient(145deg, #1a1a1a, #5c4a2a)",
  "linear-gradient(145deg, #3d2a45, #c9a227)",
  "linear-gradient(145deg, #0f2a1f, #8b6914)",
  "linear-gradient(145deg, #4a3428, #d4af37)",
  "linear-gradient(145deg, #1e2430, #6b5a3a)",
  "linear-gradient(145deg, #2a1f28, #b78b32)",
  "linear-gradient(145deg, #1a1208, #c9a227)",
  "linear-gradient(145deg, #3a2218, #e8c56a)",
  "linear-gradient(145deg, #142028, #9a7b3a)",
  "linear-gradient(145deg, #2c1830, #d4af37)",
  "linear-gradient(145deg, #101818, #a89050)",
  "linear-gradient(145deg, #241810, #c9a227)",
];

export function catalogPhotoForSlug(slug: string): string {
  const entry = catalog.entries.find((item) => item.slug === slug);
  if (entry?.photo) return `/assets/voice-catalog/${entry.photo}`;
  return `/assets/voice-catalog/${slug}.jpg`;
}

export function slugFromCatalogVoiceId(voiceId: string): string | null {
  const match = String(voiceId).match(/^cat-(.+)$/);
  return match?.[1] ?? null;
}

function initialsFrom(name: string, override?: string): string {
  if (override) return override;
  const parts = name.replace(/\./g, "").split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const MOCK_VOICE_CATALOG: MockVoiceProfile[] = catalog.entries.map(
  (seed, index) => ({
    id: `cat-${seed.slug}`,
    name: seed.name,
    description: seed.description,
    durationLabel: "0:06",
    catalog: true,
    category: seed.category as VoiceCategory,
    gender: seed.gender as VoiceGender,
    initials: initialsFrom(seed.name, seed.initials),
    accent: seed.accent ?? ACCENTS[index % ACCENTS.length],
    photoUrl: seed.photo ? `/assets/voice-catalog/${seed.photo}` : undefined,
    sampleText: CATALOG_SAMPLE_LINE,
    pitch: seed.pitch,
    rate: seed.rate,
    sampleUrl: `/assets/voice-catalog/samples/${seed.slug}.mp3`,
    fishReferenceId: seed.fishId,
  }),
);

export type VoiceCatalogFilter = "Tous" | "Homme" | "Femme" | "Rap";

export const VOICE_CATALOG_FILTERS: VoiceCatalogFilter[] = [
  "Tous",
  "Homme",
  "Femme",
  "Rap",
];

export const MOCK_VOICE_PROFILES: MockVoiceProfile[] = [
  {
    id: "voice-1",
    name: "Voix principale",
    description: "Ton naturel — enregistrée",
    durationLabel: "0:24",
    isDefault: true,
  },
  {
    id: "voice-2",
    name: "Voix studio",
    description: "Importée — extrait net",
    durationLabel: "0:18",
  },
  ...MOCK_VOICE_CATALOG,
];

export const MOCK_VOICE_GENERATIONS: MockVoiceGeneration[] = [
  {
    id: "gen-1",
    title: "Accroche lifestyle",
    voiceName: "Voix principale",
    textPreview:
      "Ce soir, direction Dubai Marina. La suite est réservée, la soirée aussi.",
    durationLabel: "0:12",
    createdAt: "2026-08-26T18:40:00.000Z",
    waveformSeed: 11,
  },
  {
    id: "gen-2",
    title: "Story Snap",
    voiceName: "Voix studio",
    textPreview: "Nouvelle acquisition. Même énergie, autre niveau.",
    durationLabel: "0:08",
    createdAt: "2026-08-25T09:15:00.000Z",
    waveformSeed: 27,
  },
  {
    id: "gen-3",
    title: "Message premium",
    voiceName: "Voix principale",
    textPreview: "Merci pour votre confiance. On se retrouve très vite.",
    durationLabel: "0:15",
    createdAt: "2026-08-23T21:05:00.000Z",
    waveformSeed: 42,
  },
];

export function mockWaveformBars(seed: number, count = 48): number[] {
  const bars: number[] = [];
  let x = seed * 9301 + 49297;
  for (let i = 0; i < count; i += 1) {
    x = (x * 233280 + 49297) % 233280;
    const t = i / count;
    const envelope = 0.35 + Math.sin(t * Math.PI) * 0.55;
    const noise = (x % 1000) / 1000;
    bars.push(Math.max(0.12, Math.min(1, envelope * (0.4 + noise * 0.9))));
  }
  return bars;
}

/**
 * Lecteur unique partagé par tout le catalogue : démarrer une voix coupe
 * toujours la précédente, sinon deux extraits se superposent.
 */
let catalogAudio: HTMLAudioElement | null = null;
let catalogToken = 0;
let catalogOnEnd: (() => void) | null = null;

const previewUrlCache = new Map<string, string>();
const previewUrlInflight = new Map<string, Promise<string | null>>();
const preloadedAudioByUrl = new Map<string, HTMLAudioElement>();

function configureMobileAudio(audio: HTMLAudioElement) {
  audio.preload = "auto";
  audio.setAttribute("playsinline", "true");
  audio.setAttribute("webkit-playsinline", "true");
}

function finishCatalogAudio() {
  const callback = catalogOnEnd;
  catalogOnEnd = null;
  callback?.();
}

export function stopCatalogSample(): void {
  catalogToken += 1;
  catalogOnEnd = null;
  if (catalogAudio) {
    catalogAudio.pause();
    try {
      catalogAudio.currentTime = 0;
    } catch {
      /* pas encore prêt */
    }
  }
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
}

async function fetchUnifiedCatalogPreviewUrl(
  fishReferenceId: string,
): Promise<string | null> {
  const cached = previewUrlCache.get(fishReferenceId);
  if (cached) return cached;

  const inflight = previewUrlInflight.get(fishReferenceId);
  if (inflight) return inflight;

  const request = (async () => {
    try {
      const params = new URLSearchParams({ fish_id: fishReferenceId });
      const res = await fetch(`/api/larps/voice/catalog-preview?${params}`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { audioUrl?: string };
      const audioUrl =
        typeof json.audioUrl === "string" && json.audioUrl ? json.audioUrl : null;
      if (audioUrl) previewUrlCache.set(fishReferenceId, audioUrl);
      return audioUrl;
    } catch {
      return null;
    } finally {
      previewUrlInflight.delete(fishReferenceId);
    }
  })();

  previewUrlInflight.set(fishReferenceId, request);
  return request;
}

function preloadCatalogAudioUrl(url: string): Promise<void> {
  const existing = preloadedAudioByUrl.get(url);
  if (existing && existing.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let audio = preloadedAudioByUrl.get(url);
    if (!audio) {
      audio = new Audio();
      configureMobileAudio(audio);
      preloadedAudioByUrl.set(url, audio);
    }

    const done = () => {
      audio?.removeEventListener("canplaythrough", done);
      audio?.removeEventListener("error", done);
      resolve();
    };

    if (audio.src === url && audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      resolve();
      return;
    }

    audio.addEventListener("canplaythrough", done, { once: true });
    audio.addEventListener("error", done, { once: true });
    audio.src = url;
    audio.load();
  });
}

/** Précharge les extraits locaux (+ cache Fish unifié en arrière-plan). */
export function prefetchCatalogPreviews(
  profiles: Array<Pick<MockVoiceProfile, "fishReferenceId" | "sampleUrl">>,
): void {
  if (typeof window === "undefined") return;

  for (const profile of profiles) {
    if (profile.sampleUrl) {
      void preloadCatalogAudioUrl(profile.sampleUrl);
    }
    const fishReferenceId = profile.fishReferenceId;
    if (!fishReferenceId) continue;
    void fetchUnifiedCatalogPreviewUrl(fishReferenceId).then((url) => {
      if (url) void preloadCatalogAudioUrl(url);
    });
  }
}

function resolveCatalogPreviewCallbacks(
  onEndOrCallbacks?: (() => void) | CatalogPreviewCallbacks,
): CatalogPreviewCallbacks {
  if (typeof onEndOrCallbacks === "function") {
    return { onEnd: onEndOrCallbacks };
  }
  return onEndOrCallbacks ?? {};
}

function isAudioReadyForPlayback(audio: HTMLAudioElement, url: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const expected = new URL(url, window.location.origin).href;
    const current = audio.currentSrc || audio.src;
    return (
      current === expected && audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA
    );
  } catch {
    return false;
  }
}

function playCatalogAudio(
  url: string,
  callbacks: CatalogPreviewCallbacks,
): () => void {
  stopCatalogSample();

  const token = catalogToken;
  let cancelled = false;
  let started = false;

  const notifyPlaying = () => {
    if (started || cancelled || token !== catalogToken) return;
    started = true;
    callbacks.onPlaying?.();
  };

  const finish = () => {
    if (token !== catalogToken) return;
    finishCatalogAudio();
  };

  const startPlayback = (audio: HTMLAudioElement) => {
    if (cancelled || token !== catalogToken) return;

    catalogAudio = audio;
    catalogOnEnd = callbacks.onEnd ?? null;

    if (!audio.dataset.catalogBound) {
      audio.dataset.catalogBound = "1";
      audio.addEventListener("ended", finishCatalogAudio);
      audio.addEventListener("error", finishCatalogAudio);
    }

    const onPlaying = () => {
      audio.removeEventListener("playing", onPlaying);
      notifyPlaying();
    };
    audio.addEventListener("playing", onPlaying);

    try {
      audio.currentTime = 0;
    } catch {
      /* ignore */
    }

    void audio.play().then(() => {
      if (audio.currentTime > 0 && !started) notifyPlaying();
    }).catch(() => {
      if (token === catalogToken) finish();
    });
  };

  const preloaded = preloadedAudioByUrl.get(url);
  if (preloaded && isAudioReadyForPlayback(preloaded, url)) {
    startPlayback(preloaded);
    return () => {
      cancelled = true;
      if (token === catalogToken) stopCatalogSample();
    };
  }

  callbacks.onLoading?.();

  void (async () => {
    await preloadCatalogAudioUrl(url);
    if (cancelled || token !== catalogToken) return;

    const cached = preloadedAudioByUrl.get(url);
    if (cached) {
      startPlayback(cached);
      return;
    }

    const audio = new Audio();
    configureMobileAudio(audio);
    preloadedAudioByUrl.set(url, audio);
    audio.src = url;
    startPlayback(audio);
  })();

  return () => {
    cancelled = true;
    if (token === catalogToken) stopCatalogSample();
  };
}

/**
 * Aperçu catalogue UNIQUEMENT — même phrase et même modèle Fish que la génération.
 */
export function speakCatalogSample(
  profile: Pick<
    MockVoiceProfile,
    "name" | "pitch" | "rate" | "sampleUrl" | "fishReferenceId"
  >,
  onEndOrCallbacks?: (() => void) | CatalogPreviewCallbacks,
): () => void {
  const callbacks = resolveCatalogPreviewCallbacks(onEndOrCallbacks);
  let cancelled = false;

  const cancel = () => {
    cancelled = true;
    stopCatalogSample();
  };

  if (profile.fishReferenceId) {
    void fetchUnifiedCatalogPreviewUrl(profile.fishReferenceId);
  }

  if (profile.sampleUrl) {
    return playCatalogAudio(profile.sampleUrl, callbacks);
  }

  if (profile.fishReferenceId) {
    void (async () => {
      const unifiedUrl = await fetchUnifiedCatalogPreviewUrl(
        profile.fishReferenceId!,
      );
      if (cancelled) return;
      if (unifiedUrl) {
        playCatalogAudio(unifiedUrl, callbacks);
        return;
      }
      callbacks.onPlaying?.();
      speakRaw(
        {
          text: CATALOG_SAMPLE_LINE,
          pitch: profile.pitch ?? 1,
          rate: profile.rate ?? 1,
        },
        callbacks.onEnd,
      );
    })();
    return cancel;
  }
  callbacks.onPlaying?.();
  return speakRaw(
    {
      text: CATALOG_SAMPLE_LINE,
      pitch: profile.pitch ?? 1,
      rate: profile.rate ?? 1,
    },
    callbacks.onEnd,
  );
}

/**
 * Lecture d’un texte custom — à n’appeler QUE si l’utilisateur a payé / crédits.
 */
export function speakPaidCustomText(
  opts: { text: string; pitch?: number; rate?: number },
  onEnd?: () => void,
): () => void {
  const cleaned = opts.text.trim().slice(0, 220);
  if (!cleaned) {
    onEnd?.();
    return () => undefined;
  }
  return speakRaw(
    {
      text: cleaned,
      pitch: opts.pitch ?? 1,
      rate: opts.rate ?? 1,
    },
    onEnd,
  );
}

function speakRaw(
  opts: { text: string; pitch: number; rate: number },
  onEnd?: () => void,
): () => void {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onEnd?.();
    return () => undefined;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(opts.text);
  utterance.lang = "fr-FR";
  utterance.pitch = opts.pitch;
  utterance.rate = opts.rate;
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
  return () => {
    window.speechSynthesis.cancel();
  };
}

/** @deprecated use speakCatalogSample — ne pas parler de texte utilisateur. */
export function speakMockVoice(
  profile: Pick<MockVoiceProfile, "sampleText" | "pitch" | "rate" | "name">,
  onEnd?: () => void,
): () => void {
  return speakCatalogSample(profile, onEnd);
}
