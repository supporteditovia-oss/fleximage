const Stripe = require("stripe");
const { buffer } = require("micro");
const { createClient } = require("@supabase/supabase-js");
const {
  applyCreditDelta,
  grantSubscriptionCredits,
  clearUserCreditLots,
  normalizePlan,
  asStripeId,
  reconcilePaidCheckoutSession,
  PLAN_CREDITS,
} = require("../_lib/stripe-billing");

/**
 * Read the request body as raw bytes.
 * Never re-serialize a parsed JSON object — that breaks Stripe signatures.
 */
async function readRawBody(req) {
  if (typeof req.rawBody === "string") {
    return Buffer.from(req.rawBody);
  }
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody;
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return Buffer.from(req.body);

  // Vercel / Node with bodyParser:false — read the unread stream.
  try {
    const buf = await buffer(req);
    if (buf && buf.length) return buf;
  } catch {
    // Stream may already be consumed.
  }

  // Last resort: unread async iterator
  if (req.readable && !req.readableEnded) {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    if (chunks.length) return Buffer.concat(chunks);
  }

  return null;
}

async function constructStripeEvent(req, stripe, webhookSecret) {
  const sig = req.headers["stripe-signature"];
  if (!sig) {
    throw new Error("Missing stripe-signature header");
  }

  const raw = await readRawBody(req);
  if (!raw || !raw.length) {
    throw new Error(
      "Raw body required for Stripe signature verification (bodyParser must be false)",
    );
  }

  try {
    const event = await stripe.webhooks.constructEventAsync(
      raw,
      sig,
      webhookSecret,
    );
    return { event, via: "signature" };
  } catch (err) {
    console.warn("stripe webhook signature verify failed", {
      message: err && err.message,
    });
    throw err;
  }
}

