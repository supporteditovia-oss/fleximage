import i18n from "i18next";
import { billingLocaleParam } from "@shared/billing";
import { authFetch } from "./api";
import { getFunnelSessionId, trackFunnelStep } from "@/lib/funnel-tracker";

export type CheckoutPlan = "discovery" | "essential" | "ultimate";
export type CreditPackId = "mini" | "standard" | "plus";

function checkoutLocalePayload() {
  return { locale: billingLocaleParam(i18n.language) };
}

/**
 * Create a Stripe Checkout session and return the URL to redirect to.
 */
export async function createCheckoutSession(
  plan: CheckoutPlan = "essential",
): Promise<string | null> {
  trackFunnelStep("paywall", { source: "create_checkout", plan });
  trackFunnelStep("checkout", { source: "create_checkout", plan });
  const res = await authFetch("/api/stripe/create-checkout", {
    method: "POST",
    body: JSON.stringify({
      intent: "subscribe",
      plan,
      funnel_session_id: getFunnelSessionId(),
      ...checkoutLocalePayload(),
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Checkout impossible",
    );
  }
  return data.url || null;
}

/** Cancel current plan then checkout a higher subscription. */
export async function createUpgradeCheckoutSession(
  plan: CheckoutPlan,
): Promise<string | null> {
  trackFunnelStep("paywall", { source: "upgrade_checkout", plan });
  trackFunnelStep("checkout", { source: "upgrade_checkout", plan });
  const res = await authFetch("/api/stripe/create-checkout", {
    method: "POST",
    body: JSON.stringify({
      intent: "upgrade",
      plan,
      funnel_session_id: getFunnelSessionId(),
      ...checkoutLocalePayload(),
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Upgrade impossible",
    );
  }
  return data.url || null;
}

/** One-shot credit pack purchase. */
export async function createPackCheckoutSession(
  packId: CreditPackId,
): Promise<string | null> {
  trackFunnelStep("paywall", { source: "pack_checkout", pack: packId });
  trackFunnelStep("checkout", { source: "pack_checkout", pack: packId });
  const res = await authFetch("/api/stripe/create-checkout", {
    method: "POST",
    body: JSON.stringify({
      intent: "pack",
      pack_id: packId,
      funnel_session_id: getFunnelSessionId(),
      ...checkoutLocalePayload(),
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Pack impossible",
    );
  }
  return data.url || null;
}

/**
 * Create a Stripe Customer Portal session and return the URL.
 */
export async function createPortalSession(
  returnPath?: "/generate" | "/settings",
): Promise<string | null> {
  const res = await authFetch("/api/stripe/create-portal", {
    method: "POST",
    body: returnPath ? JSON.stringify({ returnPath }) : undefined,
  });
  const data = await res.json();
  return data.url || null;
}
