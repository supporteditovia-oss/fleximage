const { createClient } = require("@supabase/supabase-js");

const PLAN_CREDITS = {
  discovery: 250,
  essential: 1100,
  ultimate: 2500,
};

function normalizePlan(plan) {
  if (plan === "ultimate") return "ultimate";
  if (plan === "essential" || plan === "monthly" || plan === "video") {
    return "essential";
  }
  return "discovery";
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      res.status(500).json({
        message: "Configuration Supabase manquante sur Vercel.",
        code: "missing_server_env",
      });
      return;
    }

    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Missing auth token" });
      return;
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: authData, error: authError } = await supabase.auth.getUser(
      authHeader.slice("Bearer ".length).trim(),
    );
    if (authError || !authData.user) {
      res.status(401).json({ message: "Invalid auth token" });
      return;
    }

    const userId = authData.user.id;

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

    let subscription = null;
    if (profile.stripe_subscription_id) {
      const { data } = await supabase
        .from("subscriptions")
        .select(
          "status, plan_type, credits_per_cycle, billing_interval, current_period_end, cancel_at_period_end",
        )
        .eq("user_id", userId)
        .eq("stripe_subscription_id", profile.stripe_subscription_id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      subscription = data;
    }

    const isAdmin = profile.role === "admin";
    const isSubscriber = Boolean(profile.is_subscriber || isAdmin);
    let planType = "free";
    let creditsPerCycle = null;
    let billingInterval = null;
    let subscriptionStatus =
      profile.subscription_status || (profile.is_subscriber ? "active" : "inactive");

    if (isAdmin) {
      planType = "admin";
      subscriptionStatus = "admin";
    } else if (subscription) {
      const normalized = normalizePlan(subscription.plan_type);
      planType = normalized;
      creditsPerCycle =
        subscription.credits_per_cycle ?? PLAN_CREDITS[normalized] ?? null;
      billingInterval = subscription.billing_interval || "month";
      subscriptionStatus = subscription.status || subscriptionStatus;
    } else if (profile.is_subscriber) {
      planType = "unknown";
    }

    res.status(200).json({
      planType,
      credits: profile.credits ?? 0,
      isSubscriber,
      subscriptionStatus,
      creditsPerCycle,
      billingInterval,
      currentPeriodEnd: subscription?.current_period_end ?? null,
      cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
      canManageSubscription: Boolean(profile.stripe_customer_id),
    });
  } catch (err) {
    console.error("current-plan error", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
