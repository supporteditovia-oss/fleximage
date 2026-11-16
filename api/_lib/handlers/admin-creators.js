const { requireAdmin, readBody, sendError } = require("../admin-auth");
const {
  createCreatorLink,
  setCreatorActive,
  fetchCreatorStats,
} = require("../creator-links");

/** GET (stats) | POST (créer un lien) | PATCH (activer/désactiver) — admin uniquement. */
module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  try {
    const { supabase } = await requireAdmin(req);

    if (req.method === "GET") {
      const creators = await fetchCreatorStats(supabase);
      res.status(200).json({ creators });
      return;
    }
    if (req.method === "POST") {
      const body = readBody(req);
      const created = await createCreatorLink(supabase, {
        name: body?.name,
        code: body?.code,
      });
      res.status(201).json({ creator: created });
      return;
    }
    if (req.method === "PATCH") {
      const body = readBody(req);
      const updated = await setCreatorActive(supabase, body?.code, body?.active);
      res.status(200).json({ creator: updated });
      return;
    }
    res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error("admin creators error", error);
    sendError(res, error);
  }
};
