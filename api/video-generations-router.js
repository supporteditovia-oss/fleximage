const uploadHandler = require("./_lib/handlers/car-video/upload");
const createHandler = require("./_lib/handlers/car-video/create");
const getHandler = require("./_lib/handlers/car-video/get");

function pathParts(req) {
  const fromQuery = req.query && req.query.__videoGenPath;
  if (typeof fromQuery === "string" && fromQuery.length > 0) {
    return fromQuery.split("/").filter(Boolean);
  }
  const rawUrl = String(req.url || "");
  const cleaned = rawUrl.split("?")[0];
  const match = cleaned.match(/\/api\/video-generations\/?(.*)$/);
  if (!match) return [];
  return match[1].split("/").filter(Boolean);
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const parts = pathParts(req);

  if (parts[0] === "upload") {
    return uploadHandler(req, res);
  }

  if (parts.length === 0) {
    return createHandler(req, res);
  }

  if (parts.length === 1 && parts[0] !== "upload") {
    return getHandler(req, res, parts[0]);
  }

  res.status(404).json({ message: "Not found" });
};
