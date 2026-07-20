const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");
const { reconcilePaidCheckoutSession } = require("../_lib/stripe-billing");

function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
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

    const body = readBody(req);
    const sessionId = body.session_id;
    let reconcile = null;

    if (sessionId) {
      const stripe = new Stripe(secretKey);
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (!session.metadata || session.metadata.user_id !== authData.user.id) {
        res.status(403).json({ message: "Invalid checkout session" });
        return;
      }
      try {
        reconcile = await reconcilePaidCheckoutSession(
          supabase,
          stripe,
          session,
          "verify-session",
        );
        if (!reconcile.ok) {
          console.warn("verify-session reconcile skipped", {
            sessionId,
            reason: reconcile.reason,
            payment_status: session.payment_status,
            status: session.status,
          });
        }
      } catch (reconcileErr) {
        console.error("verify-session reconcile error", reconcileErr);
        res.status(500).json({
          message: "Activation abonnement échouée",
          code: "reconcile_failed",
        });
        return;
      }
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_subscriber, subscription_status, credits")
      .eq("id", authData.user.id)
      .single();

    res.status(200).json({
      status: (profile && profile.subscription_status) || "pending_webhook",
      active: !!(profile && profile.is_subscriber),
      credits: (profile && profile.credits) || 0,
      reconcile: reconcile
        ? { ok: reconcile.ok, reason: reconcile.reason || null }
        : null,
    });
  } catch (error) {
    console.error("verify-session error", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
