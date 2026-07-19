import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getStripe,
  getSupabaseAdmin,
  requireUserId,
  resolveAppOrigin,
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
    const stripe = getStripe();
    const supabase = getSupabaseAdmin();

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .single();

    if (!profile?.stripe_customer_id) {
      res.status(400).json({ message: "Aucun abonnement Stripe trouvé." });
      return;
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${resolveAppOrigin(req.headers.origin)}/settings`,
    });

    res.status(200).json({ url: session.url });
  } catch (error: any) {
    const status = Number(error?.status) || 500;
    console.error("create-portal error", error);
    res.status(status >= 400 && status < 600 ? status : 500).json({
      message: status === 401 ? error.message : "Erreur serveur",
    });
  }
}
