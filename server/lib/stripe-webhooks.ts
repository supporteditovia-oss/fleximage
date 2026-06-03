import type Stripe from "stripe";
import { getSupabaseAdmin } from "./supabase-admin";
import { logger } from "./logger";
import { notifyDiscord } from "./discord";
import {
  getPlanForPriceId,
  getStripe,
  getStripePlanConfig,
  normalizeStripePlanType,
  type BillingInterval,
  type StripePlanConfig,
  type StripePlanType,
} from "./stripe";

function parsePlanMetadata(metadata: Stripe.Metadata | null | undefined, priceId: string) {
  const fallback = getPlanForPriceId(priceId);
  const planType = normalizeStripePlanType(metadata?.plan_type || fallback.planType);
  const billingInterval =
    metadata?.billing_interval === "month" || metadata?.billing_interval === "week"
      ? metadata.billing_interval
      : fallback.billingInterval;

  return {
    ...getStripePlanConfig(planType),
    priceId: priceId || fallback.priceId,
    creditsPerCycle: getStripePlanConfig(planType).creditsPerCycle,
    billingInterval: billingInterval as BillingInterval,
    planType: planType as StripePlanType,
  };
}

function applyAuthoritativeBillingInterval(
  planConfig: StripePlanConfig,
  priceId: string,
  billingInterval: BillingInterval | undefined,
): StripePlanConfig {
  return {
    ...planConfig,
    priceId: priceId || planConfig.priceId,
    billingInterval: billingInterval ?? planConfig.billingInterval,
  };
}

async function applyCreditDelta(params: {
  userId: string;
  delta: number;
  reason:
    | "subscription_grant"
    | "generation_charge"
    | "admin_adjustment"
    | "refund"
    | "system_adjustment";
  subscriptionId?: string | null;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (params.delta === 0) return;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.rpc("apply_credit_delta", {
    p_user_id: params.userId,
    p_delta: params.delta,
    p_reason: params.reason,
    p_generation_id: null,
    p_subscription_id: params.subscriptionId ?? null,
    p_idempotency_key: params.idempotencyKey,
    p_metadata: params.metadata ?? {},
  });

  if (error) throw error;
}

/**
 * checkout.session.completed
 * First-time subscription: link Stripe customer, set subscriber, add credits.
 */
export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId = session.metadata?.user_id;
  if (!userId) {
    logger.warn(
      { sessionId: session.id },
      "checkout.session.completed without user_id metadata",
    );
    return;
  }

  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  let priceId = session.metadata?.price_id || "";
  let billingIntervalFromStripe: BillingInterval | undefined;

  if (!customerId || !subscriptionId) {
    logger.warn(
      { sessionId: session.id },
      "Missing customer or subscription on checkout session",
    );
    return;
  }

  try {
    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["items.data.price"],
    });
    const price = subscription.items.data[0]?.price;
    priceId = price?.id || priceId;
    billingIntervalFromStripe =
      price?.recurring?.interval === "month" || price?.recurring?.interval === "week"
        ? price.recurring.interval
        : undefined;
  } catch (err) {
    logger.warn(
      { err, sessionId: session.id, subscriptionId },
      "Could not retrieve Stripe subscription price, falling back to checkout metadata",
    );
  }

  const planConfig = applyAuthoritativeBillingInterval(
    parsePlanMetadata(session.metadata, priceId),
    priceId,
    billingIntervalFromStripe,
  );

  const supabase = getSupabaseAdmin();

  const { data: existingSubscription } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  // Update profile with Stripe IDs and subscriber status
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

  if (profileErr) {
    logger.error(
      { err: profileErr, userId },
      "Failed to update profile after checkout",
    );
    throw profileErr;
  }

  // Create subscription record
  const { data: subscriptionRow, error: subErr } = await supabase
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        status: "active",
        price_id: planConfig.priceId,
        plan_type: planConfig.planType,
        credits_per_cycle: planConfig.creditsPerCycle,
        billing_interval: planConfig.billingInterval,
      },
      { onConflict: "stripe_subscription_id" },
    )
    .select("id")
    .single();

  if (subErr) {
    logger.error(
      { err: subErr, userId },
      "Failed to create subscription record",
    );
    throw subErr;
  }

  try {
    await applyCreditDelta({
      userId,
      delta: planConfig.creditsPerCycle,
      reason: "subscription_grant",
      subscriptionId: subscriptionRow?.id ?? null,
      idempotencyKey: `stripe:checkout:${session.id}:credits`,
      metadata: {
        source: "checkout.session.completed",
        checkout_session_id: session.id,
        stripe_subscription_id: subscriptionId,
        price_id: planConfig.priceId,
        plan_type: planConfig.planType,
      },
    });
  } catch (creditErr) {
    logger.error(
      { err: creditErr, userId },
      "Failed to add initial credits",
    );
    throw creditErr;
  }

  logger.info(
    { userId, subscriptionId, alreadyKnown: Boolean(existingSubscription) },
    "Subscription activated via checkout",
  );

  // Discord notification
  const { data: notifProfile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();
  notifyDiscord(
    `💰 **Nouvel abonné !** ${notifProfile?.email || userId} vient de souscrire à LarpKing.`,
  );
}

