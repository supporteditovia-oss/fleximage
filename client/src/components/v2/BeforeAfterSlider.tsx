import { useEffect, useId, useRef, useState } from "react";
import type { LandingComparePair } from "@/lib/landing-v2-pairs";

type BeforeAfterSliderProps = {
  pair: LandingComparePair;
  className?: string;
  autoPlay?: boolean;
  sizes?: string;
  priority?: boolean;
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
  sizes,
  priority = false,
  label = "Comparer original et rendu IA",
}: BeforeAfterSliderProps) {
  const labelId = useId();
  const frameRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [position, setPosition] = useState(autoPlay ? 18 : 50);
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
    if (!autoPlay || userLocked) return;

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
  }, [autoPlay, pair.id, userLocked]);

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
