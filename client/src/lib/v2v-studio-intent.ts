import type { LucideIcon } from "lucide-react";
import { Car, PersonStanding } from "lucide-react";
import type { V2VScenePreset } from "@/lib/video-studio-config";
import { resolveV2VProviderForStudio } from "@/lib/v2v-prompt";

export type V2VStudioIntent = "motion" | "scene";

export type V2VIntentOption = {
  id: V2VStudioIntent;
  label: string;
  hint: string;
  detail: string;
  icon: LucideIcon;
};

/** Intention créative — jamais le nom du moteur API côté client. */
export const V2V_INTENT_OPTIONS: V2VIntentOption[] = [
  {
    id: "motion",
    label: "Mouvement",
    hint: "Danse · meme · autre personnage",
    detail: "Garde les gestes et la caméra. Rendu 720p ou 1080p.",
    icon: PersonStanding,
  },
  {
    id: "scene",
    label: "Scène & luxe",
    hint: "Dubai · yacht · voiture · décor",
    detail: "Transforme le décor ou l'habitacle. 4K disponible.",
    icon: Car,
  },
];

export const V2V_MOTION_PRESETS: V2VScenePreset[] = [
  {
    id: "tiktok_dance",
    label: "TikTok",
    emoji: "🎵",
    prompt:
      "Garde exactement la chorégraphie et le timing. Remplace la personne par un autre corps photoréaliste, même mouvements.",
  },
  {
    id: "meme_move",
    label: "Meme",
    emoji: "😎",
    prompt:
      "Même mouvement que la vidéo source, meme viral — personnage remplacé, gestes identiques.",
  },
  {
    id: "body_swap",
    label: "Autre corps",
    emoji: "🕺",
    prompt:
      "Body swap : une autre personne reprend la scène avec les mêmes gestes et la même caméra.",
  },
  {
    id: "outfit_motion",
    label: "Tenue",
    emoji: "👗",
    prompt:
      "Change la tenue pour une pièce de créateur, garde le corps, la danse et les mouvements identiques.",
  },
];

export function v2vProviderFromIntent(intent: V2VStudioIntent): "kling_motion" | "runway_aleph" {
  return intent === "motion" ? "kling_motion" : "runway_aleph";
}

/** Aligné serveur dès qu'un prompt est saisi ; sinon l'intention choisie guide prix & qualité. */
export function resolveV2VBillingProvider(
  intent: V2VStudioIntent,
  userPrompt: string,
): "kling_motion" | "runway_aleph" {
  const trimmed = String(userPrompt || "").trim();
  if (trimmed) return resolveV2VProviderForStudio(trimmed);
  return v2vProviderFromIntent(intent);
}

export function parseV2VIntentFromUrl(raw: string | null): V2VStudioIntent | null {
  if (raw === "motion" || raw === "scene") return raw;
  return null;
}

export function v2vIntentPlaceholder(intent: V2VStudioIntent): string {
  return intent === "motion"
    ? "Ex. même danse, autre personne…"
    : "Ex. Urus noire à la place de ma voiture…";
}

export function appendV2VPromptSuffix(prompt: string): string {
  const base = String(prompt || "").trim();
  if (!base) return base;
  if (/garde le décor|même mouvement|gestes identiques/i.test(base)) return base;
  if (/danse|meme|même mouvement|body swap|choré/i.test(base)) {
    return `${base} Garde les mouvements et la caméra identiques.`;
  }
  return `${base} Garde le décor, le sol, les reflets et les mouvements de caméra identiques.`;
}
