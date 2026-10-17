type PreviewCallbacks = {
  onLoading?: () => void;
  onPlaying?: () => void;
  onEnd?: () => void;
  onError?: () => void;
};

const preloadedByUrl = new Map<string, HTMLAudioElement>();

let activeToken = 0;
let activeAudio: HTMLAudioElement | null = null;
let activeOnEnd: (() => void) | null = null;

function configureAudio(audio: HTMLAudioElement) {
  audio.preload = "auto";
  audio.setAttribute("playsinline", "true");
  audio.setAttribute("webkit-playsinline", "true");
}

/** Lecture same-origin — évite CORS R2 et HEAD cache faux positifs. */
export function fishVoicePreviewStreamUrl(fishId: string, lang = "fr"): string {
  const params = new URLSearchParams({
    fish_id: fishId.toLowerCase(),
    lang,
    media: "1",
  });
  return `/api/larps/voice/catalog-preview?${params.toString()}`;
}

export function stopI2VVoicePreview(): void {
  activeToken += 1;
  activeOnEnd = null;
  if (activeAudio) {
    audioPauseReset(activeAudio);
  }
}

function audioPauseReset(audio: HTMLAudioElement) {
  audio.pause();
  try {
    audio.currentTime = 0;
  } catch {
    /* ignore */
  }
}

function preloadUrl(url: string): Promise<boolean> {
  const existing = preloadedByUrl.get(url);
  if (existing && existing.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    let audio = preloadedByUrl.get(url);
    if (!audio) {
      audio = new Audio();
      configureAudio(audio);
      preloadedByUrl.set(url, audio);
    }

    const done = (ok: boolean) => {
      audio?.removeEventListener("canplaythrough", onReady);
      audio?.removeEventListener("error", onFail);
      resolve(ok);
    };
    const onReady = () => done(true);
    const onFail = () => done(false);

    if (
      audio.src === url &&
      audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA
    ) {
      resolve(true);
      return;
    }

    audio.addEventListener("canplaythrough", onReady, { once: true });
    audio.addEventListener("error", onFail, { once: true });
    audio.src = url;
    audio.load();
  });
}

export function prefetchI2VVoicePreviews(fishIds: string[]): void {
  if (typeof window === "undefined") return;
  for (const fishId of fishIds) {
    if (!/^[a-f0-9]{32}$/i.test(fishId)) continue;
    void preloadUrl(fishVoicePreviewStreamUrl(fishId));
  }
}

export function playI2VVoicePreview(
  fishId: string,
  callbacks: PreviewCallbacks = {},
): () => void {
  stopI2VVoicePreview();
  const token = activeToken;
  let cancelled = false;

  const finish = () => {
    if (token !== activeToken) return;
    const cb = activeOnEnd;
    activeOnEnd = null;
    cb?.();
  };

  const cancel = () => {
    cancelled = true;
    stopI2VVoicePreview();
  };

  if (!/^[a-f0-9]{32}$/i.test(fishId)) {
    callbacks.onError?.();
    return cancel;
  }

  const url = fishVoicePreviewStreamUrl(fishId);
  callbacks.onLoading?.();

  void (async () => {
    const ok = await preloadUrl(url);
    if (cancelled || token !== activeToken) return;
    if (!ok) {
      callbacks.onError?.();
      return;
    }

    let audio = preloadedByUrl.get(url);
    if (!audio) {
      audio = new Audio();
      configureAudio(audio);
      preloadedByUrl.set(url, audio);
      audio.src = url;
    }

    activeAudio = audio;
    activeOnEnd = callbacks.onEnd ?? null;

    const onPlaying = () => {
      audio?.removeEventListener("playing", onPlaying);
      callbacks.onPlaying?.();
    };
    audio.addEventListener("playing", onPlaying);
    audio.onended = finish;
    audio.onerror = () => {
      callbacks.onError?.();
      finish();
    };

    try {
      audio.currentTime = 0;
    } catch {
      /* ignore */
    }

    try {
      await audio.play();
    } catch {
      callbacks.onError?.();
      finish();
    }
  })();

  return cancel;
}
