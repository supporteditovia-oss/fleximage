const usersIdHandler = require("./_lib/handlers/admin-users-id");
const usersActivityHandler = require("./_lib/handlers/admin-users-activity");
const creditsHandler = require("./admin/credits");
const settingsHandler = require("./admin/settings");
const funnelHandler = require("./_lib/handlers/admin-funnel");
const commandCenterHandler = require("./_lib/handlers/admin-command-center");

function pathParts(req) {
  const fromQuery = req.query && req.query.__adminPath;
  if (typeof fromQuery === "string" && fromQuery.length > 0) {
    return fromQuery.split("/").filter(Boolean);
  }
  if (Array.isArray(fromQuery) && fromQuery.length > 0) {
    return fromQuery.join("/").split("/").filter(Boolean);
  }

  const headerPath =
    req.headers["x-matched-path"] ||
    req.headers["x-invoke-path"] ||
    req.headers["x-forwarded-uri"];
  const rawUrl = String(headerPath || req.url || "");
  const cleaned = rawUrl.split("?")[0];
  const match = cleaned.match(/\/api\/admin\/?(.*)$/i);
  if (!match) return [];
  return match[1].split("/").filter(Boolean);
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const parts = pathParts(req);

  // GET /api/admin/users/:id/activity
  if (
    parts[0] === "users" &&
    parts[1] &&
    parts[2] === "activity" &&
    !parts[3]
  ) {
    req.query = { ...(req.query || {}), id: decodeURIComponent(parts[1]) };
    return usersActivityHandler(req, res);
  }

  // DELETE|PATCH /api/admin/users/:id
  if (parts[0] === "users" && parts[1] && !parts[2]) {
    req.query = { ...(req.query || {}), id: decodeURIComponent(parts[1]) };
    return usersIdHandler(req, res);
  }

  // POST /api/admin/credits
  if (parts[0] === "credits" && !parts[1]) {
    return creditsHandler(req, res);
  }

  // GET|PATCH /api/admin/settings
  if (parts[0] === "settings" && !parts[1]) {
    return settingsHandler(req, res);
  }

  // GET /api/admin/funnel
  if (parts[0] === "funnel" && !parts[1]) {
    return funnelHandler(req, res);
  }

  // GET /api/admin/command-center
  if (parts[0] === "command-center" && !parts[1]) {
    return commandCenterHandler(req, res);
  }

  res.status(404).json({
    message: "Route admin introuvable",
    path: parts,
  });
};
