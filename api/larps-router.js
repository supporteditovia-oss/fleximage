const generateDirect = require("./_lib/handlers/generate-direct");
const canGenerate = require("./_lib/handlers/can-generate");
const statusHandler = require("./_lib/handlers/status");
const downloadHandler = require("./_lib/handlers/download");
const historyHandler = require("./_lib/handlers/history");
const deleteHandler = require("./_lib/handlers/delete");
const voiceClone = require("./_lib/handlers/voice-clone");
const voiceGenerate = require("./_lib/handlers/voice-generate");
const voiceHistory = require("./_lib/handlers/voice-history");
const voiceDelete = require("./_lib/handlers/voice-delete");
const voiceDownload = require("./_lib/handlers/voice-download");
const templatesHandler = require("./_lib/handlers/templates");

function pathParts(req) {
  const fromQuery = req.query && req.query.__larpsPath;
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
  const match = cleaned.match(/\/api\/larps\/?(.*)$/);
  if (!match) return [];
  return match[1].split("/").filter(Boolean);
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const parts = pathParts(req);

  // Réécrit depuis /api/templates : le plan Hobby plafonne à 12 fonctions
  // serverless, donc on passe par ce routeur plutôt que d'en créer une de plus.
  if (parts[0] === "templates") {
    return templatesHandler(req, res);
  }

  if (parts[0] === "generate-direct") {
    return generateDirect(req, res);
  }

  if (parts[0] === "can-generate") {
    return canGenerate(req, res);
  }

  if (parts[0] === "history") {
    return historyHandler(req, res);
  }

  if (parts[0] === "voice" && parts[1] === "clone") {
    return voiceClone(req, res);
  }

  if (parts[0] === "voice" && parts[1] === "generate") {
    return voiceGenerate(req, res);
  }

  if (parts[0] === "voice" && parts[1] === "history") {
    return voiceHistory(req, res);
  }

  if (parts[0] === "voice" && parts[1] === "delete") {
    return voiceDelete(req, res);
  }

  if (parts[0] === "voice" && parts[1] === "download") {
    return voiceDownload(req, res);
  }

  if (parts.length === 2 && parts[1] === "status") {
    req.query = { ...(req.query || {}), taskId: parts[0] };
    return statusHandler(req, res);
  }

  if (parts.length === 3 && parts[1] === "download") {
    req.query = {
      ...(req.query || {}),
      larpId: parts[0],
      imageIndex: parts[2],
    };
    return downloadHandler(req, res);
  }

  if (parts.length === 3 && parts[0] === "download") {
    req.query = {
      ...(req.query || {}),
      larpId: parts[1],
      imageIndex: parts[2],
    };
    return downloadHandler(req, res);
  }

  if (parts.length === 1 && req.method === "DELETE") {
    req.query = { ...(req.query || {}), larpId: parts[0] };
    return deleteHandler(req, res);
  }

  res.status(404).json({
    message: "Route larps introuvable",
    path: parts,
  });
};

module.exports.config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
  maxDuration: 120,
};
