const { platformConfig, redirectUri } = require("./config");

function buildAuthorizeUrl(state) {
  const cfg = platformConfig("youtube");
  if (!cfg.configured) {
    throw Object.assign(new Error("Google / YouTube OAuth non configuré (CRM_GOOGLE_*)"), {
      status: 503,
    });
  }
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: redirectUri("youtube"),
    response_type: "code",
    scope: cfg.scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${cfg.authorizeUrl}?${params}`;
}

async function exchangeAndProfile(code) {
  const cfg = platformConfig("youtube");
  const body = new URLSearchParams({
    code,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    redirect_uri: redirectUri("youtube"),
    grant_type: "authorization_code",
  });
  const tokenRes = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const tokenJson = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok) {
    throw Object.assign(new Error(tokenJson.error_description || "Token Google refusé"), {
      status: 502,
    });
  }
  const accessToken = tokenJson.access_token;
  const refreshToken = tokenJson.refresh_token || null;
  const expiresIn = Number(tokenJson.expires_in) || 0;
  const expiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : null;

  const chRes = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const chJson = await chRes.json().catch(() => ({}));
  const channel = chJson.items?.[0];
  if (!channel?.id) {
    throw Object.assign(
      new Error("Aucune chaîne YouTube trouvée sur ce compte Google"),
      { status: 400 },
    );
  }
  const sn = channel.snippet || {};
  const stats = channel.statistics || {};

  return {
    providerAccountId: String(channel.id),
    username: String(sn.customUrl || sn.title || channel.id).replace(/^@/, ""),
    displayName: sn.title || null,
    avatarUrl: sn.thumbnails?.high?.url || sn.thumbnails?.default?.url || null,
    followers: Number(stats.subscriberCount) || 0,
    tokens: {
      accessToken,
      refreshToken,
      expiresAt,
      scope: cfg.scopes.join(" "),
    },
    rawProfile: { channel, token_type: tokenJson.token_type },
  };
}

module.exports = { buildAuthorizeUrl, exchangeAndProfile };