/**
 * invoice.paid
 * Renewal: add credits. Skip the first invoice (already handled by checkout).
 */
export async function handleInvoicePaid(
  invoice: Stripe.Invoice,
): Promise<void> {
  // Extract subscription ID - handle both string and object forms across Stripe versions
  const rawSub = (invoice as any).subscription;
  const subscriptionId =
    typeof rawSub === "string"
      ? rawSub
      : typeof rawSub === "object" && rawSub?.id
        ? rawSub.id
        : (invoice as any).parent?.subscription_details?.subscription;
  if (!subscriptionId) return;

  if (invoice.billing_reason !== "subscription_cycle") {
    logger.info(
      { subscriptionId, billingReason: invoice.billing_reason },
      "Skipping non-renewal invoice",
    );
    return;
  }

  const supabase = getSupabaseAdmin();

  // Find subscription by Stripe subscription ID
  const { data: subscriptionRow } = await supabase
    .from("subscriptions")
    .select("id, user_id, price_id, plan_type")
    .eq("stripe_subscription_id", subscriptionId)
    .single();

  if (!subscriptionRow) {
    logger.warn(
      { subscriptionId },
      "No subscription row found on invoice.paid",
    );
    return;
  }

  const planConfig = getPlanForPriceId(subscriptionRow.price_id || "");
  const creditsPerCycle = planConfig.creditsPerCycle;

  try {
    await applyCreditDelta({
      userId: subscriptionRow.user_id,
      delta: creditsPerCycle,
      reason: "subscription_grant",
      subscriptionId: subscriptionRow.id,
      idempotencyKey: `stripe:invoice:${invoice.id}:credits`,
      metadata: {
        source: "invoice.paid",
        stripe_invoice_id: invoice.id,
        stripe_subscription_id: subscriptionId,
        billing_reason: invoice.billing_reason,
        price_id: subscriptionRow.price_id,
      },
    });
  } catch (error) {
    logger.error(
      { err: error, userId: subscriptionRow.user_id },
      "Failed to add renewal credits",
    );
    throw error;
  }

  // Update subscription record period
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
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);

  logger.info(
    { userId: subscriptionRow.user_id, subscriptionId, creditsPerCycle },
    "Renewal credits added",
  );
}

/**
 * customer.subscription.deleted
 * Cancellation: remove subscriber status.
 */
export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const subscriptionId = subscription.id;

  const { data: previousProfile } = await supabase
    .from("profiles")
    .select("id, credits")
    .eq("stripe_subscription_id", subscriptionId)
    .single();

  // Update profile status; remaining credits are cleared through the ledger below.
  const { error: profileErr } = await supabase
    .from("profiles")
    .update({
      is_subscriber: false,
      subscription_status: "canceled",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);

  if (profileErr) {
    logger.error(
      { err: profileErr, subscriptionId },
      "Failed to update profile on cancellation",
    );
  }

  // Update subscription record
  const { error: subErr } = await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);

  if (subErr) {
    logger.error(
      { err: subErr, subscriptionId },
      "Failed to update subscription record on deletion",
    );
  }

  if (previousProfile?.id && previousProfile.credits > 0) {
    try {
      await applyCreditDelta({
        userId: previousProfile.id,
        delta: -previousProfile.credits,
        reason: "system_adjustment",
        idempotencyKey: `stripe:subscription:${subscriptionId}:deleted:clear_credits`,
        metadata: {
          source: "customer.subscription.deleted",
          stripe_subscription_id: subscriptionId,
        },
      });
    } catch (creditErr) {
      logger.error(
        { err: creditErr, userId: previousProfile.id, subscriptionId },
        "Failed to clear credits on cancellation",
      );
      throw creditErr;
    }
  }

  logger.info({ subscriptionId }, "Subscription canceled");
}

