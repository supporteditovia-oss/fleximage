import type Stripe from "stripe";
import { getSupabaseAdmin } from "./supabase-admin";
import { logger } from "./logger";
import { notifyDiscord } from "./discord";
import { captureServerEvent } from "./posthog";
import { getPlanForPriceId, getStripePlanConfig, type BillingInterval, type StripePlanType } from "./stripe";

function parsePlanMetadata(metadata: Stripe.Metadata | null | undefined, priceId: string) {
  const fallback = getPlanForPriceId(priceId);
  const planType = metadata?.plan_type === "video" ? "video" : fallback.planType;
  const credits = Number(metadata?.credits_per_cycle);
  const billingInterval = metadata?.billing_interval === "month" ? "month" : fallback.billingInterval;

  return {
    ...getStripePlanConfig(planType),
    priceId: priceId || fallback.priceId,
    creditsPerCycle: Number.isFinite(credits) && credits > 0 ? credits : fallback.creditsPerCycle,
    billingInterval: billingInterval as BillingInterval,
    planType: planType as StripePlanType,
  };
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
  const priceId = session.metadata?.price_id || "";
  const planConfig = parsePlanMetadata(session.metadata, priceId);

  if (!customerId || !subscriptionId) {
    logger.warn(
      { sessionId: session.id },
      "Missing customer or subscription on checkout session",
    );
    return;
  }

  const supabase = getSupabaseAdmin();

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

  // Add initial credits
  const { error: creditErr } = await supabase.rpc("add_credits", {
    p_user_id: userId,
    p_amount: planConfig.creditsPerCycle,
  });

  if (creditErr) {
    logger.error(
      { err: creditErr, userId },
      "Failed to add initial credits",
    );
  }

  // Create subscription record
  const { error: subErr } = await supabase.from("subscriptions").upsert(
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
  );

  if (subErr) {
    logger.error(
      { err: subErr, userId },
      "Failed to create subscription record",
    );
  }

  logger.info({ userId, subscriptionId }, "Subscription activated via checkout");

  await captureServerEvent(userId, "subscription_created_server", {
    stripe_session_id: session.id,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    price_id: planConfig.priceId,
    plan_type: planConfig.planType,
    credits_per_cycle: planConfig.creditsPerCycle,
    billing_interval: planConfig.billingInterval,
    source: "stripe_webhook",
  });

  // Discord notification
  const { data: notifProfile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();
  notifyDiscord(
    `💰 **Nouvel abonné !** ${notifProfile?.email || userId} vient de souscrire à TurboPrank.`,
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
    .select("user_id, price_id, credits_per_cycle")
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
  const creditsPerCycle = subscriptionRow.credits_per_cycle || planConfig.creditsPerCycle;

  // Add renewal credits
  const { error } = await supabase.rpc("add_credits", {
    p_user_id: subscriptionRow.user_id,
    p_amount: creditsPerCycle,
  });

  if (error) {
    logger.error(
      { err: error, userId: subscriptionRow.user_id },
      "Failed to add renewal credits",
    );
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

  // Update profile — remove subscriber status and reset credits to 0
  const { error: profileErr } = await supabase
    .from("profiles")
    .update({
      is_subscriber: false,
      subscription_status: "canceled",
      credits: 0,
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
    .select("subscription_status, id")
    .eq("stripe_subscription_id", subscriptionId)
    .single();

  const { data: prevSubscription } = await supabase
    .from("subscriptions")
    .select("plan_type, credits_per_cycle")
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

  const priceId = subscription.items.data[0]?.price?.id || "";
  const planConfig = getPlanForPriceId(priceId);

  const planChanged = !!prevSubscription?.plan_type && prevSubscription.plan_type !== planConfig.planType;

  if (isActive && prevProfile?.id && planChanged) {
    const { error: creditErr } = await supabase
      .from("profiles")
      .update({
        credits: planConfig.creditsPerCycle,
        updated_at: new Date().toISOString(),
      })
      .eq("id", prevProfile.id);

    if (creditErr) {
      logger.error(
        { err: creditErr, userId: prevProfile.id, subscriptionId },
        "Failed to replace credits after plan change",
      );
    } else {
      logger.info(
        {
          userId: prevProfile.id,
          subscriptionId,
          previousPlan: prevSubscription.plan_type,
          newPlan: planConfig.planType,
          credits: planConfig.creditsPerCycle,
        },
        "Credits replaced after plan change",
      );
    }
  } else if (isActive && wasInactive && prevProfile?.id) {
    const { error: creditErr } = await supabase.rpc("add_credits", {
      p_user_id: prevProfile.id,
      p_amount: planConfig.creditsPerCycle,
    });

    if (creditErr) {
      logger.error(
        { err: creditErr, userId: prevProfile.id },
        "Failed to add reactivation credits",
      );
    } else {
      logger.info(
        { userId: prevProfile.id, subscriptionId },
        "Reactivation credits added",
      );
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
