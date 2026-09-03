/**
 * Single shared player for catalog / clone previews.
 *
 * One <audio> element for the whole app: starting a preview always stops the
 * previous one, so two voices can never talk over each other. Never uses
 * window.speechSynthesis (that was the robotic female voice).
 */

let audio: HTMLAudioElement | null = null;
let activeId: string | null = null;
let activeToken = 0;
let onEndedCurrent: (() => void) | null = null;

function ensureAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.preload = "auto";
    audio.addEventListener("ended", handleStop);
    audio.addEventListener("error", handleStop);
  }
  return audio;
}

function handleStop() {
  const callback = onEndedCurrent;
  activeId = null;
  onEndedCurrent = null;
  callback?.();
}

export function stopVoicePreview(): void {
  activeToken += 1;
  activeId = null;
  onEndedCurrent = null;
  if (audio) {
    audio.pause();
    try {
      audio.currentTime = 0;
    } catch {
      /* not seekable yet */
    }
  }
}

export function playVoicePreview(
  id: string,
  url: string,
  onEnded?: () => void,
): () => void {
  // Kill whatever is playing before starting the new voice.
  stopVoicePreview();

  const player = ensureAudio();
  const token = ++activeToken;
  activeId = id;
  onEndedCurrent = onEnded ?? null;

  player.src = url;
  player.currentTime = 0;
  void player.play().catch(() => {
    // Autoplay blocked or bad file: only clear if still the current request.
    if (token === activeToken) handleStop();
  });

  return () => {
    if (token === activeToken) stopVoicePreview();
  };
}

export function getPlayingPreviewId(): string | null {
  return activeId;
}
