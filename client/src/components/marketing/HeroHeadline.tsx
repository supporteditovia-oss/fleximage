import { motion, type Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type HeroHeadlineProps = {
  arrowClassName?: string;
  arrowSvgClassName?: string;
  className?: string;
  showArrow?: boolean;
  showMobileArrow?: boolean;
  subtitle?: string;
  variants?: Variants;
};

export default function HeroHeadline({
  arrowClassName,
  arrowSvgClassName,
  className,
  showArrow = true,
  showMobileArrow = true,
  subtitle,
  variants,
}: HeroHeadlineProps) {
  const { t } = useTranslation();

  return (
    <div className={cn("relative flex flex-col items-center justify-center", className)}>
      <motion.h1
        variants={variants}
        className="font-display text-[2.28rem] min-[380px]:text-[2.55rem] min-[430px]:text-[2.75rem] md:text-6xl font-bold leading-[1.04] md:leading-[1.1] tracking-tight text-center"
      >
        {t("hero.titlePrefix")}{" "}
        <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {t("hero.titleGradient")}
        </span>
        <span className="block md:inline"> {t("hero.titleSuffix")}</span>
      </motion.h1>
      {subtitle && (
        <motion.p
          variants={variants}
          className="mt-5 max-w-3xl whitespace-pre-line text-center text-lg font-medium leading-snug text-muted-foreground md:text-xl"
        >
          {subtitle}
        </motion.p>
      )}
      {showArrow && (
        <motion.div
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 0.7 } }}
          className={cn(
            "absolute top-full -mt-1 right-4 min-[500px]:right-16 md:-mt-2 md:right-0 md:mr-40 pointer-events-none",
            showMobileArrow ? "hidden min-[380px]:block" : "hidden md:block",
            arrowClassName,
          )}
        >
          <svg
            viewBox="0 0 512 512"
            preserveAspectRatio="xMidYMid meet"
            className={cn(
              "animate-arrow-bounce h-[92px] md:h-[112px] w-auto text-secondary",
              arrowSvgClassName,
            )}
          >
            <g
              transform="translate(512,512) scale(-0.1,-0.1)"
              fill="currentColor"
              stroke="none"
            >
              <path d="M1016 4325 c-11 -11 -14 -28 -11 -58 3 -23 10 -89 16 -147 25 -243 85 -516 167 -760 156 -465 380 -843 747 -1259 375 -427 866 -703 1595 -895 l125 -33 -60 -13 c-290 -59 -695 -192 -711 -234 -12 -30 47 -115 98 -142 37 -19 68 -18 125 7 196 86 588 187 868 224 136 18 146 26 115 90 -13 27 -39 59 -60 74 -44 30 -248 330 -385 565 -116 199 -111 192 -161 216 -83 41 -110 6 -65 -84 31 -63 218 -368 303 -493 35 -53 44 -73 33 -73 -24 0 -281 65 -452 115 -493 144 -836 321 -1102 569 -239 225 -432 476 -599 781 -222 406 -358 852 -402 1324 -15 160 -31 191 -113 226 -45 19 -52 19 -71 0z" />
            </g>
          </svg>
        </motion.div>
      )}
    </div>
  );
}
