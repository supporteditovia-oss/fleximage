import type Stripe from "stripe";

/** Stripe statuses that must block a new Checkout Session. */
export const BLOCKING_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "paused",
]);

/** Abandoned first invoices — cancel so the user can retry Checkout. */
export const RETRYABLE_SUBSCRIPTION_STATUSES = new Set([
  "incomplete",
  "incomplete_expired",
]);

export type CheckoutGuardResult =
  | { ok: true }
  | {
      ok: false;
      code: "already_subscribed";
      message: string;
      subscriptionId: string;
      status: string;
    };

/**
 * Prevent double subscriptions: expire abandoned open Checkout Sessions,
 * cancel stuck incomplete subs, then reject if a real blocking sub remains.
 */
export async function assertCustomerCanStartCheckout(
  stripe: Stripe,
  customerId: string | null | undefined,
): Promise<CheckoutGuardResult> {
  if (!customerId) return { ok: true };

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
        // Session may already be expired/completed — ignore.
      }
    }
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
  });

  for (const sub of subscriptions.data) {
    if (RETRYABLE_SUBSCRIPTION_STATUSES.has(sub.status)) {
      try {
        await stripe.subscriptions.cancel(sub.id);
      } catch {
        // Already canceled / not cancelable — ignore.
      }
    }
  }

  const blocking = subscriptions.data.find((sub) =>
    BLOCKING_SUBSCRIPTION_STATUSES.has(sub.status),
  );

  if (blocking) {
    return {
      ok: false,
      code: "already_subscribed",
      message: "Tu as déjà un abonnement actif.",
      subscriptionId: blocking.id,
      status: blocking.status,
    };
  }

  return { ok: true };
}
