const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

function resolveAppOrigin(originHeader) {
  const candidates = [
    Array.isArray(originHeader) ? originHeader[0] : originHeader,
    process.env.SITE_URL,
    process.env.APP_URL,
    process.env.VITE_PUBLIC_APP_URL,
    "https://www.luxeflexia.com",
  ];
  for (const candidate of candidates) {
    const raw = candidate && String(candidate).trim().replace(/\/$/, "");
    if (!raw) continue;
    try {
      const origin = new URL(raw.includes("://") ? raw : `https://${raw}`).origin;
      if (origin.includes("localhost") || origin.includes("127.0.0.1")) continue;
      return origin;
    } catch {
      // next
    }
  }
  return "https://www.luxeflexia.com";
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!secretKey || !supabaseUrl || !serviceRoleKey) {
      res.status(500).json({
        message: "Configuration Stripe/Supabase manquante sur Vercel.",
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", authData.user.id)
      .single();

    if (!profile || !profile.stripe_customer_id) {
      res.status(400).json({ message: "Aucun abonnement Stripe trouvé." });
      return;
    }

    const stripe = new Stripe(secretKey);
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${resolveAppOrigin(req.headers.origin)}/settings`,
    });
    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("create-portal error", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
