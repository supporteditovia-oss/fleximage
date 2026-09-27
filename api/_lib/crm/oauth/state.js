const crypto = require("crypto");

let josePromise;
function loadJose() {
  if (!josePromise) josePromise = import("jose");
  return josePromise;
}

function stateSecret() {
  const raw = String(process.env.SESSION_SECRET || "").trim();
  if (!raw) throw Object.assign(new Error("SESSION_SECRET manquant"), { status: 503 });
  return new TextEncoder().encode(raw);
}

async function signOAuthState(payload) {
  const { SignJWT } = await loadJose();
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(stateSecret());
}

async function verifyOAuthState(token) {
  const { jwtVerify } = await loadJose();
  const { payload } = await jwtVerify(token, stateSecret());
  return payload;
}

function randomNonce() {
  return crypto.randomBytes(16).toString("hex");
}

module.exports = { signOAuthState, verifyOAuthState, randomNonce };
