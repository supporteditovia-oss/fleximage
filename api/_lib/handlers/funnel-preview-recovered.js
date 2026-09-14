const { requireUser, sendError } = require("../user-auth");

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
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("funnel_preview_locks")
      .update({ recovered_at: now, updated_at: now })
      .eq("user_id", userId)
      .is("recovered_at", null);

    if (error) throw error;

    res.status(204).end();
  } catch (error) {
    console.error("funnel preview-recovered error", error);
    sendError(res, error);
  }
};
