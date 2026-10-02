/**
 * Grille cible v2 — affichée aux admins uniquement (Paramètres).
 * La facturation prod reste sur `credit-costs.ts` tant que PRICING_V2_ENABLED ≠ 1.
 */

import { computeVoiceGenerationCreditCost } from "./credit-costs";
import { computeImageToVideoCreditCost } from "./video-i2v-pricing";
import { computeV2VStudioCreditCost } from "./video-ultra-pricing";

export const ADMIN_PRICING_REFERENCE = {
  version: "v2-preview" as const,
  prodBillingNote:
    "Clients : débit actuel inchangé (ex. vidéo I2V 60 cr) jusqu’à activation v2.",

  creditBurn: {
    image: 10,
    videoI2V: 85,
    videoVoiceExtra: 5,
    videoI2VWithVoice: 90,
    videoV2V: 95,
    voicePerMinute: 10,
    voiceClone: 30,
  },

  subscriptions: [
    {
      id: "discovery",
      label: "Découverte",
      priceLabel: "9,90 €/mois",
      creditsPerMonth: 250,
    },
    {
      id: "essential",
      label: "Essentiel",
      priceLabel: "24,90 €/mois",
      creditsPerMonth: 1200,
      recommended: true,
    },
    {
      id: "ultimate",
      label: "Ultimate",
      priceLabel: "49,90 €/mois",
      creditsPerMonth: 2850,
    },
  ],

  creditPacks: [
    { id: "mini", label: "Boost Mini", priceLabel: "3,49 €", credits: 90 },
    { id: "standard", label: "Boost Standard", priceLabel: "7,99 €", credits: 210 },
    { id: "plus", label: "Boost Plus", priceLabel: "14,99 €", credits: 450 },
  ],
} as const;

/** Coût vidéo affiché en preview admin (grille v2) — ne remplace pas l’API prod. */
export function adminPreviewVideoCreditCost(params: {
  workflow?: "image_to_video" | "video_to_video";
  durationSec?: number;
  quality?: "standard" | "high";
  voiceEnabled?: boolean;
  preserveSourceAudio?: boolean;
  v2vResolution?: unknown;
  v2vProvider?: string | null;
}): number {
  const b = ADMIN_PRICING_REFERENCE.creditBurn;
  if (params.workflow === "video_to_video") {
    return computeV2VStudioCreditCost({
      sourceVideoDurationSec: params.durationSec ?? 5,
      resolution: params.v2vResolution ?? "720p",
      preserveSourceAudio: params.preserveSourceAudio,
      voiceExtraCredit: b.videoVoiceExtra,
      v2vProvider: params.v2vProvider ?? null,
    });
  }
  return computeImageToVideoCreditCost({
    durationSec: params.durationSec,
    quality: params.quality,
    voiceEnabled: params.voiceEnabled,
    billingGrid: "admin_v2",
  });
}

/** Coût affiché sur « Générer la voix » (grille v2 admin / studio voix). */
export function adminPreviewVoiceGenerateCreditCost(
  includesNewClone: boolean,
  scriptText?: string,
): number {
  const b = ADMIN_PRICING_REFERENCE.creditBurn;
  const tts =
    scriptText?.trim().length > 0
      ? computeVoiceGenerationCreditCost(scriptText)
      : b.voicePerMinute;
  return tts + (includesNewClone ? b.voiceClone : 0);
}
