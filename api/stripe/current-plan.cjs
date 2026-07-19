const { createClient } = require("@supabase/supabase-js");

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

    const { data: profile, error } = await supabase
      .from("profiles")
      .select(
        "id, role, credits, is_subscriber, subscription_status, stripe_customer_id, stripe_subscription_id",
      )
      .eq("id", authData.user.id)
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
  } catch (error) {
    console.error("current-plan error", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
