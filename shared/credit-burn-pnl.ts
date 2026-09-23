/**
 * Pire cas : l'utilisateur brûle tous les crédits sur les actions les plus chères (API).
 * Utilise les coûts crédits prod (credit-costs.ts) + COGS API (pricing-economics).
 */
import {
  IMAGE_CREDIT_COST,
  VIDEO_I2V_CREDIT_COST,
  VIDEO_V2V_CREDIT_COST,
  VOICE_CLONE_CREDIT_COST,
  VOICE_CREDIT_COST,
} from "./credit-costs";
import { PRICING_ECONOMICS, stripeFeeEur } from "./pricing-economics";

const BURN_ACTIONS = [
  {
    id: "voiceClone",
    creditCost: VOICE_CLONE_CREDIT_COST,
    cogsEur: PRICING_ECONOMICS.unitCosts.audioVoiceClone_setup.cost,
  },
  {
    id: "videoV2V",
    creditCost: VIDEO_V2V_CREDIT_COST,
    cogsEur: PRICING_ECONOMICS.unitCosts.videoV2V_8s_720p_motion_noAudio.cost,
  },
  {
    id: "videoI2V",
    creditCost: VIDEO_I2V_CREDIT_COST,
    cogsEur: PRICING_ECONOMICS.unitCosts.videoI2V_5s_720p_noAudio.cost,
  },
  {
    id: "voiceMinute",
    creditCost: VOICE_CREDIT_COST,
    cogsEur: PRICING_ECONOMICS.unitCosts.audioTTS_perMinute.cost,
  },
  {
    id: "image",
    creditCost: IMAGE_CREDIT_COST,
    cogsEur: PRICING_ECONOMICS.unitCosts.imageNanoBanana2_1K.cost,
  },
] as const;

/** COGS max si on dépense `credits` en priorité aux actions les plus chères €/cr. */
export function worstCaseCogsEurForCredits(credits: number): number {
  let remaining = Math.max(0, Math.floor(credits));
  let cogs = 0;
  for (const action of BURN_ACTIONS) {
    const count = Math.floor(remaining / action.creditCost);
    if (count <= 0) continue;
    cogs += count * action.cogsEur;
    remaining -= count * action.creditCost;
  }
  return cogs;
}

export type OneShotPnlEstimate = {
  revenueTtcEur: number;
  cogsWorstEur: number;
  stripeEur: number;
  grossBeforeFixedChargesEur: number;
  netPocketEur: number;
  netPctOfRevenue: number;
  credits: number;
};

/** Marge nette poche (~70 % après charges fixes modèle) sur paiement one-shot. */
export function estimateOneShotWorstCasePnl(
  priceTtcCents: number,
  credits: number,
): OneShotPnlEstimate {
  const revenueTtcEur = priceTtcCents / 100;
  const cogsWorstEur = worstCaseCogsEurForCredits(credits);
  const stripeEur = stripeFeeEur(revenueTtcEur);
  const grossBeforeFixedChargesEur = revenueTtcEur - cogsWorstEur - stripeEur;
  const netPocketEur =
    grossBeforeFixedChargesEur * PRICING_ECONOMICS.netTakeHomeRate;
  return {
    revenueTtcEur,
    cogsWorstEur,
    stripeEur,
    grossBeforeFixedChargesEur,
    netPocketEur,
    netPctOfRevenue:
      revenueTtcEur > 0 ? netPocketEur / revenueTtcEur : 0,
    credits,
  };
}
