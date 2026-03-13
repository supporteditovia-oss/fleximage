import { useEffect, useRef } from "react";

const TYPE_SPEED = 80;
const DELETE_SPEED = 45;
const PAUSE_AFTER_TYPE = 2000;

/**
 * Typewriter placeholder with smooth frame-rate synced animation on mobile.
 * Uses requestAnimationFrame for jitter-free rendering on all devices.
 */
export function useTypewriterPlaceholder(
  prompt: string,
  ideas: string[],
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const ideaIndexRef = useRef(0);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    if (prompt) {
      el.placeholder = "Décris ton prank…";
      return;
    }

    let charIndex = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    let rafId: number;
    let visible = true;
    let pausedAt: { charIndex: number; deleting: boolean } | null = null;
    let lastUpdateTime = 0;

    const tick = (currentTime: number) => {
      if (!inputRef.current) return;

      // If not visible, save state and stop scheduling
      if (!visible) {
        pausedAt = { charIndex, deleting };
        return;
      }

      const timeSinceLastUpdate = currentTime - lastUpdateTime;
      const speed = deleting ? DELETE_SPEED : TYPE_SPEED;

      // Only update if enough time has passed
      if (timeSinceLastUpdate < speed) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      lastUpdateTime = currentTime;
      const currentIdea = ideas[ideaIndexRef.current];

      if (!deleting) {
        charIndex++;
        inputRef.current.placeholder = currentIdea.slice(0, charIndex);
        if (charIndex === currentIdea.length) {
          timer = setTimeout(() => {
            deleting = true;
            lastUpdateTime = 0;
            rafId = requestAnimationFrame(tick);
          }, PAUSE_AFTER_TYPE);
          return;
        }
        rafId = requestAnimationFrame(tick);
      } else {
        charIndex--;
        if (charIndex === 0) {
          deleting = false;
          ideaIndexRef.current =
            (ideaIndexRef.current + 1) % ideas.length;
          const nextIdea = ideas[ideaIndexRef.current];
          charIndex = 1;
          inputRef.current.placeholder = nextIdea.slice(0, 1);
          lastUpdateTime = 0;
          rafId = requestAnimationFrame(tick);
          return;
        }
        inputRef.current.placeholder = currentIdea.slice(0, charIndex);
        lastUpdateTime = 0;
        rafId = requestAnimationFrame(tick);
      }
    };

    // Pause/resume when scrolling in/out of view
    let observer: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        ([entry]) => {
          const wasVisible = visible;
          visible = entry.isIntersecting;
          // Resume from where we left off
          if (visible && !wasVisible && pausedAt) {
            charIndex = pausedAt.charIndex;
            deleting = pausedAt.deleting;
            pausedAt = null;
            lastUpdateTime = 0;
            rafId = requestAnimationFrame(tick);
          }
        },
        { threshold: 0 },
      );
      observer.observe(el);
    }

    rafId = requestAnimationFrame(tick);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafId);
      observer?.disconnect();
    };
  }, [prompt, ideas]);

  return inputRef;
}
