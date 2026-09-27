const { applyCreditDelta } = require("../generation");

async function deductCarVideoCredits(supabase, { userId, generationId, creditCost, metadata }) {
  if (creditCost <= 0) return null;
  const { error } = await applyCreditDelta(supabase, {
    userId,
    delta: -creditCost,
    reason: "generation_charge",
    generationId: null,
    idempotencyKey: `car_video:${generationId}:charge`,
    metadata: {
      car_video_generation_id: generationId,
      ...(metadata || {}),
    },
  });
  return error;
}

async function refundCarVideoCreditsIfCharged(supabase, { userId, generationId, reason }) {
  const { data: charges, error: chargeFetchErr } = await supabase
    .from("credit_ledger")
    .select("delta")
    .eq("idempotency_key", `car_video:${generationId}:charge`);

  if (chargeFetchErr) return chargeFetchErr;

  const refundAmount = (charges || []).reduce((total, entry) => {
    const delta = Number(entry.delta);
    return delta < 0 ? total + Math.abs(delta) : total;
  }, 0);

  if (refundAmount === 0) return null;

  const { error } = await applyCreditDelta(supabase, {
    userId,
    delta: refundAmount,
    reason: "refund",
    generationId: null,
    idempotencyKey: `car_video:${generationId}:refund`,
    metadata: {
      source: reason || "failed",
      car_video_generation_id: generationId,
    },
  });

  if (!error) {
    await supabase
      .from("car_video_generations")
      .update({ credits_charged: 0, updated_at: new Date().toISOString() })
      .eq("id", generationId);
  }
  return error;
}

module.exports = {
  deductCarVideoCredits,
  refundCarVideoCreditsIfCharged,
};
