const { getProviderEnvStatus } = require("../provider-env-status");

function assertCronAuth(req) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    throw Object.assign(new Error("CRON_SECRET not configured"), { status: 503 });
  }
  const auth = String(req.headers.authorization || "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (token !== secret) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }
}

/** GET — état des clés API vues par le runtime Vercel (sans valeurs). */
module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    assertCronAuth(req);
    const status = await getProviderEnvStatus(null);
    res.status(200).json(status);
  } catch (error) {
    const code = error.status || 500;
    res.status(code).json({
      message: error.message || "cron provider-env error",
    });
  }
};
