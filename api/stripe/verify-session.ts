import type { VercelRequest, VercelResponse } from "@vercel/node";
import type Stripe from "stripe";
import {
  getPlanCredits,
  getStripe,
  getSupabaseAdmin,
  normalizePlan,
  readJsonBody,
  requireUserId,
  type CheckoutPlan,
} from "./_shared";

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

async function reconcileCheckoutSession(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  if (!userId) return;

  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  if (!customerId || !subscriptionId) return;

  const plan = normalizePlan(session.metadata?.plan_type);
  const creditsPerCycle =
    Number(session.metadata?.credits_per_cycle) || getPlanCredits(plan as CheckoutPlan);
  const priceId = session.metadata?.price_id || "";
  const supabase = getSupabaseAdmin();

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

  await applyCreditDelta({
    userId,
    delta: creditsPerCycle,
    subscriptionId: subscriptionRow?.id ?? null,
    idempotencyKey: `stripe:checkout:${session.id}:credits`,
    metadata: {
      source: "verify-session",
      checkout_session_id: session.id,
    },
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const userId = await requireUserId(req.headers.authorization);
    const body = readJsonBody<{ session_id?: string }>(req.body);
    const sessionId = body.session_id;

    if (sessionId) {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.metadata?.user_id !== userId) {
        res.status(403).json({ message: "Invalid checkout session" });
        return;
      }

      if (
        session.mode === "subscription" &&
        session.status === "complete" &&
        session.payment_status === "paid"
      ) {
        await reconcileCheckoutSession(session);
      }
    }

    const supabase = getSupabaseAdmin();
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_subscriber, subscription_status, credits")
      .eq("id", userId)
      .single();

    res.status(200).json({
      status: profile?.subscription_status || "pending_webhook",
      active: !!profile?.is_subscriber,
      credits: profile?.credits ?? 0,
    });
  } catch (error: any) {
    const status = Number(error?.status) || 500;
    console.error("verify-session error", error);
    res.status(status >= 400 && status < 600 ? status : 500).json({
      message: status === 401 ? error.message : "Erreur serveur",
    });
  }
}
