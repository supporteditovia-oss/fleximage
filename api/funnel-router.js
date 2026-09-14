const funnelTrack = require("./_lib/handlers/funnel-track");
const funnelPreviewLock = require("./_lib/handlers/funnel-preview-lock");
const funnelPreviewRecovered = require("./_lib/handlers/funnel-preview-recovered");

function pathParts(req) {
  const fromQuery = req.query && req.query.__funnelPath;
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
  const match = cleaned.match(/\/api\/funnel\/?(.*)$/i);
  if (!match) return [];
  return match[1].split("/").filter(Boolean);
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const parts = pathParts(req);
  const route = parts[0] || "track";

  if (route === "track") {
    return funnelTrack(req, res);
  }
  if (route === "preview-lock") {
    return funnelPreviewLock(req, res);
  }
  if (route === "preview-recovered") {
    return funnelPreviewRecovered(req, res);
  }

  res.status(404).json({ message: "Route funnel introuvable", path: parts });
};
