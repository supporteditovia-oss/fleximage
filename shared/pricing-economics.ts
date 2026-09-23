/**
 * LuxeFlexIA — unit economics & abonnements (coûts API sept. 2026).
 * Kling 3.0 720p : I2V 0,084 $/s · V2V Motion Control 0,126 $/s.
 */

export const PRICING_ECONOMICS = {
  unitCosts: {
    imageNanoBanana2_1K: { cost: 0.02, unit: "per_image" as const },

    videoI2V_5s_720p_noAudio: { cost: 0.39, unit: "per_clip" as const },
    videoI2V_5s_720p_withAudio: { cost: 0.58, unit: "per_clip" as const },
    videoV2V_8s_720p_motion_noAudio: { cost: 1.01, unit: "per_clip" as const },
    videoV2V_8s_720p_motion_withAudio: { cost: 1.23, unit: "per_clip" as const },

    audioTTS_perMinute: { cost: 0.017, unit: "per_minute" as const },
    audioVoiceClone_setup: { cost: 0.5, unit: "per_profile" as const },
  },

  stripe: {
    percent: 0.015,
    fixedEur: 0.25,
  },

  netTakeHomeRate: 0.7,

  creditCosts: {
    image: 10,
    videoI2V: 60,
    videoV2V: 60,
    audioExtra: 5,
    voiceGenerate: 10,
    voiceClone: 10,
  },

  subscriptionPacks: [
    {
      id: "decouverte",
      name: "Découverte",
      priceTtcCents: 890,
      creditsPerMonth: 250,
      quotas: {
        images: 25,
        videoI2V: 0,
        videoV2V: 0,
        audioMinutes: 0,
        voiceClones: 0,
      },
    },
    {
      id: "essentiel",
      name: "Essentiel",
      priceTtcCents: 1990,
      creditsPerMonth: 1100,
      quotas: {
        images: 70,
        videoI2V: 3,
        videoV2V: 0,
        audioMinutes: 5,
        voiceClones: 1,
      },
      recommended: true,
    },
    {
      id: "ultimate",
      name: "Ultimate",
      priceTtcCents: 3990,
      creditsPerMonth: 2500,
      quotas: {
        images: 150,
        videoI2V: 10,
        videoV2V: 5,
        audioMinutes: 15,
        voiceClones: 3,
      },
    },
  ],

  audioTopups: [
    { credits: 100, priceTtcCents: 990 },
    { credits: 500, priceTtcCents: 3990 },
    { credits: 1000, priceTtcCents: 6990 },
  ],
} as const;

export type SubscriptionPackId =
  (typeof PRICING_ECONOMICS.subscriptionPacks)[number]["id"];

export type UsageProfile = {
  images: number;
  videoI2V_noAudio: number;
  videoI2V_withAudio: number;
  videoV2V_noAudio: number;
  videoV2V_withAudio: number;
  audioMinutes: number;
  voiceClones: number;
};

export const USAGE_PROFILES: Record<
  "test" | "createur" | "pro",
  UsageProfile & { packId: SubscriptionPackId }
> = {
  test: {
    packId: "decouverte",
    images: 25,
    videoI2V_noAudio: 0,
    videoI2V_withAudio: 0,
    videoV2V_noAudio: 0,
    videoV2V_withAudio: 0,
    audioMinutes: 0,
    voiceClones: 0,
  },
  createur: {
    packId: "essentiel",
    images: 70,
    videoI2V_noAudio: 3,
    videoI2V_withAudio: 0,
    videoV2V_noAudio: 0,
    videoV2V_withAudio: 0,
    audioMinutes: 5,
    voiceClones: 1,
  },
  pro: {
    packId: "ultimate",
    images: 150,
    videoI2V_noAudio: 10,
    videoI2V_withAudio: 0,
    videoV2V_noAudio: 5,
    videoV2V_withAudio: 0,
    audioMinutes: 15,
    voiceClones: 3,
  },
};

function getPack(packId: SubscriptionPackId) {
  const pack = PRICING_ECONOMICS.subscriptionPacks.find((p) => p.id === packId);
  if (!pack) throw new Error(`Unknown pack: ${packId}`);
  return pack;
}

/** € imputés par crédit pour un abonnement mensuel. */
export function creditEurRate(packId: SubscriptionPackId): number {
  const pack = getPack(packId);
  return pack.priceTtcCents / 100 / pack.creditsPerMonth;
}

export function creditEurRateFromTopup(credits: number, priceTtcCents: number): number {
  return priceTtcCents / 100 / credits;
}

export function stripeFeeEur(revenueTtcEur: number): number {
  const { percent, fixedEur } = PRICING_ECONOMICS.stripe;
  return revenueTtcEur * percent + fixedEur;
}

