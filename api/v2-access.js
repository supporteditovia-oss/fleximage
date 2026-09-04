const { getClientIp } = require("./_lib/client-ip");
const { isIpAllowedForV2 } = require("./_lib/v2-gate");
const { requireUser, sendError } = require("./_lib/user-auth");

/**
 * GET /api/v2-access
 * Returns whether the current session may use LuxeFlexIA V2 (admin only).
 * Works without auth (ip + ipAllowed only); with Bearer token also returns isAdmin + enabled.
 */
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
    const ip = getClientIp(req);
    const ipAllowed = isIpAllowedForV2(ip);

    let isAdmin = false;

    try {
      const { supabase, userId } = await requireUser(req);
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();
      isAdmin = profile?.role === "admin";
    } catch {
      /* optional auth — IP discovery still works */
    }

    res.status(200).json({
      enabled: isAdmin,
      isAdmin,
      ipAllowed,
      ip,
    });
  } catch (error) {
    console.error("v2-access error", error);
    sendError(res, error);
  }
};
