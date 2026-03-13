import { useEffect, useRef } from "react";

/**
 * Typewriter placeholder that animates directly via the DOM —
 * zero React re-renders, no state updates, smooth on heavy pages.
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

    const tick = () => {
      if (!inputRef.current) return;
      const currentIdea = ideas[ideaIndexRef.current];

      if (!deleting) {
        charIndex++;
        inputRef.current.placeholder = currentIdea.slice(0, charIndex);
        if (charIndex === currentIdea.length) {
          timer = setTimeout(() => {
            deleting = true;
            tick();
          }, 1800);
          return;
        }
        timer = setTimeout(tick, 60);
      } else {
        charIndex--;
        if (charIndex === 0) {
          deleting = false;
          ideaIndexRef.current =
            (ideaIndexRef.current + 1) % ideas.length;
          const nextIdea = ideas[ideaIndexRef.current];
          charIndex = 1;
          inputRef.current.placeholder = nextIdea.slice(0, 1);
          timer = setTimeout(tick, 60);
          return;
        }
        inputRef.current.placeholder = currentIdea.slice(0, charIndex);
        timer = setTimeout(tick, 30);
      }
    };

    tick();
    return () => clearTimeout(timer);
  }, [prompt, ideas]);

  return inputRef;
}
