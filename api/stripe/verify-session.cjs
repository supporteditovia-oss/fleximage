const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

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

function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
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

async function reconcileCheckoutSession(supabase, session) {
  const userId = session.metadata && session.metadata.user_id;
  if (!userId) return;

  const customerId = session.customer;
  const subscriptionId = session.subscription;
  if (!customerId || !subscriptionId) return;

  const plan = normalizePlan(session.metadata && session.metadata.plan_type);
  const creditsPerCycle =
    Number(session.metadata && session.metadata.credits_per_cycle) ||
    PLAN_CREDITS[plan];
  const priceId = (session.metadata && session.metadata.price_id) || "";

  await supabase
    .from("profiles")
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: "active",
      is_subscriber: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  const { data: subscriptionRow } = await supabase
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

  await applyCreditDelta(supabase, {
    userId,
    delta: creditsPerCycle,
    subscriptionId: subscriptionRow && subscriptionRow.id,
    idempotencyKey: `stripe:checkout:${session.id}:credits`,
    metadata: {
      source: "verify-session",
      checkout_session_id: session.id,
    },
  });
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!secretKey || !supabaseUrl || !serviceRoleKey) {
      res.status(500).json({
        message: "Configuration Stripe/Supabase manquante sur Vercel.",
        code: "missing_server_env",
      });
      return;
    }

    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Missing auth token" });
      return;
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: authData, error: authError } = await supabase.auth.getUser(
      authHeader.slice("Bearer ".length).trim(),
    );
    if (authError || !authData.user) {
      res.status(401).json({ message: "Invalid auth token" });
      return;
    }

    const body = readBody(req);
    const sessionId = body.session_id;
    if (sessionId) {
      const stripe = new Stripe(secretKey);
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (!session.metadata || session.metadata.user_id !== authData.user.id) {
        res.status(403).json({ message: "Invalid checkout session" });
        return;
      }
      if (
        session.mode === "subscription" &&
        session.status === "complete" &&
        session.payment_status === "paid"
      ) {
        await reconcileCheckoutSession(supabase, session);
      }
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_subscriber, subscription_status, credits")
      .eq("id", authData.user.id)
      .single();

    res.status(200).json({
      status: (profile && profile.subscription_status) || "pending_webhook",
      active: !!(profile && profile.is_subscriber),
      credits: (profile && profile.credits) || 0,
    });
  } catch (error) {
    console.error("verify-session error", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
