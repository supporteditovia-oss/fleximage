const { requireAdmin, readBody, sendError } = require("../_lib/admin-auth");

async function getAppSettings(supabase) {
  const { data, error } = await supabase.from("app_settings").select("key, value");
  if (error) throw error;

  const map = new Map((data || []).map((row) => [row.key, row.value]));
  return {
    forceKieAi: map.get("force_kie_ai") === "true",
    fallbackTimeoutMs: Number(map.get("fallback_timeout_ms")) || 105_000,
  };
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  try {
    const { supabase } = await requireAdmin(req);

    if (req.method === "GET") {
      const settings = await getAppSettings(supabase);
      res.status(200).json(settings);
      return;
    }

    if (req.method === "PATCH") {
      const body = readBody(req);
      const now = new Date().toISOString();

      if (typeof body.forceKieAi === "boolean") {
        const { error } = await supabase.from("app_settings").upsert(
          {
            key: "force_kie_ai",
            value: String(body.forceKieAi),
            updated_at: now,
          },
          { onConflict: "key" },
        );
        if (error) throw error;
      }

      if (body.fallbackTimeoutMs !== undefined) {
        const timeout = Number(body.fallbackTimeoutMs);
        if (!Number.isInteger(timeout) || timeout < 30000 || timeout > 600000) {
          res.status(400).json({
            message: "fallbackTimeoutMs doit être entre 30000 et 600000",
          });
          return;
        }
        const { error } = await supabase.from("app_settings").upsert(
          {
            key: "fallback_timeout_ms",
            value: String(timeout),
            updated_at: now,
          },
          { onConflict: "key" },
        );
        if (error) throw error;
      }

      const settings = await getAppSettings(supabase);
      res.status(200).json(settings);
      return;
    }

    res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error("admin settings error", error);
    sendError(res, error);
  }
};