async function handleInvoicePaid(supabase, invoice) {
  const subscriptionId =
    asStripeId(invoice.subscription) ||
    asStripeId(
      invoice.parent &&
        invoice.parent.subscription_details &&
        invoice.parent.subscription_details.subscription,
    );
  if (!subscriptionId) return;

  // First invoice is already granted via checkout.session.completed
  if (invoice.billing_reason !== "subscription_cycle") {
    return;
  }

  const { data: subscriptionRow } = await supabase
    .from("subscriptions")
    .select("id, user_id, price_id, plan_type, credits_per_cycle")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  if (!subscriptionRow) {
    console.warn("invoice.paid: no subscription row", subscriptionId);
    return;
  }

  const plan = normalizePlan(subscriptionRow.plan_type);
  const creditsPerCycle =
    Number(subscriptionRow.credits_per_cycle) || PLAN_CREDITS[plan] || 0;
  if (!creditsPerCycle) return;

  await grantSubscriptionCredits(supabase, {
    userId: subscriptionRow.user_id,
    monthlyQuota: creditsPerCycle,
    subscriptionId: subscriptionRow.id,
    idempotencyKey: `stripe:invoice:${invoice.id}:credits`,
    metadata: {
      source: "invoice.paid",
      stripe_invoice_id: invoice.id,
      stripe_subscription_id: subscriptionId,
      billing_reason: invoice.billing_reason,
      plan_type: plan,
    },
  });

  await supabase
    .from("subscriptions")
    .update({
      current_period_start: invoice.period_start
        ? new Date(invoice.period_start * 1000).toISOString()
        : null,
      current_period_end: invoice.period_end
        ? new Date(invoice.period_end * 1000).toISOString()
        : null,
      credits_per_cycle: creditsPerCycle,
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);
}

async function handleSubscriptionUpdated(supabase, subscription) {
  const subscriptionId = subscription.id;
  const status = subscription.status;
  const isActive = status === "active" || status === "trialing";

  const { data: prevProfile } = await supabase
    .from("profiles")
    .select("id, credits, subscription_status")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  const { data: prevSubscription } = await supabase
    .from("subscriptions")
    .select("id, plan_type, credits_per_cycle")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  const wasInactive =
    prevProfile?.subscription_status === "canceled" ||
    prevProfile?.subscription_status === "past_due" ||
    prevProfile?.subscription_status === "unpaid";

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({
      subscription_status: status,
      is_subscriber: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);
  if (profileErr) throw profileErr;

  const price =
    subscription.items &&
    subscription.items.data &&
    subscription.items.data[0] &&
    subscription.items.data[0].price;
  const priceId = (price && price.id) || "";
  const plan = normalizePlan(
    (subscription.metadata && subscription.metadata.plan_type) ||
      (prevSubscription && prevSubscription.plan_type),
  );
  const creditsPerCycle =
    Number(
      subscription.metadata && subscription.metadata.credits_per_cycle,
    ) ||
    PLAN_CREDITS[plan] ||
    (prevSubscription && prevSubscription.credits_per_cycle) ||
    0;

  const previousPlanType = prevSubscription?.plan_type
    ? normalizePlan(prevSubscription.plan_type)
    : null;
  const planChanged = Boolean(previousPlanType && previousPlanType !== plan);

  if (isActive && prevProfile?.id && planChanged && creditsPerCycle) {
    const newCap = creditsPerCycle * 2;
    const excess = (prevProfile.credits || 0) - newCap;
    if (excess > 0) {
      await applyCreditDelta(supabase, {
        userId: prevProfile.id,
        delta: -excess,
        reason: "system_adjustment",
        subscriptionId: prevSubscription?.id || null,
        idempotencyKey: `stripe:subscription:${subscriptionId}:plan:${priceId || plan}:trim_cap`,
        metadata: {
          source: "customer.subscription.updated",
          stripe_subscription_id: subscriptionId,
          previous_plan: previousPlanType,
          new_plan: plan,
          price_id: priceId,
          balance_cap: newCap,
        },
      });
    }
  } else if (
    isActive &&
    wasInactive &&
    prevProfile?.id &&
    creditsPerCycle
  ) {
    await grantSubscriptionCredits(supabase, {
      userId: prevProfile.id,
      monthlyQuota: creditsPerCycle,
      subscriptionId: prevSubscription?.id || null,
      idempotencyKey: `stripe:subscription:${subscriptionId}:reactivation:${priceId || plan}:credits`,
      metadata: {
        source: "customer.subscription.updated",
        stripe_subscription_id: subscriptionId,
        transition: "reactivation",
        price_id: priceId,
      },
    });
  }

  const periodStart = subscription.current_period_start;
  const periodEnd = subscription.current_period_end;

  let canceledAt = undefined;
  if (isActive && wasInactive) {
    canceledAt = null;
  } else if (subscription.canceled_at != null) {
    canceledAt = new Date(subscription.canceled_at * 1000).toISOString();
  } else if (subscription.cancel_at_period_end) {
    canceledAt = new Date().toISOString();
  }

  const { error: subErr } = await supabase
    .from("subscriptions")
    .update({
      status,
      ...(priceId ? { price_id: priceId } : {}),
      plan_type: plan,
      ...(creditsPerCycle ? { credits_per_cycle: creditsPerCycle } : {}),
      cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
      ...(canceledAt !== undefined ? { canceled_at: canceledAt } : {}),
      current_period_start: periodStart
        ? new Date(periodStart * 1000).toISOString()
        : null,
      current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);
  if (subErr) throw subErr;

  console.log("customer.subscription.updated synced", {
    subscriptionId,
    status,
    cancel_at_period_end: subscription.cancel_at_period_end,
    planChanged,
    wasInactive,
  });
}

async function handleSubscriptionDeleted(supabase, subscription) {
  const subscriptionId = subscription.id;

  const { data: previousProfile } = await supabase
    .from("profiles")
    .select("id, credits")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  const metaUserId =
    subscription.metadata && subscription.metadata.user_id
      ? subscription.metadata.user_id
      : null;
  const profileId = previousProfile?.id || metaUserId;

  if (profileId) {
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({
        is_subscriber: false,
        subscription_status: "canceled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId);
    if (profileErr) throw profileErr;
  } else {
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({
        is_subscriber: false,
        subscription_status: "canceled",
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscriptionId);
    if (profileErr) throw profileErr;
  }

  const { error: subErr } = await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      cancel_at_period_end: false,
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);
  if (subErr) throw subErr;

  const credits = previousProfile?.credits || 0;
  if (previousProfile?.id) {
    await clearUserCreditLots(supabase, previousProfile.id);
  }
  if (previousProfile?.id && credits > 0) {
    await applyCreditDelta(supabase, {
      userId: previousProfile.id,
      delta: -credits,
      reason: "system_adjustment",
      idempotencyKey: `stripe:subscription:${subscriptionId}:deleted:clear_credits`,
      metadata: {
        source: "customer.subscription.deleted",
        stripe_subscription_id: subscriptionId,
      },
    });
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secretKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    res.status(500).json({
      message: "Configuration Stripe/Supabase manquante sur Vercel.",
      code: "missing_server_env",
    });
    return;
  }

  if (!req.headers["stripe-signature"]) {
    res.status(400).json({
      message: "Missing stripe-signature header",
      code: "stripe_signature_invalid",
    });
    return;
  }

  const stripe = new Stripe(secretKey);

  let event;
  let via;
  try {
    ({ event, via } = await constructStripeEvent(req, stripe, webhookSecret));
  } catch (error) {
    console.error("stripe webhook signature/construct error", error);
    res.status(400).json({
      message: `Webhook Error: ${error && error.message ? error.message : "invalid signature"}`,
      code: "stripe_signature_invalid",
    });
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    console.log("stripe webhook event", {
      type: event.type,
      id: event.id,
      via,
    });

    switch (event.type) {
      case "checkout.session.completed": {
        const result = await reconcilePaidCheckoutSession(
          supabase,
          stripe,
          event.data.object,
          "checkout.session.completed",
        );
        console.log("checkout.session.completed result", result);
        break;
      }
      case "invoice.paid":
        await handleInvoicePaid(supabase, event.data.object);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(supabase, event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(supabase, event.data.object);
        break;
      default:
        break;
    }

    res.status(200).json({ received: true, via });
  } catch (error) {
    // 5xx so Stripe retries — never swallow grant/cancel failures as 400.
    console.error("stripe webhook processing error", error);
    res.status(500).json({
      message: `Webhook Error: ${error && error.message ? error.message : "unknown"}`,
      code: "stripe_webhook_processing_failed",
    });
  }
};

// Critical for Stripe signature verification on Vercel/Node builders.
module.exports.config = {
  api: {
    bodyParser: false,
  },
};
