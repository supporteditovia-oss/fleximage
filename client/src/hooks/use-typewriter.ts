import { useState, useEffect, useRef } from "react";

export function useTypewriterPlaceholder(
  prompt: string,
  ideas: string[],
): string {
  const [placeholderText, setPlaceholderText] = useState(ideas[0]?.[0] ?? "");
  const ideaIndexRef = useRef(0);

  useEffect(() => {
    if (prompt) {
      setPlaceholderText("");
      return;
    }

    let charIndex = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const currentIdea = ideas[ideaIndexRef.current];

      if (!deleting) {
        charIndex++;
        setPlaceholderText(currentIdea.slice(0, charIndex));
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
          // Switch to next idea immediately — set first char so placeholder is never empty
          deleting = false;
          ideaIndexRef.current =
            (ideaIndexRef.current + 1) % ideas.length;
          const nextIdea = ideas[ideaIndexRef.current];
          charIndex = 1;
          setPlaceholderText(nextIdea.slice(0, 1));
          timer = setTimeout(tick, 60);
          return;
        }
        setPlaceholderText(currentIdea.slice(0, charIndex));
        timer = setTimeout(tick, 30);
      }
    };

    tick();
    return () => clearTimeout(timer);
  }, [prompt, ideas]);

  return placeholderText;
}
