const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");
const {
  applyCreditDelta,
  normalizePlan,
  asStripeId,
  reconcilePaidCheckoutSession,
  PLAN_CREDITS,
} = require("../_lib/stripe-billing");

/**
 * Read the request body as raw bytes when possible.
 * Never re-serialize a parsed JSON object — that breaks Stripe signatures.
 */
async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return { raw: req.body, parsed: null };
  if (typeof req.rawBody === "string") {
    return { raw: Buffer.from(req.rawBody), parsed: null };
  }
  if (Buffer.isBuffer(req.rawBody)) return { raw: req.rawBody, parsed: null };
  if (typeof req.body === "string") {
    return { raw: Buffer.from(req.body), parsed: null };
  }

  // Already-parsed object: keep it for events.retrieve fallback only.
  if (req.body && typeof req.body === "object") {
    return { raw: null, parsed: req.body };
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return { raw: Buffer.concat(chunks), parsed: null };
}

async function constructStripeEvent(req, stripe, webhookSecret) {
  const sig = req.headers["stripe-signature"];
  const { raw, parsed } = await readRawBody(req);

  if (raw && sig) {
    try {
      return {
        event: stripe.webhooks.constructEvent(raw, sig, webhookSecret),
        via: "signature",
      };
    } catch (err) {
      console.warn("stripe webhook signature verify failed", {
        message: err && err.message,
      });
    }
  }

  // Fallback when the platform already parsed JSON (signature bytes lost).
  // Trust only Stripe API contents via events.retrieve — not the POST body.
  let eventId = parsed && parsed.id;
  if (!eventId && raw) {
    try {
      const asJson = JSON.parse(raw.toString("utf8"));
      eventId = asJson && asJson.id;
    } catch {
      // ignore
    }
  }

  if (typeof eventId === "string" && eventId.startsWith("evt_")) {
    const event = await stripe.events.retrieve(eventId);
    return { event, via: "events.retrieve" };
  }

  throw new Error(
    "Unable to verify Stripe webhook (raw body missing and no event id)",
  );
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

  await applyCreditDelta(supabase, {
    userId: subscriptionRow.user_id,
    delta: creditsPerCycle,
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
  const userId =
    (subscription.metadata && subscription.metadata.user_id) || null;

  const profileFilter = userId
    ? { column: "id", value: userId }
    : { column: "stripe_subscription_id", value: subscriptionId };

  await supabase
    .from("profiles")
    .update({
      subscription_status: status,
      is_subscriber: isActive,
      // Keep access until period end when cancel is scheduled.
      ...(isActive ? {} : { stripe_subscription_id: null }),
      updated_at: new Date().toISOString(),
    })
    .eq(profileFilter.column, profileFilter.value);

  const periodStart = subscription.current_period_start;
  const periodEnd = subscription.current_period_end;

  await supabase
    .from("subscriptions")
    .update({
      status,
      cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
      canceled_at:
        subscription.canceled_at != null
          ? new Date(subscription.canceled_at * 1000).toISOString()
          : subscription.cancel_at_period_end
            ? new Date().toISOString()
            : null,
      current_period_start: periodStart
        ? new Date(periodStart * 1000).toISOString()
        : null,
      current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);

  console.log("customer.subscription.updated synced", {
    subscriptionId,
    status,
    cancel_at_period_end: subscription.cancel_at_period_end,
    userId,
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
  } else {
    await supabase
      .from("profiles")
      .update({
        is_subscriber: false,
        subscription_status: "canceled",
        stripe_subscription_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscription.id);
  }
  await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      cancel_at_period_end: false,
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
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

    if (!req.headers["stripe-signature"] && !req.body) {
      res.status(400).json({ message: "Missing stripe-signature header" });
      return;
    }

    const stripe = new Stripe(secretKey);
    const { event, via } = await constructStripeEvent(
      req,
      stripe,
      webhookSecret,
    );
    const supabase = createClient(supabaseUrl, serviceRoleKey);

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
    console.error("stripe webhook error", error);
    res.status(400).json({
      message: `Webhook Error: ${error && error.message ? error.message : "unknown"}`,
    });
  }
};

// Critical for Stripe signature verification on Vercel/Node builders.
module.exports.config = {
  api: {
    bodyParser: false,
  },
};
