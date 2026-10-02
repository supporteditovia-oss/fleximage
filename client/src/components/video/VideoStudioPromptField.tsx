import { Shuffle } from "lucide-react";
import { useTypewriterPlaceholder } from "@/hooks/use-typewriter";

type VideoStudioPromptFieldProps = {
  value: string;
  onChange: (value: string) => void;
  typewriterIdeas: string[];
  onRandom: () => void;
  fallbackPlaceholder: string;
  ariaLabel: string;
  rows?: number;
  maxLength?: number;
  disabled?: boolean;
};

export function VideoStudioPromptField({
  value,
  onChange,
  typewriterIdeas,
  onRandom,
  fallbackPlaceholder,
  ariaLabel,
  rows = 3,
  maxLength = 500,
  disabled,
}: VideoStudioPromptFieldProps) {
  const inputRef = useTypewriterPlaceholder(
    value,
    typewriterIdeas,
    fallbackPlaceholder,
  );

  return (
    <div className="via-prompt-compose">
      <textarea
        ref={inputRef}
        id={ariaLabel.replace(/\s+/g, "-").toLowerCase()}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        maxLength={maxLength}
        disabled={disabled}
        className="via-prompt-field via-prompt-field--compose"
        aria-label={ariaLabel}
      />
      <div className="via-prompt-compose__bar">
        <button
          type="button"
          className="via-prompt-shuffle"
          onClick={onRandom}
          disabled={disabled}
        >
          <Shuffle className="h-3.5 w-3.5" aria-hidden />
          Aléatoire
        </button>
      </div>
    </div>
  );
}
