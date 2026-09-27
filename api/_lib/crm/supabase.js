const { createClient } = require("@supabase/supabase-js");

let client;

function getCrmSupabase() {
  if (client) return client;
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw Object.assign(new Error("Supabase CRM non configuré"), { status: 503 });
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

module.exports = { getCrmSupabase };
