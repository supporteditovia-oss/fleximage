const { COUNTRY_META } = require("./country-meta");

const PRODUCTION_SITE_ORIGIN = "https://www.luxeflexia.com";

function appOrigin() {
  const explicit = String(process.env.CRM_OAUTH_REDIRECT_ORIGIN || "").trim();
  if (explicit) return explicit.replace(/\/$/, "");
  if (String(process.env.VERCEL_ENV || "").trim() === "production") {
    return PRODUCTION_SITE_ORIGIN;
  }
  const vercel = String(process.env.VERCEL_URL || "").trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:5000";
}

function redirectUri(platform) {
  return `${appOrigin()}/admin/api/oauth/callback/${platform}`;
}

function platformConfig(platform) {
  if (platform === "tiktok") {
    const clientKey = String(process.env.CRM_TIKTOK_CLIENT_KEY || "").trim();
    const clientSecret = String(process.env.CRM_TIKTOK_CLIENT_SECRET || "").trim();
    return {
      configured: !!(clientKey && clientSecret),
      clientKey,
      clientSecret,
      authorizeUrl: "https://www.tiktok.com/v2/auth/authorize/",
      tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
      userInfoUrl: "https://open.tiktokapis.com/v2/user/info/",
      scopes: ["user.info.basic"],
    };
  }
  if (platform === "youtube") {
    const clientId = String(
      process.env.CRM_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "",
    ).trim();
    const clientSecret = String(
      process.env.CRM_GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "",
    ).trim();
    return {
      configured: !!(clientId && clientSecret),
      clientId,
      clientSecret,
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scopes: [
        "https://www.googleapis.com/auth/youtube.readonly",
        "https://www.googleapis.com/auth/userinfo.profile",
      ],
    };
  }
  if (platform === "instagram") {
    const appId = String(
      process.env.CRM_META_APP_ID || process.env.META_APP_ID || "",
    ).trim();
    const appSecret = String(
      process.env.CRM_META_APP_SECRET || process.env.META_APP_SECRET || "",
    ).trim();
    return {
      configured: !!(appId && appSecret),
      appId,
      appSecret,
      authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
      tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
      graphBase: "https://graph.facebook.com/v21.0",
      scopes: [
        "instagram_basic",
        "instagram_manage_insights",
        "pages_show_list",
        "pages_read_engagement",
        "business_management",
      ],
    };
  }
  return { configured: false };
}

function publicOAuthStatus() {
  return {
    redirectOrigin: appOrigin(),
    redirectUris: {
      tiktok: redirectUri("tiktok"),
      instagram: redirectUri("instagram"),
      youtube: redirectUri("youtube"),
    },
    platforms: {
      tiktok: platformConfig("tiktok").configured,
      instagram: platformConfig("instagram").configured,
      youtube: platformConfig("youtube").configured,
    },
  };
}

function localeFromCountry(countryCode) {
  const meta = COUNTRY_META[countryCode] || COUNTRY_META.FR;
  return meta;
}

module.exports = {
  appOrigin,
  redirectUri,
  platformConfig,
  publicOAuthStatus,
  localeFromCountry,
};
