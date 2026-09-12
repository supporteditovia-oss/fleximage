import { useEffect, useRef, useState } from "react";

const DEMO_SRC = "/assets/voice-catalog/samples/gims.mp3";
const WAVE = [8, 14, 10, 22, 12, 18, 9, 24, 15, 20, 11, 17, 13, 21, 10, 16];

function formatTime(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `0:${String(s).padStart(2, "0")}`;
}

/** Mini lecteur démo voix IA — widget landing uniquement. */
export function LandingVoiceDemo() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = new Audio(DEMO_SRC);
    audio.preload = "metadata";
    audioRef.current = audio;

    const onTime = () => setCurrent(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnded = () => setPlaying(false);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnded);
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
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  };

  return (
    <div className={`landing-voice-demo ${playing ? "is-playing" : ""}`}>
      <div className="landing-voice-demo__head">
        <span className="landing-voice-demo__badge">Exemple</span>
        <p className="landing-voice-demo__quote">« Bienvenue dans mon univers. »</p>
      </div>
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
          {formatTime(current)} / {formatTime(duration || 12)}
        </span>
      </div>
      <p className="landing-voice-demo__note">Voix générée par IA · clonage vocal</p>
    </div>
  );
}
