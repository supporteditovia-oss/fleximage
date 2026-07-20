const { requireUser, sendError } = require("../user-auth");

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

    const { data, error } = await supabase
      .from("generations")
      .delete()
      .eq("id", larpId)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      res.status(404).json({ message: "Génération introuvable" });
      return;
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("larp delete error", error);
    sendError(res, error);
  }
};
