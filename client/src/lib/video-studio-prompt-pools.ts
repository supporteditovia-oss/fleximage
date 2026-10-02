import type { V2VStudioIntent } from "@/lib/v2v-studio-intent";
import type { VideoWorkflow } from "@/lib/video-studio-config";

/** Idées défilantes (typewriter) — courtes, sans jargon clé/OEM. */
export const VIDEO_I2V_TYPEWRITER_IDEAS: string[] = [
  "Plongeon lent dans une piscine infinity, éclaboussures cinéma…",
  "Marche vers la caméra, sourire discret, lumière dorée…",
  "Cheveux au vent sur un rooftop Dubai au coucher du soleil…",
  "Tourne lentement la tête vers l'objectif, ambiance luxe…",
];

const V2V_SCENE_TYPEWRITER: string[] = [
  "Remplace ma voiture par une Urus Mansory noire, même route…",
  "Mets-moi à Dubai Marina la nuit, skyline illuminé…",
  "Transforme le fond en villa moderne face à l'océan…",
  "Remplace ma berline par une Rolls Phantom, même cadrage…",
  "Place la scène sur le pont d'un yacht au coucher du soleil…",
];

const V2V_MOTION_TYPEWRITER: string[] = [
  "Remplace le danseur par la personne de ma photo bonus, mêmes gestes…",
  "Body swap TikTok : autre personne, chorégraphie identique…",
  "Garde la danse, change uniquement le personnage, même caméra…",
  "Remplace l'homme qui bouge par mon visage, timing strict…",
];

/** Pool « Aléatoire » — prompts complets réalistes. */
export const VIDEO_I2V_RANDOM_PROMPTS: string[] = [
  "Chute lente dans l'eau turquoise, caméra suit le mouvement, ralenti cinématique.",
  "Marche élégante vers l'objectif, sourire confiant, lumière naturelle douce.",
  "Regard caméra puis détourne la tête, cheveux bougent légèrement, style pub luxe.",
  "Saut discret sur place, énergie positive, fond urbain flou.",
];

export const VIDEO_V2V_SCENE_RANDOM_PROMPTS: string[] = [
  "Remplace ma voiture par une Lamborghini Urus Mansory noire mat, même angle et même route.",
  "Remplace ma voiture par une Ferrari Purosangue rouge, carrosserie propre, même décor.",
  "Mets-moi à Dubai avec la skyline en arrière-plan, lumière de fin de journée.",
  "Transforme l'intérieur en salon de villa ultra moderne, vue mer.",
  "Remplace le fond par un tarmac avec jet privé, ambiance executive.",
  "Change ma tenue pour un costume sur-mesure noir, même pose et gestes.",
  "Remplace la personne par une célébrité photoréaliste, même mouvement de caméra.",
  "Transforme ma maison visible en villa de luxe avec piscine infinity.",
];

export const VIDEO_V2V_MOTION_RANDOM_PROMPTS: string[] = [
  "Remplace la personne qui danse par celle de ma photo bonus — gestes et timing identiques.",
  "Body swap : une autre personne reprend la chorégraphie TikTok, caméra inchangée.",
  "Garde exactement les mouvements, remplace uniquement le corps par un mannequin photoréaliste.",
  "Même meme viral, remplace le personnage par quelqu'un d'autre, gestes strictement identiques.",
  "Change la tenue pour une pièce de créateur, garde la danse et la caméra.",
];

export function videoTypewriterIdeas(
  workflow: VideoWorkflow,
  v2vIntent: V2VStudioIntent,
): string[] {
  if (workflow === "image_to_video") return VIDEO_I2V_TYPEWRITER_IDEAS;
  return v2vIntent === "motion" ? V2V_MOTION_TYPEWRITER : V2V_SCENE_TYPEWRITER;
}

export function videoRandomPromptPool(
  workflow: VideoWorkflow,
  v2vIntent: V2VStudioIntent,
): string[] {
  if (workflow === "image_to_video") return VIDEO_I2V_RANDOM_PROMPTS;
  return v2vIntent === "motion"
    ? VIDEO_V2V_MOTION_RANDOM_PROMPTS
    : VIDEO_V2V_SCENE_RANDOM_PROMPTS;
}

export function pickVideoRandomPrompt(
  workflow: VideoWorkflow,
  v2vIntent: V2VStudioIntent,
): string {
  const pool = videoRandomPromptPool(workflow, v2vIntent);
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0] ?? "";
}
