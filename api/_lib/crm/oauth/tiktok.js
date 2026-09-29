const { platformConfig, redirectUri } = require("./config");

function buildAuthorizeUrl(state) {
  const cfg = platformConfig("tiktok");
  if (!cfg.configured) {
    throw Object.assign(new Error("TikTok Login Kit non configuré (CRM_TIKTOK_*)"), {
      status: 503,
    });
  }
  const params = new URLSearchParams({
    client_key: cfg.clientKey,
    scope: cfg.scopes.join(","),
    response_type: "code",
    redirect_uri: redirectUri("tiktok"),
    state,
  });
  return `${cfg.authorizeUrl}?${params}`;
}

async function exchangeAndProfile(code) {
  const cfg = platformConfig("tiktok");
  const body = new URLSearchParams({
    client_key: cfg.clientKey,
    client_secret: cfg.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri("tiktok"),
  });
  const tokenRes = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const tokenJson = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok) {
    throw Object.assign(
      new Error(tokenJson.error_description || tokenJson.message || "Token TikTok refusé"),
      { status: 502 },
    );
  }
  const tokenData = tokenJson.data || tokenJson;
  const accessToken = tokenData.access_token || tokenJson.access_token;
  const refreshToken = tokenData.refresh_token || tokenJson.refresh_token || null;
  const expiresIn = Number(tokenData.expires_in || tokenJson.expires_in) || 0;
  const tokenOpenId = tokenData.open_id || tokenJson.open_id || null;
  const expiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : null;

  if (!accessToken) {
    throw Object.assign(new Error("Réponse token TikTok invalide (access_token manquant)"), {
      status: 502,
    });
  }

  const userRes = await fetch(
    `${cfg.userInfoUrl}?fields=open_id,union_id,avatar_url,display_name`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  const userJson = await userRes.json().catch(() => ({}));
  const apiErr = userJson.error;
  if (apiErr && String(apiErr.code || "").toLowerCase() !== "ok") {
    throw Object.assign(
      new Error(apiErr.message || apiErr.code || "Profil TikTok refusé"),
      { status: 502 },
    );
  }
  const user = userJson.data?.user || userJson.user || {};
  const openId = user.open_id || user.union_id || tokenOpenId;
  if (!openId) {
    throw Object.assign(new Error("Profil TikTok incomplet (open_id manquant)"), {
      status: 502,
    });
  }

  return {
    providerAccountId: String(openId),
    username: String(user.username || user.display_name || openId)
      .replace(/^@/, "")
      .slice(0, 120),
    displayName: user.display_name || user.username || null,
    avatarUrl: user.avatar_url || null,
    followers: 0,
    tokens: {
      accessToken,
      refreshToken,
      expiresAt,
      scope: cfg.scopes.join(","),
    },
    rawProfile: user,
  };
}

module.exports = { buildAuthorizeUrl, exchangeAndProfile };
