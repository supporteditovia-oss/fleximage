const { createClient } = require("@supabase/supabase-js");

function getSupabaseAdmin() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw Object.assign(new Error("Configuration Supabase manquante"), {
      status: 500,
      code: "missing_server_env",
    });
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

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

async function requireUser(req) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    throw Object.assign(new Error("Missing auth token"), { status: 401 });
  }
  const token = authHeader.slice("Bearer ".length).trim();
  const supabase = getSupabaseAdmin();
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) {
    throw Object.assign(new Error("Invalid auth token"), { status: 401 });
  }
  return { supabase, userId: authData.user.id };
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  try {
    const { supabase, userId } = await requireUser(req);

    if (req.method === "PATCH") {
      const body = readBody(req);
      const updates = { updated_at: new Date().toISOString() };
      if (Object.prototype.hasOwnProperty.call(body, "full_name")) {
        const name =
          typeof body.full_name === "string" ? body.full_name.trim() : null;
        updates.full_name = name || null;
      }
      if (typeof body.preferred_locale === "string") {
        updates.preferred_locale = body.preferred_locale;
      }
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId)
        .select()
        .single();
      if (error) throw error;
      res.status(200).json(data);
      return;
    }

    if (req.method === "DELETE") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_subscriber, role")
        .eq("id", userId)
        .maybeSingle();

      if (profile && profile.is_subscriber) {
        res.status(400).json({
          message:
            "Résilie d'abord ton abonnement avant de supprimer ton compte.",
          code: "active_subscription",
        });
        return;
      }

      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      if (authError) throw authError;
      await supabase.from("profiles").delete().eq("id", userId);

      res.status(200).json({ message: "Compte supprimé", deleted: true });
      return;
    }

    res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error("profiles/me error", error);
    const status = Number(error && error.status) || 500;
    res.status(status >= 400 && status < 600 ? status : 500).json({
      message: error && error.message ? String(error.message) : "Erreur serveur",
      code: error && error.code ? error.code : undefined,
    });
  }
};
