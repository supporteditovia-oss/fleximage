import type { VercelRequest, VercelResponse } from "@vercel/node";
import type Stripe from "stripe";
import {
  getPlanCredits,
  getStripe,
  getSupabaseAdmin,
  normalizePlan,
  type CheckoutPlan,
} from "./_shared";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req: VercelRequest): Promise<Buffer> {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return Buffer.from(req.body);
  if (req.body && typeof req.body === "object") {
    return Buffer.from(JSON.stringify(req.body));
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req as any) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function applyCreditDelta(params: {
  userId: string;
  delta: number;
  subscriptionId?: string | null;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}) {
  if (params.delta === 0) return;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.rpc("apply_credit_delta", {
    p_user_id: params.userId,
    p_delta: params.delta,
    p_reason: "subscription_grant",
    p_generation_id: null,
    p_subscription_id: params.subscriptionId ?? null,
    p_idempotency_key: params.idempotencyKey,
    p_metadata: params.metadata ?? {},
  });
  if (error) throw error;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  if (!userId) return;

  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  if (!customerId || !subscriptionId) return;

  const stripe = getStripe();
  let priceId = session.metadata?.price_id || "";
  let plan = normalizePlan(session.metadata?.plan_type);

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["items.data.price"],
    });
    priceId = subscription.items.data[0]?.price?.id || priceId;
  } catch {
    // keep metadata fallback
  }

  const creditsPerCycle =
    Number(session.metadata?.credits_per_cycle) || getPlanCredits(plan as CheckoutPlan);

  const supabase = getSupabaseAdmin();

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

  await applyCreditDelta({
    userId,
    delta: creditsPerCycle,
    subscriptionId: subscriptionRow?.id ?? null,
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

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id;
  const supabase = getSupabaseAdmin();

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const stripe = getStripe();
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!sig || !webhookSecret) {
      res.status(400).json({ message: "Missing stripe-signature or webhook secret" });
      return;
    }

    const rawBody = await readRawBody(req);
    const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }

    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error("stripe webhook error", error);
    res.status(400).json({ message: `Webhook Error: ${error.message}` });
  }
}
