import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { isTemplateIllustrationVideo } from "@/lib/template-illustration";
import { Button } from "@/components/ui/button";

interface GameTemplate {
  name: string;
  example_before_url: string | null;
  example_after_url: string;
}

interface Round {
  template: GameTemplate;
  realOnLeft: boolean;
}

function createRound(templates: GameTemplate[]): Round {
  const template = templates[Math.floor(Math.random() * templates.length)];
  return {
    template,
    realOnLeft: Math.random() < 0.5,
  };
}

function ImageChoice({
  alt,
  label,
  revealed,
  result,
  disabled,
  onClick,
  src,
}: {
  alt: string;
  label: string;
  revealed: boolean;
  result?: "correct" | "wrong" | "neutral";
  disabled: boolean;
  onClick: () => void;
  src: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group relative aspect-[3/4] w-full overflow-hidden rounded-xl border-2 transition-all",
        "border-[#42a5f6]/25 bg-black/65 shadow-[0_0_34px_rgb(66_165_246_/_0.16)]",
        !disabled && "cursor-pointer hover:border-[#42a5f6]/65 hover:shadow-[0_0_40px_rgb(66_165_246_/_0.25)]",
        disabled && "cursor-default",
        result === "correct" && "border-[#42a5f6] ring-2 ring-[#42a5f6]/40",
        result === "wrong" && "border-red-400/70 ring-2 ring-red-400/30",
        result === "neutral" && revealed && "opacity-80",
      )}
    >
      <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-[#42a5f6]/10" />

      {!revealed && (
        <span className="absolute inset-x-0 bottom-0 z-10 px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-[#d8edff] opacity-0 transition-opacity group-hover:opacity-100 md:opacity-100">
          {label}
        </span>
      )}

      {revealed && (
        <div
          className={cn(
            "absolute inset-x-3 bottom-3 z-10 flex items-center justify-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em]",
            result === "correct" && "bg-[#42a5f6]/20 text-[#d8edff] border border-[#42a5f6]/40",
            result === "wrong" && "bg-red-500/20 text-red-100 border border-red-400/40",
            result === "neutral" && "bg-black/60 text-[#9bd3ff] border border-[#42a5f6]/20",
          )}
        >
          {result === "correct" && <Check className="h-3.5 w-3.5" />}
          {result === "wrong" && <X className="h-3.5 w-3.5" />}
          {label}
        </div>
      )}
    </button>
  );
}

export default function RealOrFakeGame() {
  const { t } = useTranslation();
  const [round, setRound] = React.useState<Round | null>(null);
  const [revealed, setRevealed] = React.useState(false);
  const [pickedRealSide, setPickedRealSide] = React.useState<"left" | "right" | null>(
    null,
  );
  const [score, setScore] = React.useState({ correct: 0, total: 0 });

  const { data: templates, isLoading } = useQuery<GameTemplate[]>({
    queryKey: ["marquee-templates"],
    queryFn: async () => {
      const res = await fetch("/api/templates/marquee");
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const playableTemplates = React.useMemo(
    () =>
      (templates ?? []).filter(
        (template): template is GameTemplate & { example_before_url: string } =>
          Boolean(
            template.example_before_url &&
              template.example_after_url &&
              !isTemplateIllustrationVideo(template.example_after_url),
          ),
      ),
    [templates],
  );

  React.useEffect(() => {
    if (playableTemplates.length > 0 && !round) {
      setRound(createRound(playableTemplates));
    }
  }, [playableTemplates, round]);

  const handleGuess = (side: "left" | "right") => {
    if (!round || revealed) return;

    const realSide = round.realOnLeft ? "left" : "right";
    const isCorrect = side === realSide;

    setPickedRealSide(side);
    setRevealed(true);
    setScore((current) => ({
      correct: current.correct + (isCorrect ? 1 : 0),
      total: current.total + 1,
    }));
  };

  const handleNext = () => {
    if (playableTemplates.length === 0) return;
    setRound(createRound(playableTemplates));
    setRevealed(false);
    setPickedRealSide(null);
  };

  if (isLoading) {
    return (
      <div className="mx-auto flex h-[clamp(10rem,24svh,14rem)] w-full max-w-md items-center justify-center rounded-xl border border-[#42a5f6]/20 bg-black/40 text-sm text-[#9bd3ff]">
        {t("marquee.gameLoading")}
      </div>
    );
  }

  if (!round || playableTemplates.length === 0) {
    return (
      <div className="mx-auto flex h-[clamp(10rem,24svh,14rem)] w-full max-w-md items-center justify-center rounded-xl border border-[#42a5f6]/20 bg-black/40 px-6 text-center text-sm text-[#9bd3ff]">
        {t("marquee.gameEmpty")}
      </div>
    );
  }

  const leftSrc = round.realOnLeft
    ? round.template.example_before_url!
    : round.template.example_after_url;
  const rightSrc = round.realOnLeft
    ? round.template.example_after_url
    : round.template.example_before_url!;

  const realSide = round.realOnLeft ? "left" : "right";

  const leftResult = revealed
    ? realSide === "left"
      ? pickedRealSide === "left"
        ? "correct"
        : "neutral"
      : pickedRealSide === "left"
        ? "wrong"
        : "neutral"
    : undefined;

  const rightResult = revealed
    ? realSide === "right"
      ? pickedRealSide === "right"
        ? "correct"
        : "neutral"
      : pickedRealSide === "right"
        ? "wrong"
        : "neutral"
    : undefined;

  return (
    <div className="mx-auto w-full max-w-2xl px-4">
      <p className="mb-4 text-center text-sm font-medium text-[#9bd3ff] md:text-base">
        {t("marquee.gamePrompt")}
      </p>

      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <ImageChoice
          alt={t("marquee.gameLeftAlt")}
          label={revealed ? (realSide === "left" ? t("marquee.gameRealLabel") : t("marquee.gameFakeLabel")) : t("marquee.gamePickReal")}
          src={leftSrc}
          disabled={revealed}
          revealed={revealed}
          result={leftResult}
          onClick={() => handleGuess("left")}
        />
        <ImageChoice
          alt={t("marquee.gameRightAlt")}
          label={revealed ? (realSide === "right" ? t("marquee.gameRealLabel") : t("marquee.gameFakeLabel")) : t("marquee.gamePickReal")}
          src={rightSrc}
          disabled={revealed}
          revealed={revealed}
          result={rightResult}
          onClick={() => handleGuess("right")}
        />
      </div>

      <div className="mt-5 flex min-h-[4.5rem] flex-col items-center justify-center gap-3 text-center">
        {revealed ? (
          <>
            <p className="text-sm font-medium text-[#e8f5ff] md:text-base">
              {pickedRealSide === realSide
                ? t("marquee.gameCorrect")
                : t("marquee.gameWrong")}
            </p>
            <Button
              size="sm"
              onClick={handleNext}
              className="rounded-full border border-[#42a5f6]/35 bg-[#42a5f6] px-5 text-xs font-semibold text-[#03101d] hover:bg-[#72c0ff]"
            >
              {t("marquee.gameNext")}
            </Button>
          </>
        ) : (
          <p className="text-xs uppercase tracking-[0.16em] text-[#42a5f6]/75">
            {t("marquee.gameHint")}
          </p>
        )}

        {score.total > 0 && (
          <p className="text-xs text-[#42a5f6]/80">
            {t("marquee.gameScore", {
              correct: score.correct,
              total: score.total,
            })}
          </p>
        )}
      </div>
    </div>
  );
}
