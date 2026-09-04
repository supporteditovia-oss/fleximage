const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");
const { assertCustomerCanStartCheckout } = require("../_lib/checkout-guard");
const { resolveRequestLocale, copy } = require("../_lib/locale-copy");
const {
  PLAN_CREDITS,
  normalizePlan,
  getPackById,
  getUpgradeOffers,
  resolveBillingCurrency,
  resolvePlanPriceId,
  resolvePackEnvKey,
} = require("../_lib/billing-offers");

const BRAND_DISPLAY_NAME = "LuxeFlexIA";
const CHECKOUT_APP_ORIGIN = "https://www.luxeflexia.com";
const STRIPE_API_VERSION = "2026-02-25.clover";

const PLAN_ENV_KEYS = {
  discovery: "STRIPE_DISCOVERY_PRICE_ID",
  essential: "STRIPE_ESSENTIAL_PRICE_ID",
  ultimate: "STRIPE_ULTIMATE_PRICE_ID",
};

const PLAN_LABELS = {
  discovery: "LuxeFlexIA Discovery",
  essential: "LuxeFlexIA Essential",
  ultimate: "LuxeFlexIA Ultimate",
};

function checkoutCurrency(body) {
  return resolveBillingCurrency({
    locale: body.locale,
    currency: body.currency,
    market: body.market,
  });
}

function checkoutUiLocale(req, body) {
  return resolveRequestLocale(req, body);
}

