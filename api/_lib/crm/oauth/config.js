const { COUNTRY_META } = require("./country-meta");
const { readCrmEnv, maskCredential } = require("./env-utils");

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
  if (platform === "tiktok") {
    const exact = String(process.env.CRM_TIKTOK_REDIRECT_URI || "").trim();
    if (exact) return exact;
  }
  return `${appOrigin()}/admin/api/oauth/callback/${platform}`;
}

function platformConfig(platform) {
  if (platform === "tiktok") {
    const keyEnv = readCrmEnv("CRM_TIKTOK_CLIENT_KEY");
    const secretEnv = readCrmEnv("CRM_TIKTOK_CLIENT_SECRET");
    const clientKey = keyEnv.value;
    const clientSecret = secretEnv.value;
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

function tiktokOAuthDiagnostics() {
  const keyEnv = readCrmEnv("CRM_TIKTOK_CLIENT_KEY");
  const secretEnv = readCrmEnv("CRM_TIKTOK_CLIENT_SECRET");
  const cfg = platformConfig("tiktok");
  let authorizePreview = null;
  try {
    const tiktok = require("./tiktok");
    const sampleState = "diag";
    const full = tiktok.buildAuthorizeUrl(sampleState);
    const u = new URL(full);
    const paramKey = u.searchParams.get("client_key") || "";
    authorizePreview = {
      authorizeEndpoint: `${u.origin}${u.pathname}`,
      responseType: u.searchParams.get("response_type"),
      scope: u.searchParams.get("scope"),
      redirectUri: u.searchParams.get("redirect_uri"),
      clientKeyParamPresent: !!paramKey,
      clientKeyParamLength: paramKey.length,
      clientKeyParamMatchesEnv: paramKey === cfg.clientKey,
    };
  } catch (err) {
    authorizePreview = { error: err.message || "Impossible de construire l’URL authorize" };
  }

  const keyMask = maskCredential(keyEnv.value);
  const secretMask = maskCredential(secretEnv.value);

  return {
    envVarNames: {
      clientKey: "CRM_TIKTOK_CLIENT_KEY",
      clientSecret: "CRM_TIKTOK_CLIENT_SECRET",
    },
    clientKey: {
      present: keyMask.present,
      length: keyMask.length,
      masked: keyMask.masked,
      hadEdgeWhitespace: keyEnv.hadEdgeWhitespace,
      hadOuterQuotes: keyEnv.hadOuterQuotes,
      hadNewline: keyEnv.hadNewline,
      hasNonAscii: keyEnv.hasNonAscii,
    },
    clientSecret: {
      present: secretMask.present,
      length: secretMask.length,
      masked: secretMask.masked,
    },
    clientKeyEqualsSecret: !!(
      keyEnv.value &&
      secretEnv.value &&
      keyEnv.value === secretEnv.value
    ),
    likelyKeySecretSwap:
      keyMask.present &&
      secretMask.present &&
      keyMask.length >= 28 &&
      secretMask.length >= 28 &&
      keyMask.length >= secretMask.length - 4,
    configured: cfg.configured,
    authorizePreview,
    hints: [
      "La Client Key est reconnue par TikTok si vous voyez enter_from=dev_<clé> — l’erreur « client_key » après login vient presque toujours du compte TikTok non autorisé pour l’app.",
      "Mode Sandbox (toggle Sandbox) : Sandbox settings → Target users → Add account → connectez-vous avec LE MÊME compte TikTok que dans LuxFlexIA (délai possible ~1 h).",
      "Mode Production (brouillon / staging) : App permissions → Test users → ajoutez le @username du compte.",
      "Login Kit Web : redirect URI identique caractère par caractère (essai avec / final si besoin via CRM_TIKTOK_REDIRECT_URI).",
      "Ne mettez jamais le Client Secret dans CRM_TIKTOK_CLIENT_KEY.",
    ],
  };
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
    tiktokDiagnostics: tiktokOAuthDiagnostics(),
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
  tiktokOAuthDiagnostics,
  localeFromCountry,
  maskCredential,
};
