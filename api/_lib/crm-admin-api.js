const {
  verifyCredentials,
  createSessionToken,
  verifySessionToken,
  readSessionCookie,
  setSessionCookie,
  clearSessionCookie,
} = require("./crm-auth");
const { handleCrmDataApi } = require("./crm/data-api");

/** Routes CRM : login / logout / session (parts sans préfixe `crm`). */
async function handleCrmAdminApi(req, res, parts) {
  if (parts[0] === "login" && !parts[1] && req.method === "POST") {
    try {
      let body = req.body;
      if (!body || typeof body !== "object") {
        body = {};
      }
      const { email, password } = body;
      if (!email || !password) {
        res.status(400).json({ error: "Email et mot de passe requis" });
        return;
      }
      const ok = await verifyCredentials(String(email), String(password));
      if (!ok) {
        res.status(401).json({ error: "Identifiants invalides" });
        return;
      }
      const token = await createSessionToken(String(email));
      setSessionCookie(res, token);
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(err.status || 500).json({
        error: err.message || "Erreur serveur",
      });
    }
    return;
  }

  if (parts[0] === "logout" && !parts[1] && req.method === "POST") {
    clearSessionCookie(res);
    res.status(200).json({ ok: true });
    return;
  }

  if (parts[0] === "data") {
    await handleCrmDataApi(req, res, parts.slice(1));
    return;
  }

  if (parts[0] === "session" && !parts[1] && req.method === "GET") {
    try {
      const token = readSessionCookie(req);
      const session = await verifySessionToken(token);
      if (!session) {
        res.status(401).json({ authenticated: false });
        return;
      }
      res.status(200).json({ authenticated: true, email: session.email });
    } catch {
      res.status(401).json({ authenticated: false });
    }
    return;
  }

  res.status(404).json({ error: "Not found" });
}

module.exports = { handleCrmAdminApi };
