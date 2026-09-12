import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  LANDING_VOICE_CATALOG,
  LANDING_VOICE_DEFAULT_SLUG,
  type LandingVoiceEntry,
  type LandingVoiceGender,
  buildLandingVoiceScript,
  formatVoiceClock,
  landingVoiceDemoSrc,
  landingVoicePhoto,
  splitSubtitleWords,
  spokenWordCount,
} from "@/lib/landing-voice-demo";

const WAVE = [10, 16, 9, 22, 14, 27, 17, 11, 23, 31, 18, 12, 25, 19, 8, 17, 29, 20, 12, 24, 14, 9, 19, 12];

type LandingVoicePlayerProps = {
  variant?: "widget" | "section";
};

function VoiceAvatar({ entry, className }: { entry: LandingVoiceEntry; className?: string }) {
  const photo = landingVoicePhoto(entry);
  if (photo) {
    return <img className={className} src={photo} alt="" loading="lazy" />;
  }
  return (
    <span
      className={`landing-voice-avatar-fallback ${className ?? ""}`.trim()}
      style={{ background: entry.accent ?? "linear-gradient(145deg, #1e2430, #6b5a3a)" }}
      aria-hidden
    >
      {entry.initials ?? entry.name.slice(0, 1)}
    </span>
  );
}

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

function GenderTabs({
  gender,
  onChange,
}: {
  gender: LandingVoiceGender;
  onChange: (gender: LandingVoiceGender) => void;
}) {
  return (
    <div className="landing-voice-gender-tabs" role="tablist" aria-label="Genre de voix">
      {(["homme", "femme"] as const).map((value) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={gender === value}
          className={`landing-voice-gender-tabs__btn ${gender === value ? "is-active" : ""}`}
          onClick={() => onChange(value)}
        >
          {value === "homme" ? "Homme" : "Femme"}
        </button>
      ))}
    </div>
  );
}

