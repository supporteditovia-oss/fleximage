export type VideoWorkflow = "image_to_video" | "video_to_video";
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

/** Presets rapides pour le mode Image → Vidéo. */
export const VIDEO_MOTION_PRESETS: VideoMotionPreset[] = [
  {
    id: "rooftop_night",
    label: "Rooftop",
    prompt:
      "Caméra lente, skyline lumineux en arrière-plan, vent léger, ambiance nocturne premium.",
  },
  {
    id: "private_jet",
    label: "Jet",
    prompt:
      "Marche vers l'avion sur le tarmac, mouvements réalistes, lumière de fin de journée dorée.",
  },
  {
    id: "luxury_walk",
    label: "Marche",
    prompt:
      "Il marche lentement, regarde la caméra et sourit. Mouvement naturel, allure premium.",
  },
];

export type VehiclePreset = {
  id: string;
  label: string;
  prompt: string;
};

export const VIDEO_VEHICLE_PRESETS: VehiclePreset[] = [
  {
    id: "lamborghini_urus",
    label: "Lamborghini Urus",
    prompt:
      "Lamborghini Urus noir mat, proportions réalistes, jantes d'origine, reflets crédibles.",
  },
  {
    id: "porsche_gt3_rs",
    label: "Porsche GT3 RS",
    prompt:
      "Porsche 911 GT3 RS, aileron arrière, couleur sport, détails carrosserie fidèles.",
  },
  {
    id: "ferrari",
    label: "Ferrari",
    prompt:
      "Ferrari rouge Rosso Corsa, supercar italienne, lignes agressives, rendu photoréaliste.",
  },
  {
    id: "g_wagon",
    label: "G-Wagon",
    prompt:
      "Mercedes-Benz G-Class G-Wagon noir, carrosserie cubique iconique, finitions luxe.",
  },
];

export const VIDEO_VOICE_SCRIPT_PRESETS = [
  "Personne ne croyait en moi, alors j'ai arrêté d'expliquer.",
  "Ce n'est pas de la chance. C'est le résultat du travail en silence.",
  "Le but n'était pas de paraître riche. Le but était de devenir libre.",
  "J'ai imaginé cette vie avant de la construire.",
  "Tu n'as pas besoin d'être prêt. Tu dois juste commencer.",
];

export function computeVideoCreditCost(params: {
  durationSec?: VideoDuration;
  quality?: VideoQuality;
  voiceEnabled?: boolean;
  workflow?: VideoWorkflow;
}): number {
  if (params.workflow === "video_to_video") return 25;
  const durationSec = params.durationSec ?? 5;
  const quality = params.quality ?? "standard";
  const voiceEnabled = params.voiceEnabled ?? false;
  let cost = durationSec === 10 ? 35 : 20;
  if (quality === "high") cost = Math.round(cost * 1.5);
  if (voiceEnabled) cost += 5;
  return cost;
}

export function maxVoiceChars(durationSec: VideoDuration): number {
  return durationSec === 10 ? 280 : 140;
}
