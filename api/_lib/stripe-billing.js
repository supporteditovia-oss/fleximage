const PLAN_CREDITS = {
  discovery: 250,
  essential: 1100,
  ultimate: 2500,
};

const PLAN_MRR_CENTS = {
  discovery: 890,
  essential: 1990,
  ultimate: 3990,
};

function normalizePlan(plan) {
  if (plan === "ultimate") return "ultimate";
  if (plan === "essential" || plan === "monthly" || plan === "video") {
    return "essential";
  }
  return "discovery";
}

function asStripeId(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && typeof value.id === "string") return value.id;
  return null;
}

async function applyCreditDelta(supabase, params) {
  if (!params.delta) return;
  const { error } = await supabase.rpc("apply_credit_delta", {
    p_user_id: params.userId,
    p_delta: params.delta,
    p_reason: params.reason || "subscription_grant",
    p_generation_id: null,
    p_subscription_id: params.subscriptionId || null,
    p_idempotency_key: params.idempotencyKey,
    p_metadata: params.metadata || {},
  });
  if (error) throw error;
}

/**
 * Grant monthly subscription credits with 2x rollover cap + 3-month lots.
 */
async function grantSubscriptionCredits(supabase, params) {
  const { data, error } = await supabase.rpc("grant_subscription_credits", {
    p_user_id: params.userId,
    p_monthly_quota: params.monthlyQuota,
    p_subscription_id: params.subscriptionId || null,
    p_idempotency_key: params.idempotencyKey || null,
    p_metadata: params.metadata || {},
    p_cap_multiplier: params.capMultiplier ?? 2,
  });
  if (error) throw error;
  return data;
}

async function clearUserCreditLots(supabase, userId) {
  const { error } = await supabase.rpc("clear_user_credit_lots", {
    p_user_id: userId,
  });
  if (error) throw error;
}

/**
 * Activate subscriber + grant cycle credits for a paid Checkout Session.
 * Safe to call from webhook and verify-session (idempotent via ledger key).
 */
async function reconcilePaidCheckoutSession(supabase, stripe, session, source) {
  if (
    session.payment_status !== "paid" &&
    session.payment_status !== "no_payment_required"
  ) {
    return { ok: false, reason: "unpaid" };
  }
  if (session.mode === "subscription" && session.status !== "complete") {
    return { ok: false, reason: "incomplete" };
  }

  const userId = session.metadata && session.metadata.user_id;
  if (!userId) return { ok: false, reason: "missing_user_id" };

  const customerId = asStripeId(session.customer);
  const subscriptionId = asStripeId(session.subscription);
  if (!customerId || !subscriptionId) {
    return { ok: false, reason: "missing_stripe_ids" };
  }

  let priceId = (session.metadata && session.metadata.price_id) || "";
  const plan = normalizePlan(session.metadata && session.metadata.plan_type);
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["items.data.price"],
    });
    priceId =
      (subscription.items.data[0] &&
        subscription.items.data[0].price &&
        subscription.items.data[0].price.id) ||
      priceId;
  } catch {
    // keep metadata price
  }

  const creditsPerCycle =
    Number(session.metadata && session.metadata.credits_per_cycle) ||
    PLAN_CREDITS[plan];

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: "active",
      is_subscriber: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (profileErr) throw profileErr;

  const { data: subscriptionRow, error: subErr } = await supabase
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        status: "active",
        price_id: priceId || "unknown",
        plan_type: plan,
        credits_per_cycle: creditsPerCycle,
        billing_interval: "month",
        monthly_amount_cents: PLAN_MRR_CENTS[plan] || PLAN_MRR_CENTS.essential,
      },
      { onConflict: "stripe_subscription_id" },
    )
    .select("id")
    .single();
  if (subErr) throw subErr;

  await grantSubscriptionCredits(supabase, {
    userId,
    monthlyQuota: creditsPerCycle,
    subscriptionId: subscriptionRow && subscriptionRow.id,
    idempotencyKey: `stripe:checkout:${session.id}:credits`,
    metadata: {
      source,
      checkout_session_id: session.id,
      stripe_subscription_id: subscriptionId,
      price_id: priceId,
      plan_type: plan,
    },
  });

  // First-party funnel: payment success
  try {
    const { recordFunnelEvent } = require("./funnel");
    const funnelSessionId =
      (session.metadata && session.metadata.funnel_session_id) ||
      `user_${userId}`;
    await recordFunnelEvent(supabase, {
      sessionId: funnelSessionId,
      step: "subscribed",
      userId,
      path: "/stripe/webhook",
      meta: {
        source,
        checkout_session_id: session.id,
        plan_type: plan,
      },
    });
  } catch (funnelErr) {
    console.error("funnel subscribed track failed", funnelErr);
  }

  return {
    ok: true,
    userId,
    plan,
    creditsPerCycle,
    subscriptionId,
  };
}

module.exports = {
  PLAN_CREDITS,
  normalizePlan,
  asStripeId,
  applyCreditDelta,
  grantSubscriptionCredits,
  clearUserCreditLots,
  reconcilePaidCheckoutSession,
};
