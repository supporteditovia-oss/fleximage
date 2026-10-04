import type { V2VStudioIntent } from "@/lib/v2v-studio-intent";
import type { VideoWorkflow } from "@/lib/video-studio-config";

/** Idées défilantes (typewriter) — courtes, alignées sur les pools « Aléatoire ». */
export const VIDEO_I2V_TYPEWRITER_IDEAS: string[] = [
  "Plongée lente dans une piscine à débordement, éclaboussures cinématiques…",
  "Montée en hélicoptère au sommet d'un gratte-ciel, coucher de soleil…",
  "Marche lente sur un tapis rouge, flashs de photographes…",
  "Ouverture de portière d'une supercar, sortie élégante au ralenti…",
  "Dégustation de champagne sur un yacht, horizon en arrière-plan…",
  "Montée à bord d'un jet privé, escalier déployé, coucher de soleil…",
];

const V2V_SCENE_TYPEWRITER: string[] = [
  "Rooftop de Dubaï au coucher du soleil, skyline en arrière-plan…",
  "Intérieur de yacht de luxe, vue sur mer…",
  "Salon de villa ultra-moderne, vue mer…",
  "Intérieur de jet privé, hublots et cuir beige…",
  "Suite d'hôtel, vue panoramique sur la ville de nuit…",
  "Héliport privé au sommet d'un gratte-ciel…",
  "Costume sur mesure noir, même pose et gestuelle…",
  "Lamborghini Urus noire, habitacle authentique complet…",
  "Rolls-Royce Cullinan, boiseries et cuir beige…",
];

const V2V_MOTION_TYPEWRITER: string[] = [
  "Remplace la personne qui danse par ma photo, même mouvement…",
  "Remplace le danseur par moi, même rythme et chorégraphie…",
  "Chorégraphie identique, visage et corps par ma photo…",
  "Mon avatar, même énergie et même tempo…",
];

/** Pool « Aléatoire » Image→Vidéo — animation cinématique premium. */
export const VIDEO_I2V_RANDOM_PROMPTS: string[] = [
  "Plongée lente dans une piscine à débordement, éclaboussures cinématiques",
  "Montée en hélicoptère au sommet d'un gratte-ciel, vue aérienne panoramique au coucher du soleil",
  "Marche lente sur un tapis rouge, flashs de photographes en arrière-plan",
  "Ouverture de portière d'une supercar, sortie élégante au ralenti",
  "Dégustation de champagne sur un yacht, horizon en arrière-plan",
  "Montée à bord d'un jet privé, escalier déployé, coucher de soleil",
];

/** Pool « Aléatoire » Scène & luxe — décor, tenue, véhicule. */
export const VIDEO_V2V_SCENE_RANDOM_PROMPTS: string[] = [
  "Change le fond pour un rooftop de Dubaï au coucher du soleil, skyline en arrière-plan",
  "Transforme l'arrière-plan en intérieur de yacht de luxe, vue sur mer",
  "Remplace le décor par un salon de villa ultra-moderne, vue mer",
  "Transforme la scène en intérieur de jet privé, hublots et cuir beige",
  "Change le décor pour une suite d'hôtel avec vue panoramique sur la ville, de nuit",
  "Remplace le fond par un héliport privé au sommet d'un gratte-ciel",
  "Change ma tenue pour un costume sur mesure noir, même pose et gestuelle",
  "Remplace la voiture par une Lamborghini Urus noire, habitacle authentique complet",
  "Transforme l'intérieur en Rolls-Royce Cullinan, boiseries et cuir beige",
];

/** Pool « Aléatoire » Mouvement — remplacement personne / chorégraphie. */
export const VIDEO_V2V_MOTION_RANDOM_PROMPTS: string[] = [
  "Remplace la personne qui danse par ma photo, garde exactement le même mouvement",
  "Remplace le danseur par moi, même rythme et même chorégraphie",
  "Garde la chorégraphie à l'identique, remplace uniquement le visage et le corps par ma photo",
  "Remplace la personne par mon avatar, même énergie et même tempo",
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
