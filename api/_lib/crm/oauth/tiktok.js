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
  const accessToken = tokenJson.access_token;
  const refreshToken = tokenJson.refresh_token || null;
  const expiresIn = Number(tokenJson.expires_in) || 0;
  const expiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : null;

  const userRes = await fetch(
    `${cfg.userInfoUrl}?fields=open_id,union_id,avatar_url,display_name,username`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  const userJson = await userRes.json().catch(() => ({}));
  const user = userJson.data?.user || userJson.user || {};
  const openId = user.open_id || user.union_id;
  if (!openId) {
    throw Object.assign(new Error("Profil TikTok incomplet (open_id manquant)"), {
      status: 502,
    });
  }

  return {
    providerAccountId: String(openId),
    username: String(user.username || user.display_name || openId).replace(/^@/, ""),
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
