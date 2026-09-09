export type VideoDuration = 5 | 10;
export type VideoAspectRatio = "9:16" | "16:9" | "1:1";
export type VideoCameraMovement =
  | "fixed"
  | "slow_zoom"
  | "dolly_in"
  | "truck"
  | "light_pan";
export type VideoMotionIntensity = "low" | "natural" | "dynamic";
export type VideoStyle = "realistic" | "cinematic" | "ugc" | "luxury_ad";
export type VideoQuality = "standard" | "high";
export type SubtitleStyle =
  | "minimal_white"
  | "luxury_gold"
  | "tiktok_dynamic"
  | "black_on_white";
export type SubtitlePosition = "bottom" | "center" | "top";

export type VideoMotionPreset = {
  id: string;
  label: string;
  prompt: string;
};

export const VIDEO_MOTION_PRESETS: VideoMotionPreset[] = [
  {
    id: "camera_look",
    label: "Regard caméra",
    prompt:
      "Léger sourire, regard naturel vers la caméra, petit mouvement de tête subtil, lumière réaliste.",
  },
  {
    id: "luxury_walk",
    label: "Marche luxe",
    prompt:
      "La personne avance calmement avec assurance, vêtements et arrière-plan bougent naturellement, allure premium.",
  },
  {
    id: "car_exit",
    label: "Sortie de voiture",
    prompt:
      "Ouverture de portière fluide, sortie élégante du véhicule, caméra cinématique latérale.",
  },
  {
    id: "rooftop_night",
    label: "Rooftop de nuit",
    prompt:
      "Caméra lente, skyline lumineux en arrière-plan, vent léger, ambiance nocturne premium.",
  },
  {
    id: "private_jet",
    label: "Jet privé",
    prompt:
      "Marche vers l'avion sur le tarmac, mouvements réalistes, lumière de fin de journée dorée.",
  },
  {
    id: "fine_dining",
    label: "Restaurant chic",
    prompt:
      "Sourire subtil, caméra qui se rapproche doucement, ambiance restaurant haut de gamme.",
  },
  {
    id: "ugc_tiktok",
    label: "Vidéo UGC / TikTok",
    prompt:
      "Mouvement naturel de téléphone en main, authenticité UGC, format vertical, énergie organique.",
  },
  {
    id: "talking_head",
    label: "Face caméra parlante",
    prompt:
      "Visage stable centré, synchronisation labiale naturelle implicite, gestes légers des mains.",
  },
  {
    id: "before_after",
    label: "Transformation avant/après",
    prompt:
      "Mouvement de caméra dynamique, transition nette entre deux ambiances, rythme accrocheur.",
  },
  {
    id: "product_car",
    label: "Produit / voiture",
    prompt:
      "Travelling lent autour du sujet, reflets réalistes, rendu publicitaire premium luxe.",
  },
];

export const VIDEO_VOICE_SCRIPT_PRESETS = [
  "Personne ne croyait en moi, alors j'ai arrêté d'expliquer.",
  "Ce n'est pas de la chance. C'est le résultat du travail en silence.",
  "Le but n'était pas de paraître riche. Le but était de devenir libre.",
  "J'ai imaginé cette vie avant de la construire.",
  "Tu n'as pas besoin d'être prêt. Tu dois juste commencer.",
];

export const VIDEO_STUDIO_STEPS = [
  "Image",
  "Mouvement",
  "Voix",
  "Sous-titres",
  "Générer",
] as const;

export function computeVideoCreditCost(params: {
  durationSec: VideoDuration;
  quality: VideoQuality;
  voiceEnabled: boolean;
}): number {
  let cost = params.durationSec === 10 ? 35 : 20;
  if (params.quality === "high") cost = Math.round(cost * 1.5);
  if (params.voiceEnabled) cost += 5;
  return cost;
}

export function maxVoiceChars(durationSec: VideoDuration): number {
  return durationSec === 10 ? 280 : 140;
}
