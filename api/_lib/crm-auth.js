const bcrypt = require("bcryptjs");

/** jose v5+ est ESM — import dynamique obligatoire sur Vercel (api en CJS). */
let joseModulePromise;
function loadJose() {
  if (!joseModulePromise) {
    joseModulePromise = import("jose");
  }
  return joseModulePromise;
}

const SESSION_COOKIE_NAME = "lux_admin_session";
const SESSION_DURATION = "7d";

function getSessionSecret() {
  const raw = String(process.env.SESSION_SECRET || "").trim();
  if (!raw) {
    throw Object.assign(new Error("SESSION_SECRET manquant"), { status: 503 });
  }
  return new TextEncoder().encode(raw);
}

function getAdminCredentials() {
  const email = String(process.env.ADMIN_EMAIL || "").trim();
  const hash = String(process.env.ADMIN_PASSWORD_HASH || "").trim();
  if (!email || !hash) {
    throw Object.assign(new Error("ADMIN_EMAIL / ADMIN_PASSWORD_HASH requis"), {
      status: 503,
    });
  }
  return { email, hash };
}

async function verifyCredentials(email, password) {
  const { email: adminEmail, hash } = getAdminCredentials();
  if (email.trim().toLowerCase() !== adminEmail.trim().toLowerCase()) {
    return false;
  }
  return bcrypt.compare(password, hash);
}

async function createSessionToken(email) {
  const { SignJWT } = await loadJose();
  return new SignJWT({ email, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSessionSecret());
}

async function verifySessionToken(token) {
  if (!token) return null;
  try {
    const { jwtVerify } = await loadJose();
    const { payload } = await jwtVerify(token, getSessionSecret());
    return payload;
  } catch {
    return null;
  }
}

function sessionCookieOptions() {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

function readSessionCookie(req) {
  const raw = (req.headers && req.headers.cookie) || "";
  const match = raw.match(
    new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function setSessionCookie(res, token) {
  const opts = sessionCookieOptions();
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    `Path=${opts.path}`,
    `Max-Age=${opts.maxAge}`,
    "SameSite=Lax",
  ];
  if (opts.httpOnly) parts.push("HttpOnly");
  if (opts.secure) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
  );
}

module.exports = {
  SESSION_COOKIE_NAME,
  verifyCredentials,
  createSessionToken,
  verifySessionToken,
  readSessionCookie,
  setSessionCookie,
  clearSessionCookie,
};