/**
 * customer.subscription.updated
 * Handle status transitions (past_due, active, etc.)
 */
export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const subscriptionId = subscription.id;
  const status = subscription.status;

  // Map Stripe status to is_subscriber flag
  const isActive = status === "active" || status === "trialing";

  // Check previous status to detect reactivation
  const { data: prevProfile } = await supabase
    .from("profiles")
    .select("subscription_status, id, credits")
    .eq("stripe_subscription_id", subscriptionId)
    .single();

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

  if (profileErr) {
    logger.error(
      { err: profileErr, subscriptionId, status },
      "Failed to update profile on subscription.updated",
    );
  }

  const price = subscription.items.data[0]?.price;
  const priceId = price?.id || "";
  const inferredBillingInterval =
    price?.recurring?.interval === "month" || price?.recurring?.interval === "week"
      ? price.recurring.interval
      : undefined;
  const planConfig = applyAuthoritativeBillingInterval(
    getPlanForPriceId(priceId),
    priceId,
    inferredBillingInterval as BillingInterval | undefined,
  );

  const previousPlanType = prevSubscription?.plan_type
    ? normalizeStripePlanType(prevSubscription.plan_type)
    : null;
  const planChanged = !!previousPlanType && previousPlanType !== planConfig.planType;

  if (isActive && prevProfile?.id && planChanged) {
    const delta = planConfig.creditsPerCycle - (prevProfile.credits || 0);
    try {
      await applyCreditDelta({
        userId: prevProfile.id,
        delta,
        reason: "subscription_grant",
        subscriptionId: prevSubscription?.id ?? null,
        idempotencyKey: `stripe:subscription:${subscriptionId}:plan:${planConfig.priceId}:credits`,
        metadata: {
          source: "customer.subscription.updated",
          stripe_subscription_id: subscriptionId,
          previous_plan: previousPlanType,
          new_plan: planConfig.planType,
          price_id: planConfig.priceId,
        },
      });
      logger.info(
        {
          userId: prevProfile.id,
          subscriptionId,
          previousPlan: previousPlanType,
          newPlan: planConfig.planType,
          credits: planConfig.creditsPerCycle,
        },
        "Credits reconciled after plan change",
      );
    } catch (creditErr) {
      logger.error(
        { err: creditErr, userId: prevProfile.id, subscriptionId },
        "Failed to reconcile credits after plan change",
      );
      throw creditErr;
    }
  } else if (isActive && wasInactive && prevProfile?.id) {
    try {
      await applyCreditDelta({
        userId: prevProfile.id,
        delta: planConfig.creditsPerCycle,
        reason: "subscription_grant",
        subscriptionId: prevSubscription?.id ?? null,
        idempotencyKey: `stripe:subscription:${subscriptionId}:reactivation:${planConfig.priceId}:credits`,
        metadata: {
          source: "customer.subscription.updated",
          stripe_subscription_id: subscriptionId,
          transition: "reactivation",
          price_id: planConfig.priceId,
        },
      });
      logger.info(
        { userId: prevProfile.id, subscriptionId },
        "Reactivation credits added",
      );
    } catch (creditErr) {
      logger.error(
        { err: creditErr, userId: prevProfile.id },
        "Failed to add reactivation credits",
      );
      throw creditErr;
    }
  }

  // Update subscription record
  // In Stripe v20+, current_period fields are on items, use any cast for compat
  const sub = subscription as any;
  const periodStart = sub.current_period_start;
  const periodEnd = sub.current_period_end;

  await supabase
    .from("subscriptions")
    .update({
      status,
      price_id: planConfig.priceId,
      plan_type: planConfig.planType,
      credits_per_cycle: planConfig.creditsPerCycle,
      billing_interval: planConfig.billingInterval,
      cancel_at_period_end: subscription.cancel_at_period_end,
      ...(isActive && wasInactive && { canceled_at: null }),
      ...(periodStart && {
        current_period_start: new Date(periodStart * 1000).toISOString(),
      }),
      ...(periodEnd && {
        current_period_end: new Date(periodEnd * 1000).toISOString(),
      }),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);

  logger.info({ subscriptionId, status, isActive }, "Subscription updated");
}
