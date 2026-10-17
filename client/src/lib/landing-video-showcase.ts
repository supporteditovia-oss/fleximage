/**
 * Assets vitrine Vidéo IA landing.
 */
export type LandingVideoWorkflow = "i2v" | "v2v";

export type LandingVideoShowcaseSlot = {
  label: string;
  poster: string;
  video: string | null;
  alt: string;
  staticTag?: string;
};

export type LandingVideoShowcaseConfig = {
  id: LandingVideoWorkflow;
  index: string;
  prefix: LandingVideoWorkflow;
  beforePoster: string;
  beforeVideo: string | null;
  beforeStaticTag?: string;
  afterPoster: string;
  afterVideo: string | null;
};

/** Chemins médias — textes i18n appliqués dans `LandingVideoShowcase`. */
export const LANDING_VIDEO_SHOWCASE_ASSETS: LandingVideoShowcaseConfig[] = [
  {
    id: "i2v",
    index: "01",
    prefix: "i2v",
    beforePoster: "/assets/landing-v2/restaurant-before.webp",
    beforeVideo: null,
    beforeStaticTag: "Photo",
    afterPoster: "/assets/landing-v2/restaurant-after-poster.jpg",
    afterVideo: "/assets/landing-v2/restaurant-after.mp4",
  },
  {
    id: "v2v",
    index: "02",
    prefix: "v2v",
    beforePoster: "/assets/landing-v2/mercedes-before-poster.jpg",
    beforeVideo: "/assets/landing-v2/mercedes-before.mp4",
    afterPoster: "/assets/landing-v2/lamborghini-after-poster.jpg",
    afterVideo: "/assets/landing-v2/lamborghini-after.mp4",
  },
];
