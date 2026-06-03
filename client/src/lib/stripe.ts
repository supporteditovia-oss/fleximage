import { authFetch } from "./api";

export type CheckoutPlan = "discovery" | "essential" | "ultimate";

/**
 * Create a Stripe Checkout session and return the URL to redirect to.
 */
export async function createCheckoutSession(
  plan: CheckoutPlan = "essential",
): Promise<string | null> {
  const res = await authFetch("/api/stripe/create-checkout", {
    method: "POST",
    body: JSON.stringify({ plan }),
  });
  const data = await res.json();
  return data.url || null;
}

/**
 * Create a Stripe Customer Portal session and return the URL.
 */
export async function createPortalSession(returnPath?: "/generate" | "/settings"): Promise<string | null> {
  const res = await authFetch("/api/stripe/create-portal", {
    method: "POST",
    body: returnPath ? JSON.stringify({ returnPath }) : undefined,
  });
  const data = await res.json();
  return data.url || null;
}
