const { requireAdmin, sendError } = require("../admin-auth");
const { fetchFunnelStats } = require("../funnel");

const ALLOWED_RANGES = new Set(["today", "7d", "30d", "all"]);

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
    const { supabase } = await requireAdmin(req);
    const raw = typeof req.query.range === "string" ? req.query.range : "today";
    const range = ALLOWED_RANGES.has(raw) ? raw : "today";
    const stats = await fetchFunnelStats(supabase, range);
    res.status(200).json(stats);
  } catch (error) {
    console.error("admin funnel error", error);
    sendError(res, error);
  }
};
