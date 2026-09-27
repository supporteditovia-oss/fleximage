const { requireCrmSession } = require("../require-crm-session");
const { signOAuthState, verifyOAuthState, randomNonce } = require("./state");
const { publicOAuthStatus } = require("./config");
const { upsertOAuthAccount } = require("./persist");
const tiktok = require("./tiktok");
const youtube = require("./youtube");
const instagram = require("./instagram");

const PLATFORMS = new Set(["tiktok", "instagram", "youtube"]);

function oauthResultHtml({ ok, error, platform }) {
  const payload = JSON.stringify({
    type: "crm-oauth-complete",
    ok,
    error: error || null,
    platform: platform || null,
  });
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/><title>Luxeflexia CRM</title></head><body>
<script>
(function(){
  var data = ${payload};
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(data, window.location.origin);
      window.close();
      return;
    }
  } catch (e) {}
  window.location.href = '/admin/accounts?' + (data.ok ? 'connected=1' : 'oauth_error=1');
})();
</script>
<p style="font-family:system-ui;padding:24px">${ok ? "Compte connecté — vous pouvez fermer cette fenêtre." : "Erreur de connexion — retour au CRM…"}</p>
</body></html>`;
}

function sendHtml(res, status, html) {
  res.statusCode = status;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(html);
}

function redirect(res, url) {
  res.statusCode = 302;
  res.setHeader("Location", url);
  res.end();
}

async function handleOAuthStart(req, res) {
  const session = await requireCrmSession(req);
  const q = req.query || {};
  const platform = String(q.platform || "").toLowerCase();
  const country = String(q.country || "FR").toUpperCase().slice(0, 2);
  if (!PLATFORMS.has(platform)) {
    res.status(400).json({ error: "Plateforme invalide" });
    return;
  }
  const state = await signOAuthState({
    platform,
    country,
    admin: session.email,
    nonce: randomNonce(),
  });
  let url;
  if (platform === "tiktok") url = tiktok.buildAuthorizeUrl(state);
  else if (platform === "youtube") url = youtube.buildAuthorizeUrl(state);
  else url = instagram.buildAuthorizeUrl(state);
  redirect(res, url);
}

async function handleOAuthCallback(req, res, platform) {
  const p = String(platform || "").toLowerCase();
  if (!PLATFORMS.has(p)) {
    sendHtml(res, 400, oauthResultHtml({ ok: false, error: "Plateforme inconnue", platform: p }));
    return;
  }
  const q = req.query || {};
  const errMsg = q.error_description || q.error;
  if (errMsg) {
    sendHtml(
      res,
      400,
      oauthResultHtml({ ok: false, error: String(errMsg), platform: p }),
    );
    return;
  }
  const code = q.code;
  const stateRaw = q.state;
  if (!code || !stateRaw) {
    sendHtml(
      res,
      400,
      oauthResultHtml({ ok: false, error: "Paramètres OAuth manquants", platform: p }),
    );
    return;
  }
  try {
    const state = await verifyOAuthState(stateRaw);
    if (state.platform !== p) {
      throw new Error("État OAuth incohérent");
    }
    const country = String(state.country || "FR").toUpperCase().slice(0, 2);

    let profile;
    if (p === "tiktok") profile = await tiktok.exchangeAndProfile(String(code));
    else if (p === "youtube") profile = await youtube.exchangeAndProfile(String(code));
    else profile = await instagram.exchangeAndProfile(String(code));

    await upsertOAuthAccount({
      platform: p,
      countryCode: country,
      ...profile,
    });

    sendHtml(res, 200, oauthResultHtml({ ok: true, platform: p }));
  } catch (err) {
    sendHtml(
      res,
      err.status || 500,
      oauthResultHtml({
        ok: false,
        error: err.message || "Connexion impossible",
        platform: p,
      }),
    );
  }
}

async function handleOAuthStatus(req, res) {
  await requireCrmSession(req);
  res.status(200).json(publicOAuthStatus());
}

async function handleCrmOAuth(req, res, parts) {
  const segment = parts[0];
  try {
    if (segment === "status" && req.method === "GET") {
      await handleOAuthStatus(req, res);
      return;
    }
    if (segment === "start" && req.method === "GET") {
      await handleOAuthStart(req, res);
      return;
    }
    if (segment === "callback" && parts[1] && req.method === "GET") {
      await handleOAuthCallback(req, res, parts[1]);
      return;
    }
    res.status(404).json({ error: "Route OAuth introuvable" });
  } catch (err) {
    const status = err.status || 500;
    if (segment === "callback") {
      sendHtml(
        res,
        status,
        oauthResultHtml({ ok: false, error: err.message || "Erreur OAuth" }),
      );
      return;
    }
    res.status(status).json({ error: err.message || "Erreur OAuth" });
  }
}

module.exports = { handleCrmOAuth };