function VoicePicker({
  voices,
  activeSlug,
  onSelect,
  compact,
}: {
  voices: LandingVoiceEntry[];
  activeSlug: string;
  onSelect: (slug: string) => void;
  compact?: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateScrollState();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [voices]);

  const scrollBy = (delta: number) => {
    scrollerRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <div
      className={`landing-voice-picker-wrap ${compact ? "landing-voice-picker-wrap--compact" : ""}`}
    >
      <button
        type="button"
        className="landing-voice-picker__nav"
        aria-label="Voix précédentes"
        disabled={!canScrollLeft}
        onClick={() => scrollBy(-160)}
      >
        <ChevronLeft aria-hidden />
      </button>
      <div
        ref={scrollerRef}
        className={`landing-voice-picker ${compact ? "landing-voice-picker--compact" : ""}`}
        role="listbox"
        aria-label="Choisir une voix du catalogue"
      >
        {voices.map((voice) => (
          <button
            key={voice.slug}
            type="button"
            role="option"
            aria-selected={activeSlug === voice.slug}
            className={`landing-voice-picker__chip ${activeSlug === voice.slug ? "is-active" : ""}`}
            onClick={() => onSelect(voice.slug)}
          >
            <VoiceAvatar entry={voice} className="landing-voice-picker__chip-avatar" />
            <span>{voice.name}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="landing-voice-picker__nav"
        aria-label="Voix suivantes"
        disabled={!canScrollRight}
        onClick={() => scrollBy(160)}
      >
        <ChevronRight aria-hidden />
      </button>
    </div>
  );
}

export function LandingVoicePlayer({ variant = "widget" }: LandingVoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [gender, setGender] = useState<LandingVoiceGender>("homme");
  const [activeSlug, setActiveSlug] = useState(LANDING_VOICE_DEFAULT_SLUG);
  const [playing, setPlaying] = useState(false);
  const [currentSec, setCurrentSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  const voices = useMemo(
    () => LANDING_VOICE_CATALOG.filter((item) => item.gender === gender),
    [gender],
  );

  const entry =
    LANDING_VOICE_CATALOG.find((item) => item.slug === activeSlug) ??
    voices[0] ??
    LANDING_VOICE_CATALOG[0];

  const script = useMemo(() => buildLandingVoiceScript(entry), [entry]);
  const words = useMemo(() => splitSubtitleWords(script), [script]);
  const visibleWords = spokenWordCount(currentSec, durationSec, words.length);

  useEffect(() => {
    if (voices.some((voice) => voice.slug === activeSlug)) return;
    setActiveSlug(voices[0]?.slug ?? LANDING_VOICE_DEFAULT_SLUG);
  }, [gender, voices, activeSlug]);

  useEffect(() => {
    let cancelled = false;
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;

    const onTime = () => setCurrentSec(audio.currentTime);
    const onMeta = () => setDurationSec(audio.duration || 0);
    const onCanPlay = () => {
      if (cancelled) return;
      setReady(true);
      setLoading(false);
      setError(false);
    };
    const onError = () => {
      if (cancelled) return;
      setReady(false);
      setLoading(false);
      setError(true);
      setPlaying(false);
    };
    const onEnded = () => {
      setPlaying(false);
      setCurrentSec(0);
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("canplaythrough", onCanPlay);
    audio.addEventListener("error", onError);
    audio.addEventListener("ended", onEnded);

    setPlaying(false);
    setCurrentSec(0);
    setDurationSec(0);
    setLoading(true);
    setReady(false);
    setError(false);

    audio.src = landingVoiceDemoSrc(activeSlug);
    audio.load();

    return () => {
      cancelled = true;
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("canplaythrough", onCanPlay);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("ended", onEnded);
      audioRef.current = null;
    };
  }, [activeSlug]);

  const selectVoice = (slug: string) => {
    if (slug === activeSlug) return;
    audioRef.current?.pause();
    setPlaying(false);
    setActiveSlug(slug);
  };

  const changeGender = (next: LandingVoiceGender) => {
    if (next === gender) return;
    audioRef.current?.pause();
    setPlaying(false);
    setGender(next);
  };

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio || loading || !ready || error) return;
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
      setError(true);
    }
  };

  const playDisabled = loading || !ready || error;

  if (variant === "section") {
    return (
      <div className={`voice-card voice-card--premium ${playing ? "is-playing" : ""}`}>
        <GenderTabs gender={gender} onChange={changeGender} />
        <VoicePicker voices={voices} activeSlug={activeSlug} onSelect={selectVoice} />
        <div className="voice-card-top voice-card-top--premium">
          <div className="voice-avatar voice-avatar--photo">
            <VoiceAvatar entry={entry} />
          </div>
          <div>
            <strong>{entry.name}</strong>
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
            disabled={playDisabled}
            onClick={() => void toggle()}
          >
            {loading ? "…" : playing ? "❚❚" : "▶"}
          </button>
          <div className="voice-wave" aria-hidden>
            {WAVE.map((h, i) => (
              <i key={i} style={{ height: `${h}px` }} />
            ))}
          </div>
          <span>
            {formatVoiceClock(currentSec)} / {formatVoiceClock(durationSec || 5)}
          </span>
        </div>
        {error ? (
          <p className="landing-voice-demo__error">Aperçu indisponible — réessayez dans un instant.</p>
        ) : null}
        <div className="voice-card-footer voice-card-footer--premium">
          <span>Clonage IA</span>
          <i />
          <span>Catalogue {gender === "homme" ? "homme" : "femme"}</span>
          <i />
          <span>LuxeFlexIA</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`landing-voice-demo landing-voice-demo--premium ${playing ? "is-playing" : ""}`}>
      <GenderTabs gender={gender} onChange={changeGender} />
      <VoicePicker voices={voices} activeSlug={activeSlug} onSelect={selectVoice} compact />
      <div className="landing-voice-demo__head landing-voice-demo__head--premium">
        <VoiceAvatar entry={entry} className="landing-voice-demo__thumb" />
        <div className="landing-voice-demo__identity">
          <span className="landing-voice-demo__badge">Démo · Voix IA</span>
          <strong className="landing-voice-demo__name">{entry.name}</strong>
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
          disabled={playDisabled}
          onClick={() => void toggle()}
        >
          {loading ? "…" : playing ? "❚❚" : "▶"}
        </button>
        <div className="landing-voice-demo__wave" aria-hidden>
          {WAVE.map((h, i) => (
            <i key={i} style={{ height: `${h}px` }} />
          ))}
        </div>
        <span className="landing-voice-demo__time">
          {formatVoiceClock(currentSec)} / {formatVoiceClock(durationSec || 5)}
        </span>
      </div>
      {error ? (
        <p className="landing-voice-demo__error">Aperçu indisponible — réessayez dans un instant.</p>
      ) : null}
      <p className="landing-voice-demo__note">
        Voix générée par intelligence artificielle · {gender === "homme" ? "Homme & rap FR" : "Femme"}
      </p>
    </div>
  );
}
