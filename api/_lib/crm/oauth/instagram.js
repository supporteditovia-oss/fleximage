const { platformConfig, redirectUri } = require("./config");

function buildAuthorizeUrl(state) {
  const cfg = platformConfig("instagram");
  if (!cfg.configured) {
    throw Object.assign(
      new Error("Meta / Instagram Graph non configuré (CRM_META_*)"),
      { status: 503 },
    );
  }
  const params = new URLSearchParams({
    client_id: cfg.appId,
    redirect_uri: redirectUri("instagram"),
    state,
    scope: cfg.scopes.join(","),
    response_type: "code",
  });
  return `${cfg.authorizeUrl}?${params}`;
}

async function exchangeAndProfile(code) {
  const cfg = platformConfig("instagram");
  const tokenParams = new URLSearchParams({
    client_id: cfg.appId,
    client_secret: cfg.appSecret,
    redirect_uri: redirectUri("instagram"),
    code,
  });
  const tokenRes = await fetch(`${cfg.tokenUrl}?${tokenParams}`);
  const tokenJson = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw Object.assign(
      new Error(tokenJson.error?.message || "Token Meta refusé"),
      { status: 502 },
    );
  }
  let accessToken = tokenJson.access_token;
  const expiresIn = Number(tokenJson.expires_in) || 0;
  let expiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : null;

  const longRes = await fetch(
    `${cfg.graphBase}/oauth/access_token?${new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: cfg.appId,
      client_secret: cfg.appSecret,
      fb_exchange_token: accessToken,
    })}`,
  );
  const longJson = await longRes.json().catch(() => ({}));
  if (longJson.access_token) {
    accessToken = longJson.access_token;
    if (longJson.expires_in) {
      expiresAt = new Date(Date.now() + Number(longJson.expires_in) * 1000).toISOString();
    }
  }

  const pagesRes = await fetch(
    `${cfg.graphBase}/me/accounts?fields=instagram_business_account{id,username,name,profile_picture_url},name&access_token=${encodeURIComponent(accessToken)}`,
  );
  const pagesJson = await pagesRes.json().catch(() => ({}));
  const pages = pagesJson.data || [];
  const withIg = pages.find((p) => p.instagram_business_account?.id);
  if (!withIg?.instagram_business_account) {
    throw Object.assign(
      new Error(
        "Aucun compte Instagram Professionnel lié à une Page Facebook. Lie IG à une Page Meta puis réessayez.",
      ),
      { status: 400 },
    );
  }
  const ig = withIg.instagram_business_account;

  return {
    providerAccountId: String(ig.id),
    username: String(ig.username || ig.name || ig.id).replace(/^@/, ""),
    displayName: ig.name || withIg.name || null,
    avatarUrl: ig.profile_picture_url || null,
    followers: 0,
    tokens: {
      accessToken,
      refreshToken: null,
      expiresAt,
      scope: cfg.scopes.join(","),
    },
    rawProfile: { ig, page: withIg.name, pages_count: pages.length },
  };
}

module.exports = { buildAuthorizeUrl, exchangeAndProfile };
