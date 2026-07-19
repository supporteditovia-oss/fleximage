const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return Buffer.from(req.body);
  if (req.body && typeof req.body === "object") {
    return Buffer.from(JSON.stringify(req.body));
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

const PLAN_CREDITS = {
  discovery: 250,
  essential: 1100,
  ultimate: 2500,
};

function normalizePlan(plan) {
  if (plan === "ultimate") return "ultimate";
  if (plan === "essential" || plan === "monthly" || plan === "video") {
    return "essential";
  }
  return "discovery";
}

async function applyCreditDelta(supabase, params) {
  if (!params.delta) return;
  const { error } = await supabase.rpc("apply_credit_delta", {
    p_user_id: params.userId,
    p_delta: params.delta,
    p_reason: "subscription_grant",
    p_generation_id: null,
    p_subscription_id: params.subscriptionId || null,
    p_idempotency_key: params.idempotencyKey,
    p_metadata: params.metadata || {},
  });
  if (error) throw error;
}

async function handleCheckoutCompleted(supabase, stripe, session) {
  const userId = session.metadata && session.metadata.user_id;
  if (!userId) return;

  const customerId = session.customer;
  const subscriptionId = session.subscription;
  if (!customerId || !subscriptionId) return;

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
    // keep metadata
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
        price_id: priceId,
        plan_type: plan,
        credits_per_cycle: creditsPerCycle,
        billing_interval: "month",
      },
      { onConflict: "stripe_subscription_id" },
    )
    .select("id")
    .single();
  if (subErr) throw subErr;

  await applyCreditDelta(supabase, {
    userId,
    delta: creditsPerCycle,
    subscriptionId: subscriptionRow && subscriptionRow.id,
    idempotencyKey: `stripe:checkout:${session.id}:credits`,
    metadata: {
      source: "checkout.session.completed",
      checkout_session_id: session.id,
      stripe_subscription_id: subscriptionId,
      price_id: priceId,
      plan_type: plan,
    },
  });
}

async function handleSubscriptionDeleted(supabase, subscription) {
  const userId = subscription.metadata && subscription.metadata.user_id;
  if (userId) {
    await supabase
      .from("profiles")
      .update({
        is_subscriber: false,
        subscription_status: "canceled",
        stripe_subscription_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
  }
  await supabase
    .from("subscriptions")
    .update({ status: "canceled" })
    .eq("stripe_subscription_id", subscription.id);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
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

    const sig = req.headers["stripe-signature"];
    if (!sig) {
      res.status(400).json({ message: "Missing stripe-signature header" });
      return;
    }

    const rawBody = await readRawBody(req);
    const stripe = new Stripe(secretKey);
    const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(supabase, stripe, event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(supabase, event.data.object);
        break;
      default:
        break;
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("stripe webhook error", error);
    res.status(400).json({
      message: `Webhook Error: ${error && error.message ? error.message : "unknown"}`,
    });
  }
};

module.exports.config = {
  api: {
    bodyParser: false,
  },
};
