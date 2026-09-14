const { requireUser, sendError, getSupabaseAdmin } = require("../user-auth");
const { purgeGenerationRow } = require("../purge-generation");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "DELETE") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const { supabase, userId } = await requireUser(req);
    const larpId = req.query.larpId;

    if (!larpId || typeof larpId !== "string") {
      res.status(400).json({ message: "larpId requis" });
      return;
    }

    const { data: row, error: fetchErr } = await supabase
      .from("generations")
      .select("id, user_id, input_assets, output_assets, watermarked_assets")
      .eq("id", larpId)
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!row) {
      res.status(200).json({ success: true });
      return;
    }

    const admin = getSupabaseAdmin();
    await purgeGenerationRow(admin, row);

    // Idempotent: already-deleted ids still count as success for the client UX.
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("larp delete error", error);
    sendError(res, error);
  }
};
