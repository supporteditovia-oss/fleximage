/**
 * Coûts crédits par action — grille « zéro perte » (pire cas API + Stripe + URSSAF).
 * Source de vérité backend ; miroir de shared/credit-costs.ts côté client.
 */
const IMAGE_CREDIT_COST = 10;
const VOICE_CREDIT_COST = 10;
const VOICE_CLONE_CREDIT_COST = 10;
const VIDEO_FLAT_CREDIT_COST = 60;
const VIDEO_VOICE_EXTRA_CREDIT = 5;

/** PPCM image (10) + vidéo (60) + voix/clone (10) = 60 — quotas = multiples entiers. */
const CREDIT_CYCLE_UNIT = 60;

const PLAN_CREDITS = {
  discovery: 240,
  essential: 840,
  ultimate: 1920,
};

const PLAN_MONTHLY_AMOUNTS_CENTS = {
  discovery: 1000,
  essential: 2500,
  ultimate: 4900,
};

const CREDIT_PACK_AMOUNTS = {
  mini: 60,
  standard: 120,
  plus: 240,
};

function planImageAllowance(plan) {
  return PLAN_CREDITS[plan] / IMAGE_CREDIT_COST;
}

function planVideoAllowance(plan) {
  return PLAN_CREDITS[plan] / VIDEO_FLAT_CREDIT_COST;
}

function planVoiceAllowance(plan) {
  return PLAN_CREDITS[plan] / VOICE_CREDIT_COST;
}

function planCloneAllowance(plan) {
  return PLAN_CREDITS[plan] / VOICE_CLONE_CREDIT_COST;
}

module.exports = {
  IMAGE_CREDIT_COST,
  VOICE_CREDIT_COST,
  VOICE_CLONE_CREDIT_COST,
  VIDEO_FLAT_CREDIT_COST,
  VIDEO_VOICE_EXTRA_CREDIT,
  CREDIT_CYCLE_UNIT,
  PLAN_CREDITS,
  PLAN_MONTHLY_AMOUNTS_CENTS,
  CREDIT_PACK_AMOUNTS,
  planImageAllowance,
  planVideoAllowance,
  planVoiceAllowance,
  planCloneAllowance,
};
