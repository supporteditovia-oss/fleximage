import { useEffect, useRef } from "react";

const TYPE_SPEED = 70;
const DELETE_SPEED = 40;
const PAUSE_AFTER_TYPE = 1800;

/**
 * Typewriter placeholder that animates directly via the DOM —
 * zero React re-renders, no state updates, smooth on heavy pages.
 *
 * Uses setTimeout (fires only when needed, not every frame like rAF).
 * Pauses automatically via IntersectionObserver when the input scrolls
 * out of view — so it won't burn CPU on the landing page marquee section.
 *
 * Attach the returned ref to your <input>.
 * When `prompt` is non-empty the typewriter pauses and the placeholder resets.
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
    let visible = true;
    let pausedAt: { charIndex: number; deleting: boolean } | null = null;

    const tick = () => {
      if (!inputRef.current) return;

      // If not visible, save state and stop scheduling
      if (!visible) {
        pausedAt = { charIndex, deleting };
        return;
      }

      const currentIdea = ideas[ideaIndexRef.current];

      if (!deleting) {
        charIndex++;
        inputRef.current.placeholder = currentIdea.slice(0, charIndex);
        if (charIndex === currentIdea.length) {
          timer = setTimeout(() => {
            deleting = true;
            tick();
          }, PAUSE_AFTER_TYPE);
          return;
        }
        timer = setTimeout(tick, TYPE_SPEED);
      } else {
        charIndex--;
        if (charIndex === 0) {
          deleting = false;
          ideaIndexRef.current =
            (ideaIndexRef.current + 1) % ideas.length;
          const nextIdea = ideas[ideaIndexRef.current];
          charIndex = 1;
          inputRef.current.placeholder = nextIdea.slice(0, 1);
          timer = setTimeout(tick, TYPE_SPEED);
          return;
        }
        inputRef.current.placeholder = currentIdea.slice(0, charIndex);
        timer = setTimeout(tick, DELETE_SPEED);
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
            tick();
          }
        },
        { threshold: 0 },
      );
      observer.observe(el);
    }

    tick();

    return () => {
      clearTimeout(timer);
      observer?.disconnect();
    };
  }, [prompt, ideas]);

  return inputRef;
}
