/**
 * Assets showcase Vidéo IA landing.
 */
export type LandingVideoWorkflow = "i2v" | "v2v";

export type LandingVideoShowcaseSlot = {
  label: string;
  /** Poster ou image statique */
  poster: string;
  /** Video URL; null means this slot is a static image. */
  video: string | null;
  alt: string;
  /** Badge overlay quand pas de fichier vidéo */
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
      poster: "/assets/landing-v2/restaurant-before.webp",
      video: null,
      alt: "Homme en pull noir assis au restaurant avec son plat",
      staticTag: "Photo",
    },
    after: {
      label: "Clip animé · 5 s",
      poster: "/assets/landing-v2/restaurant-after-poster.jpg",
      video: "/assets/landing-v2/restaurant-after.mp4",
      alt: "Homme en pull noir en train de manger au restaurant, animé par l’IA",
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
      poster: "/assets/landing-v2/mercedes-before-poster.jpg",
      video: "/assets/landing-v2/mercedes-before.mp4",
      alt: "Vidéo source d’un homme en train de conduire une Mercedes",
      staticTag: "Vidéo",
    },
    after: {
      label: "Séquence transformée",
      poster: "/assets/landing-v2/lamborghini-after-poster.jpg",
      video: "/assets/landing-v2/lamborghini-after.mp4",
      alt: "Vidéo transformée d’un homme en train de conduire une Lamborghini",
    },
  },
];
