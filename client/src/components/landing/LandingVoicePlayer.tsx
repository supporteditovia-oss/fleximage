import { useEffect, useMemo, useRef, useState } from "react";
import {
  LANDING_VOICE_DEMO_API,
  LANDING_VOICE_DEMO_NAME,
  LANDING_VOICE_DEMO_PHOTO,
  LANDING_VOICE_DEMO_SCRIPT,
  LANDING_VOICE_DEMO_SRC,
  formatVoiceClock,
  splitSubtitleWords,
  spokenWordCount,
} from "@/lib/landing-voice-demo";

async function resolveLandingVoiceDemoSrc(): Promise<string> {
  try {
    const head = await fetch(LANDING_VOICE_DEMO_SRC, { method: "HEAD" });
    if (head.ok) return LANDING_VOICE_DEMO_SRC;
  } catch {
    /* fallback API */
  }

  const res = await fetch(LANDING_VOICE_DEMO_API);
  if (!res.ok) return LANDING_VOICE_DEMO_SRC;
  const data = (await res.json()) as { audioUrl?: string };
  return data.audioUrl?.trim() || LANDING_VOICE_DEMO_SRC;
}

const WAVE = [10, 16, 9, 22, 14, 27, 17, 11, 23, 31, 18, 12, 25, 19, 8, 17, 29, 20, 12, 24, 14, 9, 19, 12];

type LandingVoicePlayerProps = {
  variant?: "widget" | "section";
};

function SubtitleBlock({ words, visibleWords }: { words: string[]; visibleWords: number }) {
  return (
    <div className="landing-voice-subtitles" aria-live="polite">
      <p className="landing-voice-subtitles__label">Sous-titres</p>
      <p className="landing-voice-subtitles__text">
        {words.map((word, i) => (
          <span
            key={`${word}-${i}`}
            className={
              i < visibleWords
                ? "landing-voice-subtitles__word is-spoken"
                : "landing-voice-subtitles__word"
            }
          >
            {word}
            {i < words.length - 1 ? " " : ""}
          </span>
        ))}
      </p>
    </div>
  );
}

export function LandingVoicePlayer({ variant = "widget" }: LandingVoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentSec, setCurrentSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);

  const words = useMemo(() => splitSubtitleWords(LANDING_VOICE_DEMO_SCRIPT), []);
  const visibleWords = spokenWordCount(currentSec, durationSec, words.length);

  useEffect(() => {
    let cancelled = false;
    const audio = new Audio();
    audio.preload = "metadata";

    const onTime = () => setCurrentSec(audio.currentTime);
    const onMeta = () => setDurationSec(audio.duration || 0);
    const onEnded = () => {
      setPlaying(false);
      setCurrentSec(0);
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnded);
    audioRef.current = audio;

    void (async () => {
      const src = await resolveLandingVoiceDemoSrc();
      if (cancelled) return;
      audio.src = src;
      audio.load();
    })();

    return () => {
      cancelled = true;
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnded);
      audioRef.current = null;
    };
  }, []);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    if (audio.currentTime >= (durationSec || audio.duration) - 0.05) {
      audio.currentTime = 0;
      setCurrentSec(0);
    }
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  };

  if (variant === "section") {
    return (
      <div className={`voice-card voice-card--premium ${playing ? "is-playing" : ""}`}>
        <div className="voice-card-top voice-card-top--premium">
          <div className="voice-avatar voice-avatar--photo">
            <img src={LANDING_VOICE_DEMO_PHOTO} alt="" loading="lazy" />
          </div>
          <div>
            <strong>{LANDING_VOICE_DEMO_NAME}</strong>
            <span>Généré par LuxeFlexIA · Clonage IA · Français</span>
          </div>
          <span className="voice-badge voice-badge--live">Exemple</span>
        </div>
        <SubtitleBlock words={words} visibleWords={visibleWords} />
        <div className="voice-player voice-player--premium">
          <button
            type="button"
            aria-label={playing ? "Mettre en pause" : "Écouter la démo vocale"}
            aria-pressed={playing}
            onClick={() => void toggle()}
          >
            {playing ? "❚❚" : "▶"}
          </button>
          <div className="voice-wave" aria-hidden>
            {WAVE.map((h, i) => (
              <i key={i} style={{ height: `${h}px` }} />
            ))}
          </div>
          <span>
            {formatVoiceClock(currentSec)} / {formatVoiceClock(durationSec || 12)}
          </span>
        </div>
        <div className="voice-card-footer voice-card-footer--premium">
          <span>Clonage IA</span>
          <i />
          <span>Naturel</span>
          <i />
          <span>LuxeFlexIA</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`landing-voice-demo landing-voice-demo--premium ${playing ? "is-playing" : ""}`}>
      <div className="landing-voice-demo__head landing-voice-demo__head--premium">
        <img
          className="landing-voice-demo__thumb"
          src={LANDING_VOICE_DEMO_PHOTO}
          alt=""
          loading="lazy"
        />
        <div className="landing-voice-demo__identity">
          <span className="landing-voice-demo__badge">Démo · Voix IA</span>
          <strong className="landing-voice-demo__name">{LANDING_VOICE_DEMO_NAME}</strong>
          <span className="landing-voice-demo__meta">Généré par LuxeFlexIA</span>
        </div>
      </div>
      <SubtitleBlock words={words} visibleWords={visibleWords} />
      <div className="landing-voice-demo__player">
        <button
          type="button"
          className="landing-voice-demo__play"
          aria-label={playing ? "Pause" : "Écouter un exemple de voix IA"}
          aria-pressed={playing}
          onClick={() => void toggle()}
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <div className="landing-voice-demo__wave" aria-hidden>
          {WAVE.map((h, i) => (
            <i key={i} style={{ height: `${h}px` }} />
          ))}
        </div>
        <span className="landing-voice-demo__time">
          {formatVoiceClock(currentSec)} / {formatVoiceClock(durationSec || 12)}
        </span>
      </div>
      <p className="landing-voice-demo__note">Voix générée par intelligence artificielle</p>
    </div>
  );
}
