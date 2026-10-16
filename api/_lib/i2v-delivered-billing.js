const { normalizeI2VDurationSec } = require("../../shared/video-i2v-pricing.cjs");
const { applyCreditDelta, getGenerationChargeTotal } = require("./generation");

/** Tolérance A/V (~1 frame @ 30fps) — pas de remboursement si livré assez proche. */
const DELIVERED_DURATION_TOLERANCE_SEC = 0.12;

/**
 * Durée facturable = max(demandée, audio réel) après post-process.
 */
function resolveI2VDeliverDurationSec(requestedSec, probed) {
  const requested = Math.max(0.5, normalizeI2VDurationSec(requestedSec));
  const videoSec = Number(probed?.videoSec ?? probed?.formatSec);
  const audioSec = Number(probed?.audioSec);
  const v = Number.isFinite(videoSec) && videoSec > 0 ? videoSec : 0;
  const a = Number.isFinite(audioSec) && audioSec > 0 ? audioSec : 0;
  return Math.max(requested, v, a);
}

/**
 * Remboursement si la durée livrée est plus courte que demandée (prorata).
 * @returns {Promise<{ refundAmount: number, fairCost: number, chargeTotal: number }>}
 */
function computeI2VProrataRefund(chargeTotal, requestedSec, deliveredSec) {
  const charged = Math.max(0, Number(chargeTotal) || 0);
  if (charged === 0) {
    return { refundAmount: 0, fairCost: 0, chargeTotal: 0 };
  }
  const requested = Math.max(0.5, normalizeI2VDurationSec(requestedSec));
  const delivered = Math.max(0.1, Number(deliveredSec) || requested);

  if (delivered >= requested - DELIVERED_DURATION_TOLERANCE_SEC) {
    return { refundAmount: 0, fairCost: charged, chargeTotal: charged };
  }

  const fairCost = Math.max(
    1,
    Math.round(charged * (delivered / requested)),
  );
  const refundAmount = Math.max(0, charged - fairCost);
  return { refundAmount, fairCost, chargeTotal: charged };
}

async function applyI2VProrataRefundIfNeeded(supabase, params) {
  const {
    userId,
    generationId,
    chargeTotal,
    requestedSec,
    deliveredSec,
  } = params;
  const { refundAmount, fairCost } = computeI2VProrataRefund(
    chargeTotal,
    requestedSec,
    deliveredSec,
  );
  if (refundAmount <= 0) {
    return { refundedAmount: 0, fairCost, skipped: true };
  }

  const { error } = await applyCreditDelta(supabase, {
    userId,
    delta: refundAmount,
    reason: "refund",
    generationId,
    idempotencyKey: `generation:${generationId}:refund:i2v_prorata:${deliveredSec.toFixed(2)}`,
    metadata: {
      source: "i2v_duration_prorata",
      requested_sec: normalizeI2VDurationSec(requestedSec),
      delivered_sec: deliveredSec,
      fair_cost: fairCost,
      original_charge: chargeTotal,
    },
  });
  if (error) throw error;
  return { refundedAmount: refundAmount, fairCost, skipped: false };
}

async function reconcileI2VVideoDeliveryBilling(supabase, {
  userId,
  generationId,
  requestedSec,
  deliveredSec,
}) {
  const chargeTotal = await getGenerationChargeTotal(supabase, generationId);
  if (chargeTotal === 0) {
    return { refundedAmount: 0, chargeTotal: 0 };
  }
  return applyI2VProrataRefundIfNeeded(supabase, {
    userId,
    generationId,
    chargeTotal,
    requestedSec,
    deliveredSec,
  });
}

module.exports = {
  DELIVERED_DURATION_TOLERANCE_SEC,
  resolveI2VDeliverDurationSec,
  computeI2VProrataRefund,
  applyI2VProrataRefundIfNeeded,
  reconcileI2VVideoDeliveryBilling,
};
