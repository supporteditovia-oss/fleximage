/**
 * Assets vitrine Vidéo IA landing.
 * Remplacer `afterVideo` / `beforeVideo` par vos fichiers quand prêts :
 * ex. `/assets/landing-v2/i2v-demo.mp4`
 */
export type LandingVideoWorkflow = "i2v" | "v2v";

export type LandingVideoShowcaseSlot = {
  label: string;
  /** Poster ou image statique */
  poster: string;
  /** MP4/WebM — null = placeholder animé jusqu’à livraison */
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
      poster: "/assets/landing-v2/dubai-original.jpg",
      video: null,
      alt: "Photo source avant animation",
      staticTag: "Photo",
    },
    after: {
      label: "Clip animé · 5 s",
      poster: "/assets/landing-v2/dubai-generated.jpg",
      video: null,
      alt: "Aperçu clip Image vers Vidéo",
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
      poster: "/assets/landing-v2/portrait-car-original.jpg",
      video: null,
      alt: "Vidéo source filmée au smartphone",
      staticTag: "Vidéo",
    },
    after: {
      label: "Séquence transformée",
      poster: "/assets/landing-v2/portrait-car-generated.jpg",
      video: null,
      alt: "Aperçu séquence Vidéo vers Vidéo",
    },
  },
];
