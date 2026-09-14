import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Loader2, Pause, Play } from "lucide-react";
import {
  createLandingVoiceAudio,
  isLandingVoiceAudioFailed,
} from "@/lib/landing-voice-audio";
import {
  LANDING_VOICE_CATALOG,
  type LandingVoiceEntry,
  buildLandingVoiceScript,
  formatVoiceClock,
  isAudioReady,
  landingVoicePhoto,
  pickRandomLandingVoiceSlug,
  splitSubtitleWords,
  spokenWordCount,
} from "@/lib/landing-voice-demo";

const WAVE = [10, 16, 9, 22, 14, 27, 17, 11, 23, 31, 18, 12, 25, 19, 8, 17, 29, 20, 12, 24, 14, 9, 19, 12];

type LandingVoicePlayerProps = {
  variant?: "widget" | "section";
};

function resetAudioPosition(audio: HTMLAudioElement) {
  audio.pause();
  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    audio.currentTime = 0;
  } else {
    try {
      audio.currentTime = 0;
    } catch {
      /* metadata not loaded yet */
    }
  }
}

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

function SubtitleBlock({
  words,
  visibleWords,
  label,
}: {
  words: string[];
  visibleWords: number;
  label: string;
}) {
  return (
    <div className="landing-voice-subtitles" aria-live="polite">
      <p className="landing-voice-subtitles__label">{label}</p>
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

function VoicePicker({
  activeSlug,
  onSelect,
  compact,
}: {
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
  }, []);

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
        {LANDING_VOICE_CATALOG.map((voice) => (
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
  const { t, i18n } = useTranslation();
  const audioCacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const pendingPlayRef = useRef(false);
  const playFromStartRef = useRef(false);
  const activeSlugRef = useRef(pickRandomLandingVoiceSlug());

  const [activeSlug, setActiveSlug] = useState(activeSlugRef.current);
  const [playing, setPlaying] = useState(false);
  const [currentSec, setCurrentSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const entry =
    LANDING_VOICE_CATALOG.find((item) => item.slug === activeSlug) ?? LANDING_VOICE_CATALOG[0];

  const script = useMemo(
    () => buildLandingVoiceScript(entry),
    [entry, i18n.resolvedLanguage],
  );
  const words = useMemo(() => splitSubtitleWords(script), [script]);
  const visibleWords = spokenWordCount(currentSec, durationSec, words.length);

  const getAudio = useCallback((slug: string, recreate = false) => {
    const cache = audioCacheRef.current;
    if (recreate) cache.delete(slug);
    let audio = cache.get(slug);
    if (!audio) {
      audio = createLandingVoiceAudio(slug);
      cache.set(slug, audio);
    }
    return audio;
  }, []);

  const tryPlay = useCallback(async (audio: HTMLAudioElement, slug: string) => {
    if (activeSlugRef.current !== slug) return;
    try {
      if (playFromStartRef.current || audio.currentTime >= (audio.duration || 0) - 0.05) {
        audio.currentTime = 0;
        playFromStartRef.current = false;
      }
      await audio.play();
      if (activeSlugRef.current !== slug) {
        audio.pause();
        return;
      }
      setPlaying(true);
      setError(false);
      setLoading(false);
      pendingPlayRef.current = false;
    } catch {
      if (activeSlugRef.current === slug) {
        setPlaying(false);
        setError(true);
        setLoading(false);
      }
      pendingPlayRef.current = false;
      playFromStartRef.current = false;
    }
  }, []);

  const requestPlay = useCallback(
    (slug: string, fromStart: boolean, recreateOnFailure = false) => {
      if (recreateOnFailure) getAudio(slug, true);
      const audio = getAudio(slug);
      playFromStartRef.current = fromStart;
      pendingPlayRef.current = true;
      setPlaying(false);
      setError(false);
      setCurrentSec(0);
      setLoading(!isAudioReady(audio));

      if (isAudioReady(audio)) {
        void tryPlay(audio, slug);
        return;
      }

      if (audio.readyState === HTMLMediaElement.HAVE_NOTHING) {
        audio.load();
      }
    },
    [getAudio, tryPlay],
  );

  useEffect(() => {
    for (const voice of LANDING_VOICE_CATALOG) {
      getAudio(voice.slug);
    }
  }, [getAudio]);

  useEffect(() => {
    audioCacheRef.current.clear();
    setPlaying(false);
    setCurrentSec(0);
    setDurationSec(0);
    setError(false);
    pendingPlayRef.current = false;
    for (const voice of LANDING_VOICE_CATALOG) {
      getAudio(voice.slug, true);
    }
  }, [getAudio, i18n.resolvedLanguage]);

  useEffect(() => {
    activeSlugRef.current = activeSlug;

    for (const [slug, audio] of audioCacheRef.current.entries()) {
      if (slug !== activeSlug) resetAudioPosition(audio);
    }

    const audio = getAudio(activeSlug);

    const syncReady = () => {
      if (activeSlugRef.current !== activeSlug) return;
      const ready = isAudioReady(audio);
      setLoading(pendingPlayRef.current && !ready);
      if (ready && pendingPlayRef.current) {
        void tryPlay(audio, activeSlug);
      }
    };

    const onTime = () => {
      if (activeSlugRef.current !== activeSlug) return;
      setCurrentSec(audio.currentTime);
    };
    const syncDuration = () => {
      if (activeSlugRef.current !== activeSlug) return;
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDurationSec(audio.duration);
      }
    };
    const onReady = () => syncReady();
    const onError = () => {
      if (activeSlugRef.current !== activeSlug) return;
      if (!isLandingVoiceAudioFailed(audio)) return;
      setLoading(false);
      setError(true);
      setPlaying(false);
      pendingPlayRef.current = false;
      playFromStartRef.current = false;
    };
    const onEnded = () => {
      if (activeSlugRef.current !== activeSlug) return;
      setPlaying(false);
      setCurrentSec(0);
      resetAudioPosition(audio);
    };

    resetAudioPosition(audio);
    setPlaying(false);
    setCurrentSec(0);
    syncDuration();
    setError(isLandingVoiceAudioFailed(audio));
    setLoading(!isAudioReady(audio) && pendingPlayRef.current);

    if (audio.readyState === HTMLMediaElement.HAVE_NOTHING) {
      audio.load();
    }

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", syncDuration);
    audio.addEventListener("durationchange", syncDuration);
    audio.addEventListener("loadeddata", onReady);
    audio.addEventListener("canplay", onReady);
    audio.addEventListener("error", onError);
    audio.addEventListener("ended", onEnded);

    syncReady();

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", syncDuration);
      audio.removeEventListener("durationchange", syncDuration);
      audio.removeEventListener("loadeddata", onReady);
      audio.removeEventListener("canplay", onReady);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("ended", onEnded);
    };
  }, [activeSlug, getAudio, tryPlay]);

  const selectVoice = (slug: string) => {
    if (slug === activeSlug) {
      requestPlay(slug, true, error);
      return;
    }

    for (const [cachedSlug, audio] of audioCacheRef.current.entries()) {
      if (cachedSlug !== slug) resetAudioPosition(audio);
    }

    playFromStartRef.current = true;
    pendingPlayRef.current = true;
    activeSlugRef.current = slug;
    setPlaying(false);
    setCurrentSec(0);
    setError(false);
    setActiveSlug(slug);
  };

  const toggle = () => {
    const audio = getAudio(activeSlug);

    if (playing) {
      audio.pause();
      setPlaying(false);
      pendingPlayRef.current = false;
      playFromStartRef.current = false;
      setLoading(false);
      return;
    }

    if (error) {
      requestPlay(activeSlug, true, true);
      return;
    }

    playFromStartRef.current = false;
    pendingPlayRef.current = true;

    if (isAudioReady(audio)) {
      void tryPlay(audio, activeSlug);
      return;
    }

    setLoading(true);
    if (audio.readyState === HTMLMediaElement.HAVE_NOTHING) {
      audio.load();
    }
  };

  const playButtonClass =
    variant === "widget"
      ? "landing-voice-demo__play landing-voice-demo__play--icon"
      : "landing-voice-demo__play landing-voice-demo__play--icon voice-player__play";

  const playerControls = (
    <>
      <button
        type="button"
        className={playButtonClass}
        aria-label={playing ? "Mettre en pause" : "Écouter la démo vocale"}
        aria-pressed={playing}
        disabled={loading && !error}
        onClick={toggle}
      >
        {loading ? (
          <Loader2 className="landing-voice-demo__play-icon is-spinning" aria-hidden />
        ) : playing ? (
          <Pause className="landing-voice-demo__play-icon" aria-hidden />
        ) : (
          <Play className="landing-voice-demo__play-icon" aria-hidden />
        )}
      </button>
      <div className="voice-wave landing-voice-demo__wave" aria-hidden>
        {WAVE.map((h, i) => (
          <i key={i} style={{ height: `${h}px` }} />
        ))}
      </div>
      <span className="landing-voice-demo__time">
        {formatVoiceClock(currentSec)} / {formatVoiceClock(durationSec)}
      </span>
    </>
  );

  if (variant === "section") {
    return (
      <div className={`voice-card voice-card--premium ${playing ? "is-playing" : ""}`}>
        <VoicePicker activeSlug={activeSlug} onSelect={selectVoice} />
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
        <SubtitleBlock
          words={words}
          visibleWords={visibleWords}
          label={t("landing:voice.subtitles")}
        />
        <div className="voice-player voice-player--premium">{playerControls}</div>
        {error ? (
          <p className="landing-voice-demo__error">{t("landing:voice.previewError")}</p>
        ) : null}
        <div className="voice-card-footer voice-card-footer--premium">
          <span>Clonage IA</span>
          <i />
          <span>Catalogue complet</span>
          <i />
          <span>LuxeFlexIA</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`landing-voice-demo landing-voice-demo--premium ${playing ? "is-playing" : ""}`}>
      <VoicePicker activeSlug={activeSlug} onSelect={selectVoice} compact />
      <div className="landing-voice-demo__head landing-voice-demo__head--premium">
        <VoiceAvatar entry={entry} className="landing-voice-demo__thumb" />
        <div className="landing-voice-demo__identity">
          <span className="landing-voice-demo__badge">Démo · Voix IA</span>
          <strong className="landing-voice-demo__name">{entry.name}</strong>
          <span className="landing-voice-demo__meta">Généré par LuxeFlexIA</span>
        </div>
      </div>
      <SubtitleBlock
        words={words}
        visibleWords={visibleWords}
        label={t("landing:voice.subtitles")}
      />
      <div className="landing-voice-demo__player">{playerControls}</div>
      {error ? (
        <p className="landing-voice-demo__error">{t("landing:voice.previewError")}</p>
      ) : null}
      <p className="landing-voice-demo__note">
        Voix générée par intelligence artificielle · Catalogue complet
      </p>
    </div>
  );
}
