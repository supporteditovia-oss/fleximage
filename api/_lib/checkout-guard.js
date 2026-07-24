/** Stripe statuses that must block a new Checkout Session. */
const BLOCKING_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "paused",
]);

/** Abandoned first invoices — cancel so the user can retry Checkout. */
const RETRYABLE_SUBSCRIPTION_STATUSES = new Set([
  "incomplete",
  "incomplete_expired",
]);

/**
 * Prevent double subscriptions: expire abandoned open Checkout Sessions,
 * cancel stuck incomplete subs, then reject if a real blocking sub remains.
 */
async function assertCustomerCanStartCheckout(stripe, customerId) {
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
      } catch (err) {
        console.warn("checkout expire skipped", {
          sessionId: session.id,
          message: err && err.message,
        });
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
      } catch (err) {
        console.warn("incomplete subscription cancel skipped", {
          subscriptionId: sub.id,
          message: err && err.message,
        });
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

module.exports = {
  BLOCKING_SUBSCRIPTION_STATUSES,
  RETRYABLE_SUBSCRIPTION_STATUSES,
  assertCustomerCanStartCheckout,
};
