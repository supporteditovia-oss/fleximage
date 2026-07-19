import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseAdmin, requireUserId } from "./_shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const userId = await requireUserId(req.headers.authorization);
    const supabase = getSupabaseAdmin();

    const { data: profile, error } = await supabase
      .from("profiles")
      .select(
        "id, role, credits, is_subscriber, subscription_status, stripe_customer_id, stripe_subscription_id",
      )
      .eq("id", userId)
      .single();

    if (error || !profile) {
      res.status(404).json({ message: "Profile not found" });
      return;
    }

    const isAdmin = profile.role === "admin";
    const isSubscriber = Boolean(profile.is_subscriber || isAdmin);

    res.status(200).json({
      planType: isAdmin ? "admin" : isSubscriber ? "discovery" : "free",
      credits: profile.credits ?? 0,
      isSubscriber,
      subscriptionStatus: isAdmin
        ? "admin"
        : profile.subscription_status || (isSubscriber ? "active" : "inactive"),
      creditsPerCycle: null,
      billingInterval: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      canManageSubscription: Boolean(profile.stripe_customer_id),
    });
  } catch (error: any) {
    const status = Number(error?.status) || 500;
    res.status(status >= 400 && status < 600 ? status : 500).json({
      message: status === 401 ? error.message : "Erreur serveur",
    });
  }
}
