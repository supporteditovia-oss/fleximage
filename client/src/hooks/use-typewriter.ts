import { useState, useEffect } from "react";

export function useTypewriterPlaceholder(prompt: string, ideas: string[]): string {
  const [placeholderText, setPlaceholderText] = useState("");
  const [ideaIndex, setIdeaIndex] = useState(0);

  useEffect(() => {
    if (prompt) return;
    let charIndex = 0;
    let deleting = false;
    const currentIdea = ideas[ideaIndex];
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (!deleting) {
        charIndex++;
        setPlaceholderText(currentIdea.slice(0, charIndex));
        if (charIndex === currentIdea.length) {
          timer = setTimeout(() => { deleting = true; tick(); }, 1800);
          return;
        }
        timer = setTimeout(tick, 60);
      } else {
        charIndex--;
        setPlaceholderText(currentIdea.slice(0, charIndex));
        if (charIndex === 0) {
          setIdeaIndex((prev) => (prev + 1) % ideas.length);
          return;
        }
        timer = setTimeout(tick, 30);
      }
    };
    tick();
    return () => clearTimeout(timer);
  }, [ideaIndex, prompt]);

  return placeholderText;
}
