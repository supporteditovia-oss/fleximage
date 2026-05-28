import * as React from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import HeroHeadline from "@/components/marketing/HeroHeadline";
import { useAuth } from "@/hooks/use-auth";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

const itemVariants = {
  hidden: { y: 18, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

const LIVE_PRANK_MIN_COUNT = 20_000;
const LIVE_PRANK_MAX_COUNT = 30_000;
const REVIEW_MIN_COUNT = 2_000;
const REVIEW_MAX_COUNT = 5_000;

const getInitialLivePrankCount = () =>
  LIVE_PRANK_MIN_COUNT +
  Math.floor(Math.random() * (LIVE_PRANK_MAX_COUNT - LIVE_PRANK_MIN_COUNT + 1));

const getInitialReviewCount = () =>
  REVIEW_MIN_COUNT +
  Math.floor(Math.random() * (REVIEW_MAX_COUNT - REVIEW_MIN_COUNT + 1));

export default function SimpleHeroSection() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [livePrankCount, setLivePrankCount] = React.useState(
    getInitialLivePrankCount,
  );
  const [reviewCount] = React.useState(getInitialReviewCount);

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      setLivePrankCount((count) => count + 1 + Math.floor(Math.random() * 2));
    }, 2600);

    return () => window.clearInterval(interval);
  }, []);

  const formattedLivePrankCount = React.useMemo(
    () =>
      new Intl.NumberFormat(i18n.resolvedLanguage || undefined).format(
        livePrankCount,
      ),
    [i18n.resolvedLanguage, livePrankCount],
  );
  const formattedReviewCount = React.useMemo(
    () =>
      new Intl.NumberFormat(i18n.resolvedLanguage || undefined).format(
        reviewCount,
      ),
    [i18n.resolvedLanguage, reviewCount],
  );

  const handleStart = () => {
    const destination = user ? "/generate" : "/register";
    navigate(destination);
  };

  return (
    <section className="relative flex min-h-[68svh] flex-col items-center justify-start overflow-hidden px-4 pb-4 pt-28 min-[380px]:pt-32 md:min-h-[70svh] md:justify-center md:pb-6 md:pt-20">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mx-auto flex w-full max-w-5xl flex-col items-center text-center"
      >
        <motion.div variants={itemVariants} className="mb-5 md:mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm backdrop-blur-md md:px-4 md:py-2 md:text-sm">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-foreground/40 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span>
              <span className="text-foreground">{formattedLivePrankCount}</span>{" "}
              {t("hero.simpleLiveBadgeLabel")}
            </span>
          </div>
        </motion.div>

        <HeroHeadline
          variants={itemVariants}
          showMobileArrow={false}
        />

        <motion.div variants={itemVariants} className="mt-8 md:mt-12">
          <Button
            onClick={handleStart}
            className="group h-12 rounded-full border-0 bg-primary px-7 text-sm font-bold text-primary-foreground shadow-[0_14px_44px_rgb(0_0_0/0.12)] transition-transform active:scale-95 min-[380px]:px-8 min-[380px]:text-base md:h-[3.75rem] md:px-11 md:text-[1.05rem]"
          >
            {t("hero.simpleCta")}
            <ArrowRight className="ml-2 h-4.5 w-4.5 transition-transform group-hover:translate-x-1" />
          </Button>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground min-[380px]:text-sm">
            <span className="flex items-center gap-0.5 text-foreground">
              {[0, 1, 2, 3, 4].map((star) => (
                <Star key={star} className="h-3.5 w-3.5 fill-current min-[380px]:h-4 min-[380px]:w-4" />
              ))}
            </span>
            <span className="font-bold text-foreground">
              {t("hero.simpleRatingValue")}
            </span>
            <span>
              {t("hero.simpleRatingReviews", {
                reviewCount: formattedReviewCount,
              })}
            </span>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
