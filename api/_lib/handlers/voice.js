const { requireUser, readBody, sendError } = require("../user-auth");
const {
  handleClone,
  handleGenerate,
  handleHistory,
  handleDelete,
} = require("../voice");

/** Routes /api/larps/voice/* (clone, generate, history, delete). */
module.exports = async function voiceHandler(req, res, action) {
  try {
    const { supabase, userId } = await requireUser(req);

    if (action === "clone") {
      if (req.method !== "POST") {
        res.status(405).json({ message: "Method not allowed" });
        return;
      }
      res.status(200).json(await handleClone(supabase, userId, readBody(req)));
      return;
    }

    if (action === "generate") {
      if (req.method !== "POST") {
        res.status(405).json({ message: "Method not allowed" });
        return;
      }
      res.status(200).json(await handleGenerate(supabase, userId, readBody(req)));
      return;
    }

    if (action === "history") {
      const limit = (req.query && req.query.limit) || 30;
      res.status(200).json(await handleHistory(supabase, userId, limit));
      return;
    }

    if (action === "delete") {
      const body = req.method === "DELETE" ? req.query || {} : readBody(req);
      res.status(200).json(await handleDelete(supabase, userId, body));
      return;
    }

    res.status(404).json({ message: "Route voix introuvable" });
  } catch (error) {
    console.error("voice handler error", error);
    sendError(res, error);
  }
};
