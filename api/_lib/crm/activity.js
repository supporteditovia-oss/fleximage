const { getCrmSupabase } = require("./supabase");

async function logCrmActivity(kind, message, meta = {}) {
  try {
    const sb = getCrmSupabase();
    await sb.from("crm_activity_log").insert({ kind, message, meta });
  } catch {
    /* non bloquant */
  }
}

module.exports = { logCrmActivity };
