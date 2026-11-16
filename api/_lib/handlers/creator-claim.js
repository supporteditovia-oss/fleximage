const { requireUser, readBody, sendError } = require("../user-auth");
const { claimCreatorReferral } = require("../creator-links");

/** POST /api/funnel/creator-claim { code } — rattache l'utilisateur connecté à un créateur (1er contact). */
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
    const result = await claimCreatorReferral(supabase, userId, body?.code);
    res.status(200).json({ ok: result.ok, reason: result.reason || null });
  } catch (error) {
    console.error("creator-claim error", error);
    sendError(res, error);
  }
};
