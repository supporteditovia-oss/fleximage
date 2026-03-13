import type Stripe from "stripe";
import { getSupabaseAdmin } from "./supabase-admin";
import { logger } from "./logger";
import { notifyDiscord } from "./discord";

const CREDITS_PER_CYCLE = 50;

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
    p_amount: CREDITS_PER_CYCLE,
  });

  if (creditErr) {
    logger.error(
      { err: creditErr, userId },
      "Failed to add initial credits",
    );
  }

  // Create subscription record
  const { error: subErr } = await supabase.from("subscriptions").insert({
    user_id: userId,
    stripe_subscription_id: subscriptionId,
    stripe_customer_id: customerId,
    status: "active",
    price_id: session.metadata?.price_id || "",
  });

  if (subErr) {
    logger.error(
      { err: subErr, userId },
      "Failed to create subscription record",
    );
  }

  logger.info({ userId, subscriptionId }, "Subscription activated via checkout");

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

  // billing_reason === 'subscription_create' means first invoice (already handled)
  if (invoice.billing_reason === "subscription_create") {
    logger.info(
      { subscriptionId },
      "Skipping first invoice (handled by checkout)",
    );
    return;
  }

  const supabase = getSupabaseAdmin();

  // Find user by subscription ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_subscription_id", subscriptionId)
    .single();

  if (!profile) {
    logger.warn(
      { subscriptionId },
      "No profile found for subscription on invoice.paid",
    );
    return;
  }

  // Add renewal credits
  const { error } = await supabase.rpc("add_credits", {
    p_user_id: profile.id,
    p_amount: CREDITS_PER_CYCLE,
  });

  if (error) {
    logger.error(
      { err: error, userId: profile.id },
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
    { userId: profile.id, subscriptionId },
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

  // Reactivation: add credits when going from canceled/inactive to active
  if (isActive && wasInactive && prevProfile?.id) {
    const { error: creditErr } = await supabase.rpc("add_credits", {
      p_user_id: prevProfile.id,
      p_amount: CREDITS_PER_CYCLE,
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
