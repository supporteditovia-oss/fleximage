const { requireCrmSession } = require("../require-crm-session");
const { signOAuthState, verifyOAuthState, randomNonce } = require("./state");
const { publicOAuthStatus, maskCredential, platformConfig } = require("./config");
const { upsertOAuthAccount } = require("./persist");
const tiktok = require("./tiktok");
const youtube = require("./youtube");
const instagram = require("./instagram");

const PLATFORMS = new Set(["tiktok", "instagram", "youtube"]);

function accountsReturnPath({ ok, error }) {
  const params = new URLSearchParams();
  if (ok) params.set("connected", "1");
  else {
    params.set("oauth_error", "1");
    const msg = error ? String(error).trim().slice(0, 240) : "";
    if (msg) params.set("oauth_msg", msg);
  }
  return `/admin/accounts?${params}`;
}

function oauthResultHtml({ ok, error, platform }) {
  const payload = JSON.stringify({
    type: "crm-oauth-complete",
    ok,
    error: error || null,
    platform: platform || null,
  });
  const fallback = accountsReturnPath({ ok, error });
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
  window.location.href = ${JSON.stringify(fallback)};
})();
</script>
<p style="font-family:system-ui;padding:24px">${ok ? "Compte connecté — retour au CRM…" : "Erreur de connexion — retour au CRM…"}</p>
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
  if (platform === "tiktok") {
    const cfg = platformConfig("tiktok");
    const keyInfo = maskCredential(cfg.clientKey);
    console.info("[crm-oauth] tiktok start", {
      clientKeyPresent: keyInfo.present,
      clientKeyLength: keyInfo.length,
      clientKeyMasked: keyInfo.masked,
      authorizeUrl: cfg.authorizeUrl,
    });
    url = tiktok.buildAuthorizeUrl(state);
  } else if (platform === "youtube") url = youtube.buildAuthorizeUrl(state);
  else url = instagram.buildAuthorizeUrl(state);
  redirect(res, url);
}

async function handleOAuthCallback(req, res, platform) {
  const p = String(platform || "").toLowerCase();
  if (!PLATFORMS.has(p)) {
    redirect(res, accountsReturnPath({ ok: false, error: "Plateforme inconnue" }));
    return;
  }
  const q = req.query || {};
  const errMsg = q.error_description || q.error;
  if (errMsg) {
    redirect(res, accountsReturnPath({ ok: false, error: String(errMsg) }));
    return;
  }
  const code = q.code;
  const stateRaw = q.state;
  if (!code || !stateRaw) {
    redirect(res, accountsReturnPath({ ok: false, error: "Paramètres OAuth manquants" }));
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

    redirect(res, accountsReturnPath({ ok: true }));
  } catch (err) {
    redirect(
      res,
      accountsReturnPath({
        ok: false,
        error: err.message || "Connexion impossible",
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
