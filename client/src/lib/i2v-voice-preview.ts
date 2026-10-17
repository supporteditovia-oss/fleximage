import { authFetch } from "@/lib/api";

type PreviewCallbacks = {
  onLoading?: () => void;
  onPlaying?: () => void;
  onEnd?: () => void;
  onError?: () => void;
};

const urlCache = new Map<string, string>();
const urlInflight = new Map<string, Promise<string | null>>();
const preloadedByUrl = new Map<string, HTMLAudioElement>();

let activeToken = 0;
let activeAudio: HTMLAudioElement | null = null;
let activeOnEnd: (() => void) | null = null;

function cacheKey(fishId: string): string {
  return fishId.toLowerCase();
}

function configureAudio(audio: HTMLAudioElement) {
  audio.preload = "auto";
  audio.setAttribute("playsinline", "true");
  audio.setAttribute("webkit-playsinline", "true");
}

export function stopI2VVoicePreview(): void {
  activeToken += 1;
  activeOnEnd = null;
  if (activeAudio) {
    activeAudio.pause();
    try {
      activeAudio.currentTime = 0;
    } catch {
      /* ignore */
    }
  }
}

async function fetchPreviewUrl(fishId: string): Promise<string | null> {
  const key = cacheKey(fishId);
  const hit = urlCache.get(key);
  if (hit) return hit;

  const pending = urlInflight.get(key);
  if (pending) return pending;

  const request = (async () => {
    try {
      const params = new URLSearchParams({
        fish_id: fishId,
        lang: "fr",
        i2v: "1",
      });
      const res = await authFetch(
        `/api/larps/voice/catalog-preview?${params.toString()}`,
      );
      if (!res.ok) return null;
      const json = (await res.json()) as {
        audioUrl?: string;
        fishId?: string;
      };
      const audioUrl =
        typeof json.audioUrl === "string" && json.audioUrl.trim()
          ? json.audioUrl.trim()
          : null;
      if (audioUrl) urlCache.set(key, audioUrl);
      return audioUrl;
    } catch {
      return null;
    } finally {
      urlInflight.delete(key);
    }
  })();

  urlInflight.set(key, request);
  return request;
}

function preloadUrl(url: string): Promise<void> {
  const existing = preloadedByUrl.get(url);
  if (existing && existing.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let audio = preloadedByUrl.get(url);
    if (!audio) {
      audio = new Audio();
      configureAudio(audio);
      preloadedByUrl.set(url, audio);
    }

    const done = () => {
      audio?.removeEventListener("canplaythrough", done);
      audio?.removeEventListener("error", done);
      resolve();
    };

    if (
      audio.src === url &&
      audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA
    ) {
      resolve();
      return;
    }

    audio.addEventListener("canplaythrough", done, { once: true });
    audio.addEventListener("error", done, { once: true });
    audio.src = url;
    audio.load();
  });
}

export function prefetchI2VVoicePreviews(fishIds: string[]): void {
  if (typeof window === "undefined") return;
  for (const fishId of fishIds) {
    if (!/^[a-f0-9]{32}$/i.test(fishId)) continue;
    void fetchPreviewUrl(fishId).then((url) => {
      if (url) void preloadUrl(url);
    });
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

  callbacks.onLoading?.();

  void (async () => {
    const url = await fetchPreviewUrl(fishId);
    if (cancelled || token !== activeToken) return;
    if (!url) {
      callbacks.onError?.();
      return;
    }

    await preloadUrl(url);
    if (cancelled || token !== activeToken) return;

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
