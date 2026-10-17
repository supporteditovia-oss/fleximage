/**
 * Déverrouille la lecture après une génération longue (politique autoplay navigateur).
 * Appeler de façon synchrone sur le clic « Générer », puis lire le MP3 via Web Audio.
 */

let playbackContext: AudioContext | null = null;

function getOrCreateContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return null;
  if (!playbackContext) {
    playbackContext = new Ctx();
  }
  return playbackContext;
}

/** À appeler dans le gestionnaire de clic utilisateur (avant tout await long). */
export function primeVoiceResultPlayback(): void {
  const ctx = getOrCreateContext();
  if (!ctx) return;
  void ctx.resume();
}

export type VoiceResultPlaybackSession = {
  stop: () => void;
};

export async function startVoiceResultPlayback(
  blob: Blob,
  onTick: (currentSec: number, durationSec: number) => void,
  onEnded: () => void,
): Promise<VoiceResultPlaybackSession | null> {
  const ctx = getOrCreateContext();
  if (!ctx) return null;

  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return null;
    }
  }

  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(ctx.destination);

  const duration = audioBuffer.duration;
  const startedAt = ctx.currentTime;
  let timer: number | null = window.setInterval(() => {
    const elapsed = Math.min(ctx.currentTime - startedAt, duration);
    onTick(elapsed, duration);
  }, 200);

  const stop = () => {
    if (timer != null) {
      window.clearInterval(timer);
      timer = null;
    }
    try {
      source.stop();
    } catch {
      /* déjà arrêté */
    }
    try {
      source.disconnect();
    } catch {
      /* no-op */
    }
  };

  source.onended = () => {
    if (timer != null) {
      window.clearInterval(timer);
      timer = null;
    }
    onTick(duration, duration);
    onEnded();
  };

  source.start(0);
  onTick(0, duration);
  return { stop };
}
