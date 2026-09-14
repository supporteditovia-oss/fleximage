const { requireUser, readBody, sendError } = require("../_lib/user-auth");

const PAYWALL_TTL_MS = 15 * 60 * 1000;

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
    const { supabase, userId } = await requireUser(req);
    const body = readBody(req);

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_subscriber, role")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.is_subscriber || profile?.role === "admin") {
      res.status(204).end();
      return;
    }

    let expiresAt = null;
    if (typeof body.expires_at === "string") {
      const parsed = Date.parse(body.expires_at);
      if (Number.isFinite(parsed)) expiresAt = new Date(parsed).toISOString();
    }
    if (!expiresAt && typeof body.expires_at_ms === "number") {
      expiresAt = new Date(body.expires_at_ms).toISOString();
    }
    if (!expiresAt) {
      expiresAt = new Date(Date.now() + PAYWALL_TTL_MS).toISOString();
    }

    const funnelSessionId =
      typeof body.funnel_session_id === "string"
        ? body.funnel_session_id.trim().slice(0, 128)
        : null;

    const now = new Date().toISOString();

    const { error: clearError } = await supabase
      .from("funnel_preview_locks")
      .update({ recovered_at: now, updated_at: now })
      .eq("user_id", userId)
      .is("recovered_at", null);

    if (clearError) throw clearError;

    const { error: insertError } = await supabase
      .from("funnel_preview_locks")
      .insert({
        user_id: userId,
        funnel_session_id: funnelSessionId,
        expires_at: expiresAt,
        updated_at: now,
      });

    if (insertError) throw insertError;

    res.status(204).end();
  } catch (error) {
    console.error("funnel preview-lock error", error);
    sendError(res, error);
  }
};
