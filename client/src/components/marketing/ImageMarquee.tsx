import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import RealOrFakeGame from "@/components/marketing/RealOrFakeGame";

interface ImageMarqueeProps {
  compactTop?: boolean;
}

const MATRIX_STREAMS = [
  {
    value: "0101010011010110010010",
    className: "left-[3%] text-[10px] opacity-30 md:text-xs",
    delay: "-12s",
    duration: "18s",
  },
  {
    value: "LARPKING0010111010010",
    className: "left-[11%] text-xs opacity-45 md:text-sm",
    delay: "-6s",
    duration: "15s",
  },
  {
    value: "100110100111010011011",
    className: "left-[19%] text-[10px] opacity-25 md:text-xs",
    delay: "-18s",
    duration: "22s",
  },
  {
    value: "SYSTEM0101REALM1101",
    className: "left-[29%] text-xs opacity-40 md:text-sm",
    delay: "-3s",
    duration: "17s",
  },
  {
    value: "0010111100101101001110",
    className: "left-[39%] text-[10px] opacity-30 md:text-xs",
    delay: "-15s",
    duration: "20s",
  },
  {
    value: "AVATAR101101001011",
    className: "left-[50%] text-xs opacity-50 md:text-sm",
    delay: "-9s",
    duration: "16s",
  },
  {
    value: "101001101110010101001",
    className: "left-[62%] text-[10px] opacity-25 md:text-xs",
    delay: "-20s",
    duration: "23s",
  },
  {
    value: "PROMPT001101ENGINE",
    className: "left-[72%] text-xs opacity-40 md:text-sm",
    delay: "-4s",
    duration: "18s",
  },
  {
    value: "110010111001011010010",
    className: "left-[83%] text-[10px] opacity-35 md:text-xs",
    delay: "-11s",
    duration: "19s",
  },
  {
    value: "NEURAL01001101KING",
    className: "left-[93%] text-xs opacity-45 md:text-sm",
    delay: "-7s",
    duration: "14s",
  },
] as const;

export default function ImageMarquee({ compactTop = false }: ImageMarqueeProps) {
  const { t } = useTranslation();

  return (
    <section
      className={cn(
        "relative isolate flex min-h-[100svh] h-[100svh] flex-col justify-center overflow-hidden border-y border-[#1f5f91] bg-[#02070c] text-[#d8edff]",
        compactTop ? "-mt-4 pt-0 md:-mt-10 md:pt-0" : "",
      )}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,#02070c_0%,#061521_48%,#02070c_100%)]" />
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-grain opacity-[0.18] mix-blend-soft-light"
        aria-hidden="true"
      />
      <div className="matrix-grid pointer-events-none absolute inset-0 -z-10 opacity-80" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[repeating-linear-gradient(to_bottom,rgb(66_165_246_/_0.06)_0px,rgb(66_165_246_/_0.06)_1px,transparent_1px,transparent_5px),linear-gradient(to_bottom,rgb(0_0_0_/_0.55),transparent_18%,transparent_78%,rgb(0_0_0_/_0.7))]" />
      <div className="matrix-rain pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        {MATRIX_STREAMS.map((stream) => (
          <span
            key={stream.value}
            className={cn(
              "matrix-stream absolute top-0 font-mono font-semibold text-[#42a5f6]",
              stream.className,
            )}
            style={{
              animationDelay: stream.delay,
              ["--matrix-duration" as string]: stream.duration,
            }}
          >
            {stream.value}
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#42a5f6]/70 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#42a5f6]/55 to-transparent" />

      <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center gap-[clamp(1.25rem,4svh,2.5rem)] px-4 py-[clamp(1rem,3svh,2rem)]">
        <div className="max-w-3xl text-center">
          <h2 className="font-display text-2xl font-bold tracking-normal text-[#f4faff] drop-shadow-[0_0_18px_rgb(66_165_246_/_0.48)] md:text-3xl">
            {t("marquee.titlePrefix")}{" "}
            <span className="bg-gradient-to-r from-[#d8edff] via-[#42a5f6] to-[#42a5f6] bg-clip-text text-transparent">
              {t("marquee.titleGradient")}
            </span>
          </h2>
          <p className="mt-2 text-sm text-[#9bd3ff] md:text-base">
            {t("marquee.subtitle")}
          </p>
        </div>

        <RealOrFakeGame />
      </div>
    </section>
  );
}
