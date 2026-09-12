export type VideoWorkflow = "image_to_video" | "video_to_video";

/** Plafond rentable Kling Motion Control 720p — prix fixe 50 crédits / vidéo. */
export const VIDEO_V2V_MAX_DURATION_SEC = 8;
/** Marge metadata smartphone : une vidéo « 8s » vaut souvent 8,03–8,15s réelles. */
export const VIDEO_V2V_MAX_DURATION_SLACK_SEC = 0.5;
export const VIDEO_FLAT_CREDIT_COST = 50;
export const VIDEO_VOICE_EXTRA_CREDIT = 5;
export const VIDEO_V2V_MIN_DURATION_SEC = 3;
/** Upload direct R2 — les vidéos smartphone 8s dépassent souvent 20 Mo. */
export const VIDEO_V2V_MAX_SIZE_MB = 100;
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

/** Prompt automatique — l'IA anime la photo sans saisie utilisateur. */
export const DEFAULT_IMAGE_TO_VIDEO_PROMPT =
  "Mouvement naturel et cinématique : le sujet s'anime avec réalisme (expressions, micro-mouvements, regard vivant). Une seule prise fluide, rendu premium photoréaliste.";

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

export type V2VScenePreset = {
  id: string;
  label: string;
  emoji: string;
  prompt: string;
};

/** Presets rapides Vidéo → Vidéo — scènes, personnages, objets, lieux. */
export const VIDEO_V2V_PRESETS: V2VScenePreset[] = [
  {
    id: "dubai",
    label: "Dubai",
    emoji: "🏙️",
    prompt:
      "Transporte-moi à Dubai Marina la nuit, skyline illuminé en arrière-plan, ambiance luxe.",
  },
  {
    id: "supercar",
    label: "Supercar",
    emoji: "🏎️",
    prompt:
      "Remplace l'objet ou le véhicule par une Lamborghini Urus noire mat, reflets crédibles.",
  },
  {
    id: "celebrity",
    label: "Célébrité",
    emoji: "⭐",
    prompt:
      "Remplace la personne par une célébrité photoréaliste, même pose et mouvements de caméra.",
  },
  {
    id: "outfit",
    label: "Tenue luxe",
    emoji: "👔",
    prompt:
      "Change ma tenue pour un costume ou une robe de créateur haut de gamme, même corps et gestes.",
  },
  {
    id: "yacht",
    label: "Yacht",
    emoji: "🛥️",
    prompt:
      "Place-moi sur le pont d'un yacht de luxe en Méditerranée, mer calme, lumière dorée.",
  },
  {
    id: "jet",
    label: "Jet privé",
    emoji: "✈️",
    prompt:
      "Déplace la scène sur un tarmac avec jet privé en arrière-plan, lumière de fin de journée.",
  },
];

/** @deprecated use VIDEO_V2V_PRESETS */
export const VIDEO_VEHICLE_PRESETS = VIDEO_V2V_PRESETS;

export const VIDEO_VOICE_SCRIPT_PRESETS = [
  "Personne ne croyait en moi, alors j'ai arrêté d'expliquer.",
  "Ce n'est pas de la chance. C'est le résultat du travail en silence.",
  "Le but n'était pas de paraître riche. Le but était de devenir libre.",
  "J'ai imaginé cette vie avant de la construire.",
  "Tu n'as pas besoin d'être prêt. Tu dois juste commencer.",
];

export function computeV2VCreditCost(
  _sourceVideoDurationSec?: number | null,
): number {
  return VIDEO_FLAT_CREDIT_COST;
}

/** 1 vidéo = 50 crédits (max 8s, 720p) ; +5 si voix IA (I2V) ou voix filmée (V2V). */
export function computeVideoCreditCost(params: {
  durationSec?: VideoDuration;
  quality?: VideoQuality;
  voiceEnabled?: boolean;
  preserveSourceAudio?: boolean;
  workflow?: VideoWorkflow;
  sourceVideoDurationSec?: number | null;
}): number {
  let cost =
    params.workflow === "video_to_video"
      ? computeV2VCreditCost(params.sourceVideoDurationSec)
      : VIDEO_FLAT_CREDIT_COST;
  if (params.workflow === "video_to_video") {
    if (params.preserveSourceAudio) cost += VIDEO_VOICE_EXTRA_CREDIT;
  } else if (params.voiceEnabled) {
    cost += VIDEO_VOICE_EXTRA_CREDIT;
  }
  return cost;
}

export function maxVoiceCharsForVideoDuration(durationSec?: number | null): number {
  const d = Number(durationSec) || 5;
  if (d >= 10) return 280;
  if (d >= 8) return 200;
  return 140;
}

export function maxVoiceChars(durationSec: VideoDuration): number {
  return maxVoiceCharsForVideoDuration(durationSec);
}
