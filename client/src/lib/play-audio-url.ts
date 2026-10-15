/** Attend que l'audio soit prêt ou timeout (évite play() bloqué / spinner infini). */
export function waitForAudioReady(
  audio: HTMLAudioElement,
  timeoutMs = 4000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      resolve();
      return;
    }

    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("audio_load_timeout"));
    }, timeoutMs);

    const onReady = () => {
      cleanup();
      resolve();
    };
    const onErr = () => {
      cleanup();
      reject(new Error("audio_load_error"));
    };
    const cleanup = () => {
      window.clearTimeout(timer);
      audio.removeEventListener("canplaythrough", onReady);
      audio.removeEventListener("error", onErr);
    };

    audio.addEventListener("canplaythrough", onReady, { once: true });
    audio.addEventListener("error", onErr, { once: true });
    audio.load();
  });
}

export async function playAudioUrl(
  audio: HTMLAudioElement,
  url: string,
  timeoutMs = 4000,
): Promise<void> {
  audio.src = url;
  await waitForAudioReady(audio, timeoutMs);
  await audio.play();
}
