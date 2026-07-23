const { requireAdmin, sendError } = require("../admin-auth");
const { fetchCommandCenter } = require("../command-center");

const ALLOWED = new Set(["today", "7d", "30d", "all"]);

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
    const range = ALLOWED.has(raw) ? raw : "today";
    const data = await fetchCommandCenter(supabase, range);
    res.status(200).json(data);
  } catch (error) {
    console.error("admin command-center error", error);
    sendError(res, error);
  }
};
