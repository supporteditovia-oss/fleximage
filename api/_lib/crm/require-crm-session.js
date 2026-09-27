const { verifySessionToken, readSessionCookie } = require("../crm-auth");

async function requireCrmSession(req) {
  const token = readSessionCookie(req);
  const session = await verifySessionToken(token);
  if (!session) {
    const err = new Error("Session CRM requise");
    err.status = 401;
    throw err;
  }
  return session;
}

module.exports = { requireCrmSession };
