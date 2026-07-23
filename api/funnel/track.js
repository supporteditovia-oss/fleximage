const { createClient } = require("@supabase/supabase-js");
const {
  isValidSessionId,
  isValidStep,
  recordFunnelEvent,
} = require("../_lib/funnel");

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

function getSupabaseAdmin() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw Object.assign(new Error("Configuration Supabase manquante"), {
      status: 500,
    });
  }
  return createClient(supabaseUrl, serviceRoleKey);
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
    const body = readBody(req);
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    const step = typeof body.step === "string" ? body.step : "";
    const path = typeof body.path === "string" ? body.path : null;
    const meta =
      body.meta && typeof body.meta === "object" && !Array.isArray(body.meta)
        ? body.meta
        : {};

    if (!isValidSessionId(sessionId) || !isValidStep(step)) {
      res.status(400).json({ message: "sessionId ou step invalide" });
      return;
    }

    const supabase = getSupabaseAdmin();
    let userId = null;
    const authHeader = req.headers.authorization || "";
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice("Bearer ".length).trim();
      const { data } = await supabase.auth.getUser(token);
      if (data && data.user) userId = data.user.id;
    }

    await recordFunnelEvent(supabase, {
      sessionId,
      step,
      userId,
      path,
      meta,
    });

    res.status(204).end();
  } catch (error) {
    console.error("funnel track error", error);
    res.status(500).json({
      message: error && error.message ? String(error.message) : "Erreur serveur",
    });
  }
};
