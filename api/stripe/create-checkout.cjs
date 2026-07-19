const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

const PLAN_CREDITS = {
  discovery: 250,
  essential: 1100,
  ultimate: 2500,
};

const PLAN_ENV_KEYS = {
  discovery: "STRIPE_DISCOVERY_PRICE_ID",
  essential: "STRIPE_ESSENTIAL_PRICE_ID",
  ultimate: "STRIPE_ULTIMATE_PRICE_ID",
};

function normalizePlan(plan) {
  if (plan === "ultimate") return "ultimate";
  if (plan === "essential" || plan === "monthly" || plan === "video") {
    return "essential";
  }
  return "discovery";
}

function resolveAppOrigin(originHeader) {
  const candidates = [
    Array.isArray(originHeader) ? originHeader[0] : originHeader,
    process.env.SITE_URL,
    process.env.APP_URL,
    process.env.VITE_PUBLIC_APP_URL,
    "https://www.luxeflexia.com",
  ];

  for (const candidate of candidates) {
    const raw = candidate && String(candidate).trim().replace(/\/$/, "");
    if (!raw) continue;
    try {
      const origin = new URL(raw.includes("://") ? raw : `https://${raw}`).origin;
      if (origin.includes("localhost") || origin.includes("127.0.0.1")) continue;
      return origin;
    } catch {
      // try next
    }
  }
  return "https://www.luxeflexia.com";
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
        message:
          "Configuration Stripe/Supabase manquante sur Vercel (STRIPE_SECRET_KEY, VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).",
        code: "missing_server_env",
      });
      return;
    }

    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Missing auth token" });
      return;
    }

    const token = authHeader.slice("Bearer ".length).trim();
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      res.status(401).json({ message: "Invalid auth token" });
      return;
    }

    const userId = authData.user.id;
    const body = readBody(req);
    const plan = normalizePlan(body.plan);
    const priceEnvKey = PLAN_ENV_KEYS[plan];
    const priceId = process.env[priceEnvKey];
    if (!priceId) {
      res.status(500).json({
        message: `${priceEnvKey} manquant sur Vercel.`,
        code: "stripe_price_missing",
      });
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, email, is_subscriber")
      .eq("id", userId)
      .single();

    if (profile && profile.is_subscriber) {
      res.status(400).json({ message: "Tu as déjà un abonnement actif." });
      return;
    }

    const creditsPerCycle = PLAN_CREDITS[plan];
    const appOrigin = resolveAppOrigin(req.headers.origin);
    const stripe = new Stripe(secretKey);
    const sessionParams = {
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appOrigin}/resultat?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appOrigin}/generate?checkout=cancel`,
      metadata: {
        user_id: userId,
        price_id: priceId,
        plan_type: plan,
        credits_per_cycle: String(creditsPerCycle),
        billing_interval: "month",
      },
      subscription_data: {
        metadata: {
          user_id: userId,
          price_id: priceId,
          plan_type: plan,
          credits_per_cycle: String(creditsPerCycle),
          billing_interval: "month",
        },
      },
    };

    if (profile && profile.stripe_customer_id) {
      sessionParams.customer = profile.stripe_customer_id;
    } else if (profile && profile.email) {
      sessionParams.customer_email = profile.email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("create-checkout error", error);
    res.status(500).json({
      message: error && error.message ? String(error.message) : "Erreur serveur",
    });
  }
};
