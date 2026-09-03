/**
 * Play a catalog / clone preview from a real audio URL.
 * Never uses window.speechSynthesis (that caused the female robot voice).
 */

let activeAudio: HTMLAudioElement | null = null;
let activeId: string | null = null;

export function stopVoicePreview(): void {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.src = "";
    activeAudio = null;
  }
  activeId = null;
}

export function playVoicePreview(
  id: string,
  url: string,
  onEnded?: () => void,
): () => void {
  stopVoicePreview();
  const audio = new Audio(url);
  audio.preload = "auto";
  activeAudio = audio;
  activeId = id;

  const finish = () => {
    if (activeId === id) {
      activeAudio = null;
      activeId = null;
    }
    onEnded?.();
  };

  audio.addEventListener("ended", finish);
  audio.addEventListener("error", finish);
  void audio.play().catch(() => finish());

  return () => {
    if (activeId === id) stopVoicePreview();
  };
}

export function getPlayingPreviewId(): string | null {
  return activeId;
}
