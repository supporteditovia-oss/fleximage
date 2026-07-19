import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getPlanCredits,
  getPlanPriceId,
  getStripe,
  getSupabaseAdmin,
  normalizePlan,
  readJsonBody,
  requireUserId,
  resolveAppOrigin,
  type CheckoutPlan,
} from "./_shared";

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
    const body = readJsonBody<{ plan?: string }>(req.body);
    const plan = normalizePlan(body.plan);
    const priceId = getPlanPriceId(plan);
    const creditsPerCycle = getPlanCredits(plan);
    const stripe = getStripe();
    const supabase = getSupabaseAdmin();

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, email, is_subscriber")
      .eq("id", userId)
      .single();

    if (profile?.is_subscriber) {
      res.status(400).json({ message: "Tu as déjà un abonnement actif." });
      return;
    }

    const appOrigin = resolveAppOrigin(req.headers.origin);
    const sessionParams: Record<string, unknown> = {
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appOrigin}/resultat?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appOrigin}/generate?checkout=cancel`,
      metadata: {
        user_id: userId,
        price_id: priceId,
        plan_type: plan,
        credits_per_cycle: String(creditsPerCycle),
        billing_interval: "month",
      },
      subscription_data: {
        metadata: {
          user_id: userId,
          price_id: priceId,
          plan_type: plan,
          credits_per_cycle: String(creditsPerCycle),
          billing_interval: "month",
        },
      },
    };

    if (profile?.stripe_customer_id) {
      sessionParams.customer = profile.stripe_customer_id;
    } else if (profile?.email) {
      sessionParams.customer_email = profile.email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    res.status(200).json({ url: session.url });
  } catch (error: any) {
    const status = Number(error?.status) || 500;
    const message =
      status === 401
        ? error.message
        : /must be set|resource_missing|No such price/i.test(String(error?.message || ""))
          ? "Price ID Stripe introuvable pour ce plan. Vérifie STRIPE_*_PRICE_ID et que la clé API est du même mode (test/live)."
          : /Invalid API Key/i.test(String(error?.message || ""))
            ? "Clé Stripe invalide. Vérifie STRIPE_SECRET_KEY sur Vercel."
            : "Erreur serveur";

    console.error("create-checkout error", error);
    res.status(status >= 400 && status < 600 ? status : 500).json({ message });
  }
}

export type { CheckoutPlan };
