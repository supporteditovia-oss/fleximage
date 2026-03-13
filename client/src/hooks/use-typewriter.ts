import { useEffect, useRef } from "react";

const TYPE_INTERVAL = 70; // ms per character when typing
const DELETE_INTERVAL = 40; // ms per character when deleting
const PAUSE_AFTER_TYPE = 1800; // ms to wait after finishing a word

/**
 * Typewriter placeholder driven by requestAnimationFrame —
 * frame-aligned DOM writes, no setTimeout jank.
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
    let lastTime = 0;
    let pauseUntil = 0;
    let rafId: number;

    const step = (timestamp: number) => {
      if (!inputRef.current) return;

      // Handle pause after finishing typing
      if (pauseUntil > 0) {
        if (timestamp < pauseUntil) {
          rafId = requestAnimationFrame(step);
          return;
        }
        pauseUntil = 0;
        deleting = true;
      }

      const interval = deleting ? DELETE_INTERVAL : TYPE_INTERVAL;
      if (timestamp - lastTime < interval) {
        rafId = requestAnimationFrame(step);
        return;
      }
      lastTime = timestamp;

      const currentIdea = ideas[ideaIndexRef.current];

      if (!deleting) {
        charIndex++;
        inputRef.current.placeholder = currentIdea.slice(0, charIndex);
        if (charIndex === currentIdea.length) {
          pauseUntil = timestamp + PAUSE_AFTER_TYPE;
        }
      } else {
        charIndex--;
        if (charIndex === 0) {
          deleting = false;
          ideaIndexRef.current = (ideaIndexRef.current + 1) % ideas.length;
          charIndex = 1;
          inputRef.current.placeholder = ideas[ideaIndexRef.current].slice(0, 1);
        } else {
          inputRef.current.placeholder = currentIdea.slice(0, charIndex);
        }
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [prompt, ideas]);

  return inputRef;
}
