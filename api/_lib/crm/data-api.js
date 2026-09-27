const { requireCrmSession } = require("./require-crm-session");
const { isCrmSchemaMissingError } = require("./schema-errors");
const { emptyDashboardPayload } = require("./empty");
const { fetchDashboard } = require("./dashboard");
const accounts = require("./accounts");
const warmup = require("./warmup");
const media = require("./media");
const music = require("./music");
const posts = require("./posts");
const pov = require("./pov");
const folders = require("./folders");

function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  return {};
}

function queryRecord(req) {
  return req.query || {};
}

async function handleCrmDataApi(req, res, parts) {
  try {
    await requireCrmSession(req);
  } catch (err) {
    res.status(err.status || 401).json({ error: err.message });
    return;
  }

  const method = req.method || "GET";
  const resource = parts[0];
  const id = parts[1];
  const action = parts[2];

  try {
    if (resource === "dashboard" && !id && method === "GET") {
      const data = await fetchDashboard();
      res.status(200).json(data);
      return;
    }

    if (resource === "accounts") {
      if (!id && method === "GET") {
        res.status(200).json({ items: await accounts.listAccounts() });
        return;
      }
      if (!id && method === "POST") {
        res.status(201).json(await accounts.createAccount(parseBody(req)));
        return;
      }
      if (id && !action && method === "GET") {
        const detail = await accounts.getAccount(id);
        if (!detail) {
          res.status(404).json({ error: "Compte introuvable" });
          return;
        }
        res.status(200).json(detail);
        return;
      }
      if (id && !action && method === "PATCH") {
        res.status(200).json(await accounts.updateAccount(id, parseBody(req)));
        return;
      }
      if (id && action === "disconnect" && method === "POST") {
        res.status(200).json(await accounts.disconnectAccount(id));
        return;
      }
      if (id && !action && method === "DELETE") {
        await accounts.deleteAccount(id);
        res.status(200).json({ ok: true });
        return;
      }
    }

    if (resource === "warmup") {
      if (id === "overview" && method === "GET") {
        res.status(200).json({ items: await warmup.listWarmupOverview() });
        return;
      }
      if (id && action === "interact" && method === "POST") {
        res
          .status(200)
          .json(await warmup.recordWarmupInteraction(id, parseBody(req)));
        return;
      }
    }

    if (resource === "folders") {
      if (!id && method === "GET") {
        res.status(200).json({ items: await folders.listFolders() });
        return;
      }
      if (!id && method === "POST") {
        res.status(201).json(await folders.createFolder(parseBody(req)));
        return;
      }
    }

    if (resource === "media") {
      if (id === "upload" && method === "POST") {
        res.status(201).json(await media.uploadMedia(parseBody(req)));
        return;
      }
      if (!id && method === "GET") {
        res.status(200).json({ items: await media.listMedia(queryRecord(req)) });
        return;
      }
      if (!id && method === "POST") {
        res.status(201).json(await media.createMedia(parseBody(req)));
        return;
      }
      if (id && method === "PATCH") {
        res.status(200).json(await media.updateMedia(id, parseBody(req)));
        return;
      }
      if (id === "bulk-delete" && method === "POST") {
        const { ids } = parseBody(req);
        await media.deleteMedia(ids || []);
        res.status(200).json({ ok: true });
        return;
      }
    }

    if (resource === "music") {
      if (id === "upload" && method === "POST") {
        res.status(201).json(await music.uploadMusic(parseBody(req)));
        return;
      }
      if (!id && method === "GET") {
        res.status(200).json({ items: await music.listMusic(queryRecord(req)) });
        return;
      }
      if (!id && method === "POST") {
        res.status(201).json(await music.createMusic(parseBody(req)));
        return;
      }
      if (id && method === "PATCH") {
        res.status(200).json(await music.updateMusic(id, parseBody(req)));
        return;
      }
      if (id && method === "DELETE") {
        await music.deleteMusic(id);
        res.status(200).json({ ok: true });
        return;
      }
    }

    if (resource === "posts") {
      if (!id && method === "GET") {
        const q = queryRecord(req);
        res.status(200).json({
          items: await posts.listPosts({ from: q.from, to: q.to }),
        });
        return;
      }
      if (!id && method === "POST") {
        res.status(201).json(await posts.createPost(parseBody(req)));
        return;
      }
      if (id && method === "PATCH") {
        res.status(200).json(await posts.updatePost(id, parseBody(req)));
        return;
      }
      if (id && method === "DELETE") {
        await posts.deletePost(id);
        res.status(200).json({ ok: true });
        return;
      }
    }

    if (resource === "pov") {
      if (!id && method === "GET") {
        res.status(200).json({ preset: await pov.getLatestPovPreset() });
        return;
      }
      if (!id && method === "PUT") {
        res.status(200).json({ preset: await pov.savePovPreset(parseBody(req)) });
        return;
      }
    }

    res.status(404).json({ error: "Route CRM data introuvable", path: parts });
  } catch (err) {
    if (isCrmSchemaMissingError(err)) {
      if (method === "GET" && resource === "dashboard") {
        res.status(200).json(emptyDashboardPayload());
        return;
      }
      if (method === "GET" && resource === "accounts" && !id) {
        res.status(200).json({ items: [], schemaReady: false });
        return;
      }
      if (method === "GET" && resource === "warmup") {
        res.status(200).json({ items: [], schemaReady: false });
        return;
      }
      if (method === "GET" && (resource === "media" || resource === "music" || resource === "posts")) {
        res.status(200).json({ items: [], schemaReady: false });
        return;
      }
      if (method === "GET" && resource === "pov") {
        res.status(200).json({ preset: null, schemaReady: false });
        return;
      }
      if (method === "GET" && resource === "folders") {
        res.status(200).json({ items: [], schemaReady: false });
        return;
      }
      if (method !== "GET") {
        res.status(503).json({
          error:
            "Base CRM non initialisée — appliquez les migrations Supabase (npm run crm:db:apply).",
          code: "CRM_SCHEMA_MISSING",
        });
        return;
      }
    }
    if (err.code === "CRM_BUCKET_MISSING" || err.code === "CRM_SCHEMA_MISSING") {
      res.status(err.status || 503).json({
        error: err.message,
        code: err.code,
      });
      return;
    }
    const status = err.status || 500;
    const message = err.message || "Erreur CRM";
    if (status >= 500) {
      console.error("[crm-data]", err);
    }
    res.status(status).json({ error: message, code: err.code });
  }
}

module.exports = { handleCrmDataApi };
