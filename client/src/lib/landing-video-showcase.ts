/**
 * Assets vitrine Vidéo IA landing (posters + MP4 optionnels).
 * Déposer les fichiers dans `client/public/assets/landing-v2/`.
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
  title: string;
  tech: string;
  description: string;
  before: LandingVideoShowcaseSlot;
  after: LandingVideoShowcaseSlot;
};

/** Chemins médias — textes i18n appliqués dans `LandingVideoShowcase`. */
export const LANDING_VIDEO_SHOWCASE_ASSETS = [
  {
    id: "i2v" as const,
    index: "01",
    prefix: "i2v" as const,
    beforePoster: "/assets/landing-v2/i2v-restaurant-source.webp",
    beforeVideo: null as string | null,
    afterPoster: "/assets/landing-v2/i2v-restaurant-source.webp",
    afterVideo: "/assets/landing-v2/i2v-restaurant-generated.mp4",
  },
  {
    id: "v2v" as const,
    index: "02",
    prefix: "v2v" as const,
    beforePoster: "/assets/landing-v2/automobile-original.jpg",
    beforeVideo: "/assets/landing-v2/v2v-mercedes-source.mp4",
    afterPoster: "/assets/landing-v2/portrait-car-generated.jpg",
    afterVideo: "/assets/landing-v2/v2v-lamborghini-generated.mp4",
  },
] as const;

export const LANDING_VIDEO_SHOWCASES: LandingVideoShowcaseConfig[] = [
  {
    id: "i2v",
    index: "01",
    title: "Cinématique photo",
    tech: "Image → Vidéo",
    description:
      "Une image fixe devient un plan vivant — lumière, profondeur et mouvement de caméra en cinq secondes.",
    before: {
      label: "Photo source",
      poster: LANDING_VIDEO_SHOWCASE_ASSETS[0].beforePoster,
      video: LANDING_VIDEO_SHOWCASE_ASSETS[0].beforeVideo,
      alt: "Homme au restaurant — photo source",
      staticTag: "Photo",
    },
    after: {
      label: "Clip animé · 5 s",
      poster: LANDING_VIDEO_SHOWCASE_ASSETS[0].afterPoster,
      video: LANDING_VIDEO_SHOWCASE_ASSETS[0].afterVideo,
      alt: "Homme au restaurant — clip Image vers Vidéo",
    },
  },
  {
    id: "v2v",
    index: "02",
    title: "Séquence transformée",
    tech: "Vidéo → Vidéo",
    description:
      "Votre plan filmé au smartphone, réinventé — personnage, objet ou véhicule — le geste caméra reste le vôtre.",
    before: {
      label: "Clip smartphone",
      poster: LANDING_VIDEO_SHOWCASE_ASSETS[1].beforePoster,
      video: LANDING_VIDEO_SHOWCASE_ASSETS[1].beforeVideo,
      alt: "Conduite au volant — clip source Mercedes",
      staticTag: "Vidéo",
    },
    after: {
      label: "Séquence transformée",
      poster: LANDING_VIDEO_SHOWCASE_ASSETS[1].afterPoster,
      video: LANDING_VIDEO_SHOWCASE_ASSETS[1].afterVideo,
      alt: "Même plan — véhicule transformé en Lamborghini",
    },
  },
];
