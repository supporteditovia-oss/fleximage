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

async function requireAdmin(req) {
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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, email")
    .eq("id", authData.user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    throw Object.assign(new Error("Admin only"), { status: 403 });
  }

  return { supabase, adminUserId: profile.id, adminEmail: profile.email };
}

function sendError(res, error) {
  const status = Number(error && error.status) || 500;
  res.status(status >= 400 && status < 600 ? status : 500).json({
    message: error && error.message ? String(error.message) : "Erreur serveur",
    code: error && error.code ? error.code : undefined,
  });
}

module.exports = {
  getSupabaseAdmin,
  readBody,
  requireAdmin,
  sendError,
};
