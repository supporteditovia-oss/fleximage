export type VoiceCategory =
  | "Rap"
  | "Actrice"
  | "Cinéma"
  | "Musique"
  | "Sport"
  | "Politique"
  | "Business"
  | "Médias"
  | "Influenceur";

export type MockVoiceProfile = {
  id: string;
  name: string;
  description: string;
  durationLabel: string;
  isDefault?: boolean;
  catalog?: boolean;
  category?: VoiceCategory;
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

type Seed = {
  slug: string;
  name: string;
  category: VoiceCategory;
  description: string;
  pitch: number;
  rate: number;
};

/** Photos validées manuellement — extension peut varier (jpg/png/webp). */
const MANUAL_PHOTO_FILES: Partial<Record<string, string>> = {
  maes: "maes.jpg",
  gazo: "gazo.webp",
  damso: "damso.webp",
  dadju: "dadju.png",
  kaaris: "kaaris.jpg",
  tiakola: "tiakola.jpg",
  ninho: "ninho.jpg",
  niska: "niska.jpg",
  plk: "plk.jpg",
  sdm: "sdm.webp",
};

function catalogPhoto(slug: string): string {
  const file = MANUAL_PHOTO_FILES[slug] ?? `${slug}.jpg`;
  return `/assets/voice-catalog/${file}`;
}

/** Catalogue voix — noms publics + photo locale (script/fetch-voice-catalog-photos.mjs). */

/** Modeles publics Fish Audio : vraie voix de l'artiste. */
const CATALOG_FISH_IDS: Partial<Record<string, string>> = {
  maes: "22b7c6809d5d405aa6a5ae2402272b53",
  gims: "d986afc13e7346ada353a747bce8a811",
  damso: "cd8c1c3eead843c2b6b855cace16f520",
  ninho: "3cfa191ad09b4cfea8e4eebc4c31c923",
  booba: "82ec8e836aaf47aaae8bfb52f3d744b2",
  jul: "66754cdcb9554e62bdff1ab6446dc78d",
  sch: "d4b887e7013045bcba9bc9bb2fe2d3d5",
  gazo: "0ff4b00e39e2429981b93bd7c6256d98",
  niska: "6be490a175744894826dd464cf3a5004",
  plk: "c9188f639648467f8f1c513b0dbac9f7",
  kaaris: "30679093939d4335b780f6d45709de08",
  sdm: "0a011b2e359e4b5580f0e46764795c3c",
  tiakola: "38aca316167d449288bab317c60cd70b",
};

/** Extrait officiel du modele, servi en local. */
function catalogSampleUrl(slug: string): string | undefined {
  return CATALOG_FISH_IDS[slug]
    ? `/assets/voice-catalog/samples/${slug}.mp3`
    : undefined;
}
const CATALOG_SEEDS: Seed[] = [
  // Rap
  { slug: "maes", name: "Maes", category: "Rap", description: "Rap FR — street", pitch: 0.78, rate: 0.95 },
  { slug: "gims", name: "Maître Gims", category: "Rap", description: "Pop urbaine", pitch: 0.88, rate: 1.0 },
  { slug: "damso", name: "Damso", category: "Rap", description: "Flow introspectif", pitch: 0.72, rate: 0.92 },
  { slug: "ninho", name: "Ninho", category: "Rap", description: "Meltrap", pitch: 0.8, rate: 1.02 },
  { slug: "booba", name: "Booba", category: "Rap", description: "Légende du rap FR", pitch: 0.7, rate: 0.9 },
  { slug: "jul", name: "Jul", category: "Rap", description: "Marseille — energie", pitch: 0.82, rate: 1.06 },
  { slug: "sch", name: "SCH", category: "Rap", description: "Voix grave", pitch: 0.68, rate: 0.88 },
  { slug: "gazo", name: "Gazo", category: "Rap", description: "Drill FR", pitch: 0.76, rate: 1.04 },
  { slug: "niska", name: "Niska", category: "Rap", description: "Trap Paris", pitch: 0.74, rate: 1.0 },
  { slug: "plk", name: "PLK", category: "Rap", description: "Cloud rap", pitch: 0.8, rate: 0.98 },
  { slug: "kaaris", name: "Kaaris", category: "Rap", description: "Trap hard", pitch: 0.69, rate: 0.94 },
  { slug: "sdm", name: "SDM", category: "Rap", description: "Rap Parisien", pitch: 0.73, rate: 1.0 },
  { slug: "tiakola", name: "Tiakola", category: "Rap", description: "Afro trap", pitch: 0.81, rate: 1.04 },
];

function initialsFrom(name: string): string {
  const parts = name.replace(/\./g, "").split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const MOCK_VOICE_CATALOG: MockVoiceProfile[] = CATALOG_SEEDS.map(
  (seed, index) => ({
    id: `cat-${seed.slug}`,
    name: seed.name,
    description: seed.description,
    durationLabel: "0:06",
    catalog: true,
    category: seed.category,
    initials: initialsFrom(seed.name),
    accent: ACCENTS[index % ACCENTS.length],
    photoUrl: catalogPhoto(seed.slug),
    sampleText: CATALOG_SAMPLE_LINE,
    pitch: seed.pitch,
    rate: seed.rate,
    sampleUrl: catalogSampleUrl(seed.slug),
    fishReferenceId: CATALOG_FISH_IDS[seed.slug],
  }),
);

export const VOICE_CATALOG_FILTERS: Array<"Tous" | VoiceCategory> = [
  "Tous",
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

/** Précharge les aperçus catalogue en arrière-plan (lecture instantanée au clic). */
export function prefetchCatalogPreviews(
  profiles: Array<Pick<MockVoiceProfile, "fishReferenceId">>,
): void {
  if (typeof window === "undefined") return;

  for (const profile of profiles) {
    const fishReferenceId = profile.fishReferenceId;
    if (!fishReferenceId) continue;

    void (async () => {
      const url = await fetchUnifiedCatalogPreviewUrl(fishReferenceId);
      if (url) await preloadCatalogAudioUrl(url);
    })();
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

function playCatalogAudio(
  url: string,
  callbacks: CatalogPreviewCallbacks,
): () => void {
  stopCatalogSample();
  callbacks.onLoading?.();

  const token = ++catalogToken;
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

  void (async () => {
    await preloadCatalogAudioUrl(url);
    if (cancelled || token !== catalogToken) return;

    const preloaded = preloadedAudioByUrl.get(url);
    if (preloaded) {
      startPlayback(preloaded);
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
    void (async () => {
      const unifiedUrl = await fetchUnifiedCatalogPreviewUrl(
        profile.fishReferenceId!,
      );
      if (cancelled) return;

      if (unifiedUrl) {
        playCatalogAudio(unifiedUrl, callbacks);
        return;
      }
      if (profile.sampleUrl) {
        playCatalogAudio(profile.sampleUrl, callbacks);
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

  if (profile.sampleUrl) {
    return playCatalogAudio(profile.sampleUrl, callbacks);
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
