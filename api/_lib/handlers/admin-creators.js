const { requireAdmin, readBody, sendError } = require("../admin-auth");
const {
  createCreatorLink,
  updateCreator,
  assignUserToCreatorByEmail,
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
      if (body?.action === "assign") {
        const done = await assignUserToCreatorByEmail(supabase, {
          email: body.email,
          code: body.code,
        });
        res.status(200).json({ assigned: done });
        return;
      }
      const created = await createCreatorLink(supabase, {
        name: body?.name,
        code: body?.code,
        rateCents: body?.rateCents,
      });
      res.status(201).json({ creator: created });
      return;
    }
    if (req.method === "PATCH") {
      const body = readBody(req);
      const { code: patchCode, ...patch } = body || {};
      const updated = await updateCreator(supabase, patchCode, patch);
      res.status(200).json({ creator: updated });
      return;
    }
    res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error("admin creators error", error);
    sendError(res, error);
  }
};
