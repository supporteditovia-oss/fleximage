import { useEffect, useId, useRef, useState } from "react";
import type { LandingComparePair } from "@/lib/landing-v2-pairs";
import "./before-after-slider.css";

export type CompareSources = {
  id: string;
  beforeSrc: string;
  afterSrc: string;
  beforeAlt: string;
  afterAlt: string;
};

type BeforeAfterSliderProps = {
  pair: LandingComparePair | CompareSources;
  className?: string;
  /** Animation unique au chargement (landing). */
  autoPlay?: boolean;
  /** Boucle avant ↔ après en continu (aperçu modèles). */
  autoPlayLoop?: boolean;
  sizes?: string;
  priority?: boolean;
  showLabels?: boolean;
  hint?: string;
  /** Accessible name — captions stay off the visual by default. */
  label?: string;
};

function clampPosition(value: number): number {
  return Math.min(92, Math.max(8, value));
}

export function BeforeAfterSlider({
  pair,
  className,
  autoPlay = false,
  autoPlayLoop = false,
  sizes,
  priority = false,
  showLabels = false,
  hint,
  label = "Comparer original et rendu IA",
}: BeforeAfterSliderProps) {
  const labelId = useId();
  const frameRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [position, setPosition] = useState(autoPlay || autoPlayLoop ? 18 : 50);
  const [userLocked, setUserLocked] = useState(false);
  const [frameWidth, setFrameWidth] = useState(0);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const sync = () => setFrameWidth(frame.getBoundingClientRect().width);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [pair.id]);

  const updateFromClientX = (clientX: number) => {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    if (rect.width <= 0) return;
    setPosition(clampPosition(((clientX - rect.left) / rect.width) * 100));
  };

  useEffect(() => {
    if (!autoPlay || autoPlayLoop || userLocked) return;

    let raf = 0;
    const duration = 2800;
    const from = 18;
    const to = 78;
    const started = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / duration);
      const eased = 1 - (1 - t) ** 3;
      setPosition(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoPlay, autoPlayLoop, pair.id, userLocked]);

  useEffect(() => {
    if (!autoPlayLoop || userLocked) return;

    let raf = 0;
    const cycleMs = 5200;
    const from = 14;
    const to = 86;
    const started = performance.now();

    const tick = (now: number) => {
      const elapsed = (now - started) % cycleMs;
      const half = cycleMs / 2;
      const phase = elapsed <= half ? elapsed / half : 1 - (elapsed - half) / half;
      const eased = phase < 0.5 ? 2 * phase * phase : 1 - (-2 * phase + 2) ** 2 / 2;
      setPosition(from + (to - from) * eased);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoPlayLoop, pair.id, userLocked]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (!draggingRef.current) return;
      updateFromClientX(event.clientX);
    };
    const onUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  return (
    <div className={className}>
      <p id={labelId} className="sr-only">
        {label}
      </p>
      <div
        ref={frameRef}
        className="lx-compare"
        role="slider"
        aria-labelledby={labelId}
        aria-valuemin={8}
        aria-valuemax={92}
        aria-valuenow={Math.round(position)}
        tabIndex={0}
        onPointerDown={(event) => {
          event.preventDefault();
          setUserLocked(true);
          draggingRef.current = true;
          updateFromClientX(event.clientX);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            setUserLocked(true);
            setPosition((value) => clampPosition(value - 4));
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            setUserLocked(true);
            setPosition((value) => clampPosition(value + 4));
          }
        }}
      >
        <img
          src={pair.afterSrc}
          alt={pair.afterAlt}
          className="lx-compare__img lx-compare__img--after"
          draggable={false}
          sizes={sizes}
          fetchPriority={priority ? "high" : "auto"}
        />
        <div className="lx-compare__before" style={{ width: `${position}%` }}>
          <img
            src={pair.beforeSrc}
            alt={pair.beforeAlt}
            className="lx-compare__img"
            draggable={false}
            sizes={sizes}
            style={frameWidth ? { width: `${frameWidth}px` } : undefined}
          />
        </div>
        {showLabels ? (
          <div className="lx-compare__labels" aria-hidden>
            <span className="lx-compare__label">Avant</span>
            <span className="lx-compare__label">Après</span>
          </div>
        ) : null}
        {hint ? (
          <span className="lx-compare__hint" aria-hidden>
            {hint}
          </span>
        ) : null}
        <div className="lx-compare__bar" style={{ left: `${position}%` }}>
          <span className="lx-compare__handle" aria-hidden>
            <span />
            <span />
          </span>
        </div>
      </div>
    </div>
  );
}