function withLang(pathAndQuery, locale) {
  const join = pathAndQuery.includes("?") ? "&" : "?";
  return `${CHECKOUT_APP_ORIGIN}${pathAndQuery}${join}lang=${locale}`;
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

function funnelMeta(body) {
  if (
    typeof body.funnel_session_id === "string" &&
    body.funnel_session_id.trim().length >= 8
  ) {
    return { funnel_session_id: body.funnel_session_id.trim().slice(0, 128) };
  }
  return {};
}

/** Cancel active subs so the user can start a higher plan (Discovery → Essential, etc.). */
async function cancelActiveSubscriptionsForUpgrade(stripe, customerId) {
  if (!customerId) return [];
  const canceled = [];
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
  });
  for (const sub of subscriptions.data) {
    if (
      [
        "active",
        "trialing",
        "past_due",
        "unpaid",
        "paused",
        "incomplete",
        "incomplete_expired",
      ].includes(sub.status)
    ) {
      try {
        await stripe.subscriptions.cancel(sub.id);
        canceled.push(sub.id);
      } catch (err) {
        console.warn("upgrade cancel skipped", {
          subscriptionId: sub.id,
          message: err && err.message,
        });
      }
    }
  }

  const openSessions = await stripe.checkout.sessions.list({
    customer: customerId,
    status: "open",
    limit: 20,
  });
  for (const session of openSessions.data) {
    if (session.mode === "subscription") {
      try {
        await stripe.checkout.sessions.expire(session.id);
      } catch {
        /* ignore */
      }
    }
  }
  return canceled;
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
    const { data: authData, error: authError } =
      await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      res.status(401).json({ message: "Invalid auth token" });
      return;
    }

    const userId = authData.user.id;
    const body = readBody(req);
    const intent = String(body.intent || "subscribe").toLowerCase();
    const billingCurrency = checkoutCurrency(body);
    const uiLocale = checkoutUiLocale(req, body);
    const stripe = new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION });

    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "stripe_customer_id, email, is_subscriber, stripe_subscription_id, credits",
      )
      .eq("id", userId)
      .single();

    // ─── Credit pack (one-shot) ───────────────────────────────────────
    // Packs are only for existing subscribers (out-of-credits top-up).
    // First-time visitors must buy a subscription, never a pack.
    if (intent === "pack") {
      if (!profile?.is_subscriber) {
        res.status(400).json({
        message: copy(
          uiLocale,
          "Les packs sont réservés aux abonnés. Choisis un abonnement pour commencer.",
          "Packs are for subscribers. Choose a plan to get started.",
        ),
          code: "packs_subscribers_only",
        });
        return;
      }
      const pack = getPackById(String(body.pack_id || body.pack || ""), billingCurrency);
      if (!pack) {
        res.status(400).json({
          message: copy(uiLocale, "Pack invalide.", "Invalid pack."),
          code: "invalid_pack",
        });
        return;
      }
      const packEnvKey = resolvePackEnvKey(pack, billingCurrency);
      const priceId = process.env[packEnvKey];
      if (!priceId) {
        res.status(500).json({
          message: `${packEnvKey} manquant sur Vercel.`,
          code: "stripe_price_missing",
        });
        return;
      }

      try {
        const price = await stripe.prices.retrieve(priceId);
        const productId =
          typeof price.product === "string" ? price.product : price.product?.id;
        if (productId) {
          await stripe.products.update(productId, {
            name: copy(
              uiLocale,
              `LuxeFlexIA ${pack.label} — ${pack.credits} crédits`,
              `LuxeFlexIA ${pack.label} — ${pack.credits} credits`,
            ),
            metadata: {
              app: "luxeflexia",
              luxeflexia_pack: pack.id,
              credits: String(pack.credits),
            },
          });
        }
      } catch (productErr) {
        console.warn("pack product rename skipped", productErr);
      }

      const sessionParams = {
        mode: "payment",
        locale: uiLocale,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: withLang(
          `/generate?checkout=pack_success&session_id={CHECKOUT_SESSION_ID}`,
          uiLocale,
        ),
        cancel_url: withLang(`/generate?paywall=1&checkout=cancel`, uiLocale),
        branding_settings: { display_name: BRAND_DISPLAY_NAME },
        custom_text: {
          submit: {
            message: copy(
              uiLocale,
              `${pack.label} — ${pack.credits} crédits LuxeFlexIA (paiement unique)`,
              `${pack.label} — ${pack.credits} LuxeFlexIA credits (one-time)`,
            ),
          },
        },
        metadata: {
          user_id: userId,
          purchase_type: "credit_pack",
          pack_id: pack.id,
          credits: String(pack.credits),
          price_id: priceId,
          billing_currency: billingCurrency,
          brand: BRAND_DISPLAY_NAME,
          ...funnelMeta(body),
        },
        payment_intent_data: {
          metadata: {
            user_id: userId,
            purchase_type: "credit_pack",
            pack_id: pack.id,
            credits: String(pack.credits),
          },
        },
      };

      if (profile && profile.stripe_customer_id) {
        sessionParams.customer = profile.stripe_customer_id;
      } else if (profile && profile.email) {
        sessionParams.customer_email = profile.email;
      }

      const session = await stripe.checkout.sessions.create(sessionParams);
      res
        .status(200)
        .json({ url: session.url, intent: "pack", packId: pack.id, currency: billingCurrency });
      return;
    }

    // ─── Subscribe or upgrade ─────────────────────────────────────────
    const plan = normalizePlan(body.plan);
    const isUpgrade = intent === "upgrade";

    if (isUpgrade) {
      let currentPlan = "discovery";
      if (profile?.stripe_subscription_id) {
        const { data: subRow } = await supabase
          .from("subscriptions")
          .select("plan_type")
          .eq("user_id", userId)
          .eq("stripe_subscription_id", profile.stripe_subscription_id)
          .maybeSingle();
        if (subRow?.plan_type) currentPlan = normalizePlan(subRow.plan_type);
      }
      const offers = getUpgradeOffers(
        profile?.is_subscriber ? currentPlan : "discovery",
        billingCurrency,
      );
      if (!offers.some((o) => o.plan === plan)) {
        res.status(400).json({
          message: copy(
            uiLocale,
            "Upgrade non disponible pour ton plan actuel.",
            "Upgrade is not available for your current plan.",
          ),
          code: "upgrade_not_allowed",
        });
        return;
      }
      if (!profile?.stripe_customer_id && !profile?.is_subscriber) {
        res.status(400).json({
          message: copy(
            uiLocale,
            "Aucun abonnement actif à upgrader.",
            "No active subscription to upgrade.",
          ),
          code: "not_subscribed",
        });
        return;
      }
    } else if (profile && profile.is_subscriber) {
      res.status(400).json({
        message: copy(
          uiLocale,
          "Tu as déjà un abonnement actif. Utilise l’upgrade pour changer de formule.",
          "You already have an active subscription. Use upgrade to change plans.",
        ),
        code: "already_subscribed",
      });
      return;
    }

    const priceId = resolvePlanPriceId(plan, billingCurrency);
    if (!priceId) {
      const envKey =
        billingCurrency === "usd"
          ? `${PLAN_ENV_KEYS[plan]}_USD`
          : PLAN_ENV_KEYS[plan];
      res.status(500).json({
        message: `${envKey} manquant sur Vercel.`,
        code: "stripe_price_missing",
      });
      return;
    }

    if (isUpgrade && profile?.stripe_customer_id) {
      const canceledIds = await cancelActiveSubscriptionsForUpgrade(
        stripe,
        profile.stripe_customer_id,
      );
      await supabase
        .from("profiles")
        .update({
          is_subscriber: false,
          subscription_status: "canceled",
          stripe_subscription_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
      console.log("upgrade canceled previous subs", { userId, canceledIds });
    } else if (profile && profile.stripe_customer_id) {
      const guard = await assertCustomerCanStartCheckout(
        stripe,
        profile.stripe_customer_id,
        uiLocale,
      );
      if (!guard.ok) {
        res.status(400).json({
          message:
            guard.code === "already_subscribed"
              ? copy(
                  uiLocale,
                  "Tu as déjà un abonnement actif.",
                  "You already have an active subscription.",
                )
              : guard.message,
          code: guard.code,
        });
        return;
      }
    }

    const creditsPerCycle = PLAN_CREDITS[plan];

    try {
      const price = await stripe.prices.retrieve(priceId);
      const productId =
        typeof price.product === "string" ? price.product : price.product?.id;
      if (productId) {
        await stripe.products.update(productId, {
          name: PLAN_LABELS[plan],
          metadata: { app: "luxeflexia", luxeflexia_plan: plan },
        });
      }
    } catch (productErr) {
      console.warn("checkout product rename skipped", productErr);
    }

    const sessionParams = {
      mode: "subscription",
      locale: uiLocale,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: withLang(
        `/resultat?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        uiLocale,
      ),
      cancel_url: withLang(`/generate?paywall=1&checkout=cancel`, uiLocale),
      branding_settings: { display_name: BRAND_DISPLAY_NAME },
      custom_text: {
        submit: {
          message: isUpgrade
            ? `Upgrade ${BRAND_DISPLAY_NAME} — ${PLAN_LABELS[plan]}`
            : copy(
                uiLocale,
                `Abonnement ${BRAND_DISPLAY_NAME} — paiement sécurisé`,
                `${BRAND_DISPLAY_NAME} subscription — secure payment`,
              ),
        },
      },
      metadata: {
        user_id: userId,
        price_id: priceId,
        plan_type: plan,
        credits_per_cycle: String(creditsPerCycle),
        billing_interval: "month",
        billing_currency: billingCurrency,
        brand: BRAND_DISPLAY_NAME,
        checkout_intent: isUpgrade ? "upgrade" : "subscribe",
        ...funnelMeta(body),
      },
      subscription_data: {
        description: PLAN_LABELS[plan],
        metadata: {
          user_id: userId,
          price_id: priceId,
          plan_type: plan,
          credits_per_cycle: String(creditsPerCycle),
          billing_interval: "month",
          billing_currency: billingCurrency,
          brand: BRAND_DISPLAY_NAME,
          checkout_intent: isUpgrade ? "upgrade" : "subscribe",
          ...funnelMeta(body),
        },
      },
    };

    if (profile && profile.stripe_customer_id) {
      sessionParams.customer = profile.stripe_customer_id;
    } else if (profile && profile.email) {
      sessionParams.customer_email = profile.email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    res.status(200).json({
      url: session.url,
      intent: isUpgrade ? "upgrade" : "subscribe",
      plan,
      currency: billingCurrency,
    });
  } catch (error) {
    console.error("create-checkout error", error);
    res.status(500).json({
      message: error && error.message ? String(error.message) : "Server error",
      code: error && error.code ? error.code : undefined,
    });
  }
};
