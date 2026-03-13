import { authFetch } from "./api";

/**
 * Create a Stripe Checkout session and return the URL to redirect to.
 */
export async function createCheckoutSession(): Promise<string | null> {
  const res = await authFetch("/api/stripe/create-checkout", {
    method: "POST",
  });
  const data = await res.json();
  return data.url || null;
}

/**
 * Create a Stripe Customer Portal session and return the URL.
 */
export async function createPortalSession(): Promise<string | null> {
  const res = await authFetch("/api/stripe/create-portal", {
    method: "POST",
  });
  const data = await res.json();
  return data.url || null;
}
