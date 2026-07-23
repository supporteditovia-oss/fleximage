const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");
const { assertCustomerCanStartCheckout } = require("../_lib/checkout-guard");

const BRAND_DISPLAY_NAME = "LuxeFlexIA";
const CHECKOUT_APP_ORIGIN = "https://www.luxeflexia.com";

/** API version that supports Checkout Session branding_settings.display_name */
const STRIPE_API_VERSION = "2026-02-25.clover";

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

const PLAN_LABELS = {
  discovery: "Abonnement LuxeFlexIA Discovery",
  essential: "Abonnement LuxeFlexIA Essential",
  ultimate: "Abonnement LuxeFlexIA Ultimate",
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
    const stripe = new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION });

    if (profile && profile.stripe_customer_id) {
      const guard = await assertCustomerCanStartCheckout(
        stripe,
        profile.stripe_customer_id,
      );
      if (!guard.ok) {
        res.status(400).json({
          message: guard.message,
          code: guard.code,
        });
        return;
      }
    }

    // Keep Product name in Stripe aligned with LuxeFlexIA (best-effort).
    try {
      const price = await stripe.prices.retrieve(priceId);
      const productId =
        typeof price.product === "string" ? price.product : price.product?.id;
      if (productId) {
        await stripe.products.update(productId, {
          name: PLAN_LABELS[plan],
          metadata: {
            app: "luxeflexia",
            luxeflexia_plan: plan,
          },
        });
      }
    } catch (productErr) {
      console.warn("checkout product rename skipped", productErr);
    }

    const sessionParams = {
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${CHECKOUT_APP_ORIGIN}/resultat?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${CHECKOUT_APP_ORIGIN}/generate?checkout=cancel`,
      // Overrides the Checkout header business name (Editovia → LuxeFlexIA).
      // Note: receipts / bank statement / some legal footers can still use
      // Stripe Dashboard → Public details until you change them there.
      branding_settings: {
        display_name: BRAND_DISPLAY_NAME,
      },
      custom_text: {
        submit: {
          message: `Abonnement ${BRAND_DISPLAY_NAME} — paiement sécurisé`,
        },
      },
      metadata: {
        user_id: userId,
        price_id: priceId,
        plan_type: plan,
        credits_per_cycle: String(creditsPerCycle),
        billing_interval: "month",
        brand: BRAND_DISPLAY_NAME,
        ...(typeof body.funnel_session_id === "string" &&
        body.funnel_session_id.trim().length >= 8
          ? { funnel_session_id: body.funnel_session_id.trim().slice(0, 128) }
          : {}),
      },
      subscription_data: {
        description: PLAN_LABELS[plan],
        metadata: {
          user_id: userId,
          price_id: priceId,
          plan_type: plan,
          credits_per_cycle: String(creditsPerCycle),
          billing_interval: "month",
          brand: BRAND_DISPLAY_NAME,
          ...(typeof body.funnel_session_id === "string" &&
          body.funnel_session_id.trim().length >= 8
            ? { funnel_session_id: body.funnel_session_id.trim().slice(0, 128) }
            : {}),
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
      code: error && error.code ? error.code : undefined,
    });
  }
};