export function estimateVariableCogsEur(usage: UsageProfile): number {
  const u = PRICING_ECONOMICS.unitCosts;
  return (
    usage.images * u.imageNanoBanana2_1K.cost +
    usage.videoI2V_noAudio * u.videoI2V_5s_720p_noAudio.cost +
    usage.videoI2V_withAudio * u.videoI2V_5s_720p_withAudio.cost +
    usage.videoV2V_noAudio * u.videoV2V_8s_720p_motion_noAudio.cost +
    usage.videoV2V_withAudio * u.videoV2V_8s_720p_motion_withAudio.cost +
    usage.audioMinutes * u.audioTTS_perMinute.cost +
    usage.voiceClones * u.audioVoiceClone_setup.cost
  );
}

export function creditsForUsage(usage: UsageProfile): number {
  const c = PRICING_ECONOMICS.creditCosts;
  return (
    usage.images * c.image +
    usage.videoI2V_noAudio * c.videoI2V +
    usage.videoI2V_withAudio * (c.videoI2V + c.audioExtra) +
    usage.videoV2V_noAudio * c.videoV2V +
    usage.videoV2V_withAudio * (c.videoV2V + c.audioExtra) +
    usage.audioMinutes * c.voiceGenerate +
    usage.voiceClones * c.voiceClone
  );
}

/** Marge brute € par action (revenu crédits − COGS), pour un pack donné. */
export function actionGrossMarginEur(
  packId: SubscriptionPackId,
  action:
    | "image"
    | "videoI2V_noAudio"
    | "videoI2V_withAudio"
    | "videoV2V_noAudio"
    | "videoV2V_withAudio"
    | "audioMinute"
    | "voiceClone",
): { revenueEur: number; cogsEur: number; grossEur: number; grossPct: number } {
  const rate = creditEurRate(packId);
  const c = PRICING_ECONOMICS.creditCosts;
  const u = PRICING_ECONOMICS.unitCosts;

  let credits = 0;
  let cogs = 0;
  switch (action) {
    case "image":
      credits = c.image;
      cogs = u.imageNanoBanana2_1K.cost;
      break;
    case "videoI2V_noAudio":
      credits = c.videoI2V;
      cogs = u.videoI2V_5s_720p_noAudio.cost;
      break;
    case "videoI2V_withAudio":
      credits = c.videoI2V + c.audioExtra;
      cogs = u.videoI2V_5s_720p_withAudio.cost;
      break;
    case "videoV2V_noAudio":
      credits = c.videoV2V;
      cogs = u.videoV2V_8s_720p_motion_noAudio.cost;
      break;
    case "videoV2V_withAudio":
      credits = c.videoV2V + c.audioExtra;
      cogs = u.videoV2V_8s_720p_motion_withAudio.cost;
      break;
    case "audioMinute":
      credits = c.voiceGenerate;
      cogs = u.audioTTS_perMinute.cost;
      break;
    case "voiceClone":
      credits = c.voiceClone;
      cogs = u.audioVoiceClone_setup.cost;
      break;
  }
  const revenue = credits * rate;
  const gross = revenue - cogs;
  return {
    revenueEur: revenue,
    cogsEur: cogs,
    grossEur: gross,
    grossPct: revenue > 0 ? gross / revenue : 0,
  };
}

export function estimatePackMonthPnl(
  packId: SubscriptionPackId,
  usage: UsageProfile,
): {
  revenueTtcEur: number;
  cogsEur: number;
  stripeEur: number;
  grossEur: number;
  netEur: number;
  netPctOfRevenue: number;
  creditsUsed: number;
  creditsIncluded: number;
} {
  const pack = getPack(packId);
  const revenueTtcEur = pack.priceTtcCents / 100;
  const cogsEur = estimateVariableCogsEur(usage);
  const stripeEur = stripeFeeEur(revenueTtcEur);
  const grossEur = revenueTtcEur - cogsEur - stripeEur;
  const netEur = grossEur * PRICING_ECONOMICS.netTakeHomeRate;
  return {
    revenueTtcEur,
    cogsEur,
    stripeEur,
    grossEur,
    netEur,
    netPctOfRevenue: revenueTtcEur > 0 ? netEur / revenueTtcEur : 0,
    creditsUsed: creditsForUsage(usage),
    creditsIncluded: pack.creditsPerMonth,
  };
}

/** Crédits minimum pour couvrir le COGS (hors Stripe) à un €/cr donné. */
export function minCreditsToCoverCogs(cogsEur: number, creditRateEur: number): number {
  if (creditRateEur <= 0) return Infinity;
  return Math.ceil(cogsEur / creditRateEur);
}
